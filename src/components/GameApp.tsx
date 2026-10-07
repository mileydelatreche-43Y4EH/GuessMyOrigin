"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthGate from "./AuthGate";
import BrandLogo from "./BrandLogo";
import FaceZoom from "./FaceZoom";
import { useLang } from "./LangContext";
import LiveHud from "./LiveHud";
import TopBar from "./TopBar";
import UrgencyBanner from "./UrgencyBanner";
import { clearSession, getSession, type Session } from "@/lib/auth";
import { formatDistance } from "@/lib/geo";
import {
  apiCreate,
  apiGuess,
  apiJoin,
  apiSettings,
  apiStart,
  apiState,
  getOrCreatePlayerId,
} from "@/lib/api";
import {
  createSoloEngine,
  guessSolo,
  soloToRoomState,
  tickSolo,
  type SoloEngine,
} from "@/lib/soloClient";
import { playGuessConfirm } from "@/lib/sound";
import { modeLabels, translateError } from "@/lib/i18n";
import {
  SOLO_DEFAULT_SETTINGS,
  type GameMode,
  type GameSettings,
  type RoomState,
} from "@/lib/types";

const MapPick = dynamic(() => import("./MapPick"), { ssr: false });

type Screen = "home" | "soloSetup" | "room";

export default function GameApp() {
  const { t, lang } = useLang();
  const [screen, setScreen] = useState<Screen>("home");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(null);
  const [timerLeft, setTimerLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [soloSettings, setSoloSettings] = useState<GameSettings>({
    ...SOLO_DEFAULT_SETTINGS,
  });
  const soloRef = useRef<SoloEngine | null>(null);

  useEffect(() => {
    setPlayerId(getOrCreatePlayerId());
    const s = getSession();
    setSession(s);
    if (s?.name) setName(s.name);
    else {
      const saved = localStorage.getItem("guessmyorigin_name");
      if (saved) setName(saved);
    }
  }, []);

  /* Solo 100 % client */
  useEffect(() => {
    if (!state?.settings.solo || screen !== "room" || !soloRef.current) return;
    let lastRound = soloRef.current.roundIndex;
    const id = setInterval(() => {
      if (!soloRef.current) return;
      const next = tickSolo(soloRef.current);
      if (next.roundIndex !== lastRound && next.phase === "playing") {
        setPick(null);
        lastRound = next.roundIndex;
      }
      soloRef.current = next;
      setState(soloToRoomState(next));
    }, 250);
    return () => clearInterval(id);
  }, [state?.settings.solo, state?.code, screen]);

  /* Multi : polling HTTP Vercel */
  useEffect(() => {
    if (!state?.code || !playerId || screen !== "room") return;
    if (state.settings.solo || state.code === "SOLO") return;
    const code = state.code;
    let cancelled = false;
    let lastRound = -1;

    const poll = async () => {
      const res = await apiState(code, playerId);
      if (cancelled || !res.ok || !res.state) return;
      const s = res.state;
      const ri = s.round?.index ?? -1;
      if (s.phase === "playing" && ri !== lastRound) {
        setPick(null);
        lastRound = ri;
      }
      setState(s);
    };

    const id = setInterval(poll, 700);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [state?.code, state?.settings.solo, playerId, screen]);

  useEffect(() => {
    if (!state?.round?.endsAt || state.phase !== "playing") {
      setTimerLeft(0);
      return;
    }
    // En duel urgence : le chrono affiché suit urgencyEndsAt côté bannière
    const tick = () => {
      const end = state.round!.urgencyEndsAt ?? state.round!.endsAt!;
      setTimerLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state?.round?.endsAt, state?.round?.urgencyEndsAt, state?.phase]);

  const me = useMemo(
    () => state?.players.find((p) => p.id === playerId),
    [state, playerId]
  );

  const duelUrgency =
    !!state?.round?.urgencyEndsAt &&
    state.phase === "playing" &&
    !state.you?.hasGuessed;

  const soloEndUrgency =
    !!state?.settings.solo &&
    state.phase === "playing" &&
    !state.you?.hasGuessed &&
    !!state.round?.endsAt &&
    !state.round.urgencyEndsAt &&
    timerLeft > 0 &&
    timerLeft <= (state.settings.soloUrgencyAt || 5);

  const urgencyActive = duelUrgency || soloEndUrgency;
  const urgencyEndsAt = duelUrgency
    ? state?.round?.urgencyEndsAt ?? null
    : state?.round?.endsAt ?? null;
  const urgencyLabel = duelUrgency ? t.someoneGuessed : t.timeLeft;

  const create = async () => {
    setError("");
    if (!name.trim()) {
      setError(t.errName);
      return;
    }
    localStorage.setItem("guessmyorigin_name", name.trim());
    setBusy(true);
    const res = await apiCreate(playerId, name.trim());
    setBusy(false);
    if (!res.ok || !res.state) {
      setError(translateError(lang, res.error));
      return;
    }
    setState(res.state);
    setScreen("room");
  };

  const join = async () => {
    setError("");
    if (!name.trim()) {
      setError(t.errName);
      return;
    }
    if (joinCode.trim().length < 4) {
      setError(t.errCode);
      return;
    }
    localStorage.setItem("guessmyorigin_name", name.trim());
    setBusy(true);
    const res = await apiJoin(joinCode.trim().toUpperCase(), playerId, name.trim());
    setBusy(false);
    if (!res.ok || !res.state) {
      setError(translateError(lang, res.error));
      return;
    }
    setState(res.state);
    setScreen("room");
  };

  const patchSettings = async (patch: Partial<RoomState["settings"]>) => {
    if (!state || !me?.isHost) return;
    const res = await apiSettings(state.code, playerId, patch);
    if (res.ok && res.state) setState(res.state);
  };

  const start = async () => {
    if (!state) return;
    if (state.settings.solo) {
      const engine = createSoloEngine(playerId, name.trim() || state.players[0]?.name || "Solo", {
        ...state.settings,
        solo: true,
      });
      soloRef.current = engine;
      setPick(null);
      setState(soloToRoomState(engine));
      return;
    }
    const res = await apiStart(state.code, playerId);
    if (res.ok && res.state) setState(res.state);
    else if (!res.ok) setError(translateError(lang, res.error));
  };

  const launchSolo = () => {
    setError("");
    if (!name.trim()) {
      setError(t.errName);
      return;
    }
    localStorage.setItem("guessmyorigin_name", name.trim());
    const engine = createSoloEngine(playerId, name.trim(), {
      ...soloSettings,
      solo: true,
      soloUrgencyAt: 5,
    });
    soloRef.current = engine;
    setPick(null);
    setState(soloToRoomState(engine));
    setScreen("room");
  };

  const confirmGuess = useCallback(async () => {
    if (!state || !pick || state.you?.hasGuessed) return;
    playGuessConfirm();
    if (state.settings.solo && soloRef.current) {
      const next = guessSolo(soloRef.current, pick.lat, pick.lng);
      soloRef.current = next;
      setState(soloToRoomState(next));
      return;
    }
    const res = await apiGuess(state.code, playerId, pick.lat, pick.lng);
    if (res.ok && res.state) setState(res.state);
  }, [state, pick, playerId]);

  if (screen === "soloSetup") {
    return (
      <main className="shell lobby">
        <TopBar
          rightSlot={
            <button
              type="button"
              className="btn secondary"
              style={{ padding: "8px 14px" }}
              onClick={() => setScreen("home")}
            >
              {t.return}
            </button>
          }
        />
        <header className="topbar">
          <div className="brand-inline">
            <BrandLogo size="sm" />
            <strong>{t.solo}</strong>
          </div>
        </header>

        <div className="lobby-grid" style={{ maxWidth: 520 }}>
          <section className="panel" style={{ gridColumn: "1 / -1" }}>
            <h2>{t.difficulty}</h2>
            <div className="mode-grid">
              {(["standard", "hardcore", "random"] as GameMode[]).map((mode) => {
                const label = modeLabels(t, mode);
                return (
                <button
                  key={mode}
                  type="button"
                  className={`mode-card ${soloSettings.mode === mode ? "active" : ""}`}
                  onClick={() => setSoloSettings((s) => ({ ...s, mode }))}
                >
                  <strong>{label.title}</strong>
                  <span>{label.desc}</span>
                </button>
              );
              })}
            </div>

            {soloSettings.mode === "hardcore" && (
              <label className="slider-field">
                <div className="slider-head">
                  <span>{t.flashDuration}</span>
                  <strong>{soloSettings.flashSeconds.toFixed(1)}s</strong>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={soloSettings.flashSeconds}
                  onChange={(e) =>
                    setSoloSettings((s) => ({
                      ...s,
                      flashSeconds: Number(e.target.value),
                    }))
                  }
                />
              </label>
            )}

            {soloSettings.mode === "random" && (
              <>
                <label className="slider-field">
                  <div className="slider-head">
                    <span>{t.timeMin}</span>
                    <strong>{soloSettings.randomTimeMin}s</strong>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    value={soloSettings.randomTimeMin}
                    onChange={(e) =>
                      setSoloSettings((s) => ({
                        ...s,
                        randomTimeMin: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="slider-field">
                  <div className="slider-head">
                    <span>{t.timeMax}</span>
                    <strong>{soloSettings.randomTimeMax}s</strong>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={180}
                    step={5}
                    value={soloSettings.randomTimeMax}
                    onChange={(e) =>
                      setSoloSettings((s) => ({
                        ...s,
                        randomTimeMax: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              </>
            )}

            <h2 className="settings-sub">{t.settings}</h2>
            <label className="slider-field">
              <div className="slider-head">
                <span>{t.rounds}</span>
                <strong>{soloSettings.rounds}</strong>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={soloSettings.rounds}
                onChange={(e) =>
                  setSoloSettings((s) => ({
                    ...s,
                    rounds: Number(e.target.value),
                  }))
                }
              />
            </label>

            {soloSettings.mode !== "random" && (
              <label className="slider-field">
                <div className="slider-head">
                  <span>{t.timeGuess}</span>
                  <strong>{soloSettings.timePerRound}s</strong>
                </div>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={5}
                  value={soloSettings.timePerRound}
                  onChange={(e) =>
                    setSoloSettings((s) => ({
                      ...s,
                      timePerRound: Number(e.target.value),
                    }))
                  }
                />
              </label>
            )}

            <p className="solo-hint">{t.soloHint}</p>

            <button
              className="btn primary wide"
              onClick={launchSolo}
              disabled={busy}
            >
              {t.launchSolo}: {modeLabels(t, soloSettings.mode).title}
            </button>
            {error && <p className="error">{error}</p>}
          </section>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <AuthGate
        onAuthed={(s, pendingCode) => {
          setSession(s);
          setName(s.name);
          if (pendingCode) setJoinCode(pendingCode);
        }}
      />
    );
  }

  if (screen === "home" || !state) {
    return (
      <main className="shell home">
        <TopBar />
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <header className="brand">
          <BrandLogo size="lg" priority />
          <h1>{t.tagline}</h1>
          <p className="home-hello">
            {t.hello} {session.name} 👋
          </p>
        </header>

        <div className="panel home-panel">
          <button
            className="btn primary"
            onClick={() => {
              setError("");
              setSoloSettings({ ...SOLO_DEFAULT_SETTINGS });
              setScreen("soloSetup");
            }}
            disabled={busy}
          >
            {t.playSolo}
          </button>

          <button className="btn secondary" onClick={create} disabled={busy}>
            {t.createSession}
          </button>

          <div className="divider">
            <span>{t.orJoin}</span>
          </div>

          <label className="field">
            <span>{t.code}</span>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="AB12"
              className="code-input"
            />
          </label>
          <button className="btn secondary" onClick={join} disabled={busy}>
            {t.join}
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              clearSession();
              setSession(null);
              setState(null);
              setScreen("home");
            }}
          >
            {t.logout}
          </button>

          {error && <p className="error">{error}</p>}
        </div>
      </main>
    );
  }

  /* —— LOBBY —— */
  if (state.phase === "lobby") {
    return (
      <main className="shell lobby">
        <TopBar
          rightSlot={
            !state.settings.solo ? (
              <div className="code-pill">
                {t.code} <span>{state.code}</span>
              </div>
            ) : undefined
          }
        />
        <header className="topbar">
          <div className="brand-inline">
            <BrandLogo size="sm" />
            <strong>GuessMyOrigin</strong>
          </div>
        </header>

        <div className="lobby-grid">
          <section className="panel">
            <h2>{t.players} ({state.players.length}/10)</h2>
            <ul className="player-list">
              {state.players.map((p) => (
                <li key={p.id}>
                  <span className="dot" style={{ background: p.color }} />
                  <span>{p.name}</span>
                  {p.isHost && <em className="tag">{t.host}</em>}
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>{t.gameMode}</h2>
            <div className="mode-grid">
              {(["standard", "hardcore", "random"] as GameMode[]).map((mode) => {
                const label = modeLabels(t, mode);
                return (
                <button
                  key={mode}
                  type="button"
                  className={`mode-card ${state.settings.mode === mode ? "active" : ""}`}
                  disabled={!me?.isHost}
                  onClick={() => patchSettings({ mode })}
                >
                  <strong>{label.title}</strong>
                  <span>{label.desc}</span>
                </button>
              );
              })}
            </div>

            {state.settings.mode === "hardcore" && (
              <label className="slider-field">
                <div className="slider-head">
                  <span>{t.flashDuration}</span>
                  <strong>{state.settings.flashSeconds.toFixed(1)}s</strong>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={state.settings.flashSeconds}
                  disabled={!me?.isHost}
                  onChange={(e) =>
                    patchSettings({ flashSeconds: Number(e.target.value) })
                  }
                />
              </label>
            )}

            {state.settings.mode === "random" && (
              <>
                <label className="slider-field">
                  <div className="slider-head">
                    <span>{t.timeMin}</span>
                    <strong>{state.settings.randomTimeMin}s</strong>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={state.settings.randomTimeMin}
                    disabled={!me?.isHost}
                    onChange={(e) =>
                      patchSettings({ randomTimeMin: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="slider-field">
                  <div className="slider-head">
                    <span>{t.timeMax}</span>
                    <strong>{state.settings.randomTimeMax}s</strong>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={180}
                    step={5}
                    value={state.settings.randomTimeMax}
                    disabled={!me?.isHost}
                    onChange={(e) =>
                      patchSettings({ randomTimeMax: Number(e.target.value) })
                    }
                  />
                </label>
              </>
            )}

            <h2 className="settings-sub">{t.settings}</h2>
            <label className="slider-field">
              <div className="slider-head">
                <span>{t.rounds}</span>
                <strong>{state.settings.rounds}</strong>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={state.settings.rounds}
                disabled={!me?.isHost}
                onChange={(e) => patchSettings({ rounds: Number(e.target.value) })}
              />
            </label>
            {state.settings.mode !== "random" && (
              <label className="slider-field">
                <div className="slider-head">
                  <span>{t.timeGuess}</span>
                  <strong>{state.settings.timePerRound}s</strong>
                </div>
                <input
                  type="range"
                  min={15}
                  max={180}
                  step={5}
                  value={state.settings.timePerRound}
                  disabled={!me?.isHost}
                  onChange={(e) =>
                    patchSettings({ timePerRound: Number(e.target.value) })
                  }
                />
              </label>
            )}
            <label className="slider-field">
              <div className="slider-head">
                <span>{t.urgency}</span>
                <strong>{state.settings.urgencySeconds}s</strong>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                value={state.settings.urgencySeconds}
                disabled={!me?.isHost}
                onChange={(e) =>
                  patchSettings({ urgencySeconds: Number(e.target.value) })
                }
              />
            </label>

            {me?.isHost ? (
              <button className="btn primary wide" onClick={start}>
                {t.startGame}: {modeLabels(t, state.settings.mode).title}
              </button>
            ) : (
              <p className="muted">{t.waitingHost}</p>
            )}
          </section>
        </div>
      </main>
    );
  }

  /* —— FINISHED —— */
  if (state.phase === "finished") {
    const ranked = [...state.players].sort((a, b) => b.score - a.score);
    return (
      <main className="shell finished">
        <div className="panel finish-panel">
          <h1>{t.gameOver}</h1>
          <ol className="final-rank">
            {ranked.map((p, i) => (
              <li key={p.id} className={i === 0 ? "winner" : ""}>
                <span className="rank-n">{i + 1}</span>
                <span className="dot" style={{ background: p.color }} />
                <span>{p.name}</span>
                <strong>{p.score}</strong>
              </li>
            ))}
          </ol>
          {me?.isHost && (
            <button className="btn primary wide" onClick={start}>
              {t.playAgain}
            </button>
          )}
        </div>
      </main>
    );
  }

  /* —— PLAYING / ROUND RESULT —— */
  const round = state.round!;
  const canPick = state.phase === "playing" && !state.you?.hasGuessed;
  const revealed = state.phase === "roundResult";

  return (
    <main className={`shell game ${urgencyActive ? "urgency-mode" : ""}`}>
      <UrgencyBanner
        active={urgencyActive}
        endsAt={urgencyEndsAt}
        label={urgencyLabel}
      />

      <LiveHud
        players={state.players}
        myId={playerId}
        lastGuess={state.you?.lastGuess ?? null}
        phase={state.phase}
      />

      <FaceZoom
        src={round.person.imageUrl}
        caption={
          revealed && round.person.city
            ? `${round.person.city}, ${round.person.country}`
            : null
        }
        mode={state.settings.mode}
        flashEndsAt={round.flashEndsAt}
        forceShow={revealed}
      />

      <div className="game-main">
        <header className="game-top">
          <div className="round-pill">
            {t.round} {round.index + 1}/{round.total}
          </div>
          {state.phase === "playing" && (
            <div className={`timer-pill ${urgencyActive ? "hot" : ""}`}>
              {timerLeft}s
            </div>
          )}
          {state.you?.hasGuessed &&
            state.phase === "playing" &&
            !state.settings.solo && (
              <div className="waiting-pill">{t.waitingOthers}</div>
            )}
        </header>

        {state.you?.lastGuess && (state.you.hasGuessed || revealed) && (
          <div className="instant-score">
            <div>
              <span>{t.distance}</span>
              <b>{formatDistance(state.you.lastGuess.distanceKm)}</b>
            </div>
            <div>
              <span>{t.points}</span>
              <b className="red">+{state.you.lastGuess.points}</b>
            </div>
            <div>
              <span>{t.total}</span>
              <b>{me?.score ?? 0}</b>
            </div>
          </div>
        )}

        <div className="map-wrap">
          <MapPick
            pick={pick}
            onPick={(lat, lng) => setPick({ lat, lng })}
            canPick={canPick}
            revealed={revealed}
            target={
              revealed && round.person.lat != null
                ? { lat: round.person.lat, lng: round.person.lng! }
                : null
            }
            guesses={revealed ? round.guesses : []}
            myColor={me?.color}
          />
        </div>

        {canPick && (
          <div className="guess-bar">
            <button
              className="btn primary wide"
              disabled={!pick}
              onClick={confirmGuess}
            >
              {t.validate}
            </button>
          </div>
        )}

        {revealed && (
          <div className="round-results">
            <p>{t.nextRound}</p>
            <ul>
              {round.guesses.map((g) => (
                <li key={g.playerId}>
                  <span className="dot" style={{ background: g.color }} />
                  {g.playerName}: {formatDistance(g.distanceKm)},{" "}
                  <b>+{g.points}</b>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
