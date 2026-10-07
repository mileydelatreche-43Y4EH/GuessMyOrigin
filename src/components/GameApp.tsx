"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import FaceZoom from "./FaceZoom";
import LiveHud from "./LiveHud";
import UrgencyBanner from "./UrgencyBanner";
import { formatDistance } from "@/lib/geo";
import { getOrCreatePlayerId, getSocket } from "@/lib/socket";
import { playGuessConfirm } from "@/lib/sound";
import {
  MODE_LABELS,
  SOLO_DEFAULT_SETTINGS,
  type GameMode,
  type GameSettings,
  type RoomState,
} from "@/lib/types";

const MapPick = dynamic(() => import("./MapPick"), { ssr: false });

type Screen = "home" | "soloSetup" | "room";

export default function GameApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(null);
  const [timerLeft, setTimerLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [soloSettings, setSoloSettings] = useState<GameSettings>({
    ...SOLO_DEFAULT_SETTINGS,
  });

  useEffect(() => {
    setPlayerId(getOrCreatePlayerId());
    const saved = localStorage.getItem("origine_name");
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onState = (s: RoomState) => {
      setState(s);
      setScreen("room");
      if (s.phase === "playing" && !s.you?.hasGuessed) setPick(null);
    };
    socket.on("state", onState);
    return () => {
      socket.off("state", onState);
    };
  }, []);

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
  const urgencyLabel = duelUrgency ? "Quelqu'un a guess !" : "Plus que…";

  const create = () => {
    setError("");
    if (!name.trim()) {
      setError("Entre un prénom");
      return;
    }
    localStorage.setItem("origine_name", name.trim());
    setBusy(true);
    getSocket().emit(
      "create",
      { playerId, name: name.trim() },
      (res: { ok: boolean; state?: RoomState; error?: string }) => {
        setBusy(false);
        if (!res.ok) {
          setError(res.error || "Erreur");
          return;
        }
        setState(res.state!);
        setScreen("room");
      }
    );
  };

  const join = () => {
    setError("");
    if (!name.trim()) {
      setError("Entre un prénom");
      return;
    }
    if (joinCode.trim().length < 4) {
      setError("Code à 4 lettres");
      return;
    }
    localStorage.setItem("origine_name", name.trim());
    setBusy(true);
    getSocket().emit(
      "join",
      { code: joinCode.trim().toUpperCase(), playerId, name: name.trim() },
      (res: { ok: boolean; state?: RoomState; error?: string }) => {
        setBusy(false);
        if (!res.ok) {
          setError(res.error || "Erreur");
          return;
        }
        setState(res.state!);
        setScreen("room");
      }
    );
  };

  const patchSettings = (patch: Partial<RoomState["settings"]>) => {
    if (!state || !me?.isHost) return;
    getSocket().emit("settings", {
      code: state.code,
      playerId,
      settings: patch,
    });
  };

  const start = () => {
    if (!state) return;
    getSocket().emit("start", { code: state.code, playerId });
  };

  const launchSolo = () => {
    setError("");
    if (!name.trim()) {
      setError("Entre un prénom");
      return;
    }
    localStorage.setItem("origine_name", name.trim());
    setBusy(true);
    getSocket().emit(
      "soloStart",
      {
        playerId,
        name: name.trim(),
        settings: {
          mode: soloSettings.mode,
          rounds: soloSettings.rounds,
          timePerRound: soloSettings.timePerRound,
          flashSeconds: soloSettings.flashSeconds,
          randomTimeMin: soloSettings.randomTimeMin,
          randomTimeMax: soloSettings.randomTimeMax,
          soloUrgencyAt: 5,
        },
      },
      (res: { ok: boolean; state?: RoomState; error?: string }) => {
        setBusy(false);
        if (!res.ok) {
          setError(res.error || "Erreur");
          return;
        }
        setState(res.state!);
        setScreen("room");
      }
    );
  };

  const confirmGuess = useCallback(() => {
    if (!state || !pick || state.you?.hasGuessed) return;
    playGuessConfirm();
    getSocket().emit("guess", {
      code: state.code,
      playerId,
      lat: pick.lat,
      lng: pick.lng,
    });
  }, [state, pick, playerId]);

  if (screen === "soloSetup") {
    return (
      <main className="shell lobby">
        <header className="topbar">
          <div className="brand-inline">
            <div className="logo-mark sm" />
            <strong>Solo</strong>
          </div>
          <button
            type="button"
            className="btn secondary"
            style={{ padding: "8px 14px" }}
            onClick={() => setScreen("home")}
          >
            Retour
          </button>
        </header>

        <div className="lobby-grid" style={{ maxWidth: 520 }}>
          <section className="panel" style={{ gridColumn: "1 / -1" }}>
            <h2>Difficulté</h2>
            <div className="mode-grid">
              {(Object.keys(MODE_LABELS) as GameMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`mode-card ${soloSettings.mode === mode ? "active" : ""}`}
                  onClick={() => setSoloSettings((s) => ({ ...s, mode }))}
                >
                  <strong>{MODE_LABELS[mode].title}</strong>
                  <span>{MODE_LABELS[mode].desc}</span>
                </button>
              ))}
            </div>

            {soloSettings.mode === "hardcore" && (
              <label className="slider-field">
                <div className="slider-head">
                  <span>Durée du flash</span>
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
                    <span>Temps min</span>
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
                    <span>Temps max</span>
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

            <h2 className="settings-sub">Réglages</h2>
            <label className="slider-field">
              <div className="slider-head">
                <span>Manches</span>
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
                  <span>Temps pour guess</span>
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

            <p className="solo-hint">
              Valide avant la fin pour scorer tout de suite. Les{" "}
              <strong>5 dernières secondes</strong> : animation rouge comme en
              duel.
            </p>

            <button
              className="btn primary wide"
              onClick={launchSolo}
              disabled={busy}
            >
              Lancer le solo — {MODE_LABELS[soloSettings.mode].title}
            </button>
            {error && <p className="error">{error}</p>}
          </section>
        </div>
      </main>
    );
  }

  if (screen === "home" || !state) {
    return (
      <main className="shell home">
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <header className="brand">
          <div className="logo-mark" />
          <h1>Origine</h1>
          <p>Devine d&apos;où vient le visage. Clique sur la carte.</p>
        </header>

        <div className="panel home-panel">
          <label className="field">
            <span>Ton prénom</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              placeholder="Ex: Mila"
            />
          </label>

          <button
            className="btn primary"
            onClick={() => {
              setError("");
              if (!name.trim()) {
                setError("Entre un prénom");
                return;
              }
              localStorage.setItem("origine_name", name.trim());
              setSoloSettings({ ...SOLO_DEFAULT_SETTINGS });
              setScreen("soloSetup");
            }}
            disabled={busy}
          >
            Jouer solo
          </button>

          <button className="btn secondary" onClick={create} disabled={busy}>
            Créer une session (amis)
          </button>

          <div className="divider">
            <span>ou rejoindre</span>
          </div>

          <label className="field">
            <span>Code</span>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="AB12"
              className="code-input"
            />
          </label>
          <button className="btn secondary" onClick={join} disabled={busy}>
            Rejoindre
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
        <header className="topbar">
          <div className="brand-inline">
            <div className="logo-mark sm" />
            <strong>Origine</strong>
          </div>
          {!state.settings.solo && (
            <div className="code-pill">
              Code <span>{state.code}</span>
            </div>
          )}
        </header>

        <div className="lobby-grid">
          <section className="panel">
            <h2>Joueurs ({state.players.length}/10)</h2>
            <ul className="player-list">
              {state.players.map((p) => (
                <li key={p.id}>
                  <span className="dot" style={{ background: p.color }} />
                  <span>{p.name}</span>
                  {p.isHost && <em className="tag">hôte</em>}
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Mode de jeu</h2>
            <div className="mode-grid">
              {(Object.keys(MODE_LABELS) as GameMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`mode-card ${state.settings.mode === mode ? "active" : ""}`}
                  disabled={!me?.isHost}
                  onClick={() => patchSettings({ mode })}
                >
                  <strong>{MODE_LABELS[mode].title}</strong>
                  <span>{MODE_LABELS[mode].desc}</span>
                </button>
              ))}
            </div>

            {state.settings.mode === "hardcore" && (
              <label className="slider-field">
                <div className="slider-head">
                  <span>Durée du flash</span>
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
                    <span>Temps min (random)</span>
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
                    <span>Temps max (random)</span>
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

            <h2 className="settings-sub">Réglages</h2>
            <label className="slider-field">
              <div className="slider-head">
                <span>Manches</span>
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
                  <span>Temps / manche</span>
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
                <span>Urgence après 1er guess</span>
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
                Lancer — {MODE_LABELS[state.settings.mode].title}
              </button>
            ) : (
              <p className="muted">En attente de l&apos;hôte…</p>
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
          <h1>Fin de partie</h1>
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
              Rejouer
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
            Manche {round.index + 1}/{round.total}
          </div>
          {state.phase === "playing" && (
            <div className={`timer-pill ${urgencyActive ? "hot" : ""}`}>
              {timerLeft}s
            </div>
          )}
          {state.you?.hasGuessed &&
            state.phase === "playing" &&
            !state.settings.solo && (
              <div className="waiting-pill">En attente des autres…</div>
            )}
        </header>

        {state.you?.lastGuess && (state.you.hasGuessed || revealed) && (
          <div className="instant-score">
            <div>
              <span>Distance</span>
              <b>{formatDistance(state.you.lastGuess.distanceKm)}</b>
            </div>
            <div>
              <span>Points</span>
              <b className="red">+{state.you.lastGuess.points}</b>
            </div>
            <div>
              <span>Total</span>
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
              Valider mon point
            </button>
          </div>
        )}

        {revealed && (
          <div className="round-results">
            <p>Prochaine manche dans un instant…</p>
            <ul>
              {round.guesses.map((g) => (
                <li key={g.playerId}>
                  <span className="dot" style={{ background: g.color }} />
                  {g.playerName} — {formatDistance(g.distanceKm)} —{" "}
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
