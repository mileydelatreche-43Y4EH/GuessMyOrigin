"use client";

import { formatDistance } from "@/lib/geo";
import type { GuessResult, PlayerPublic } from "@/lib/types";
import { useLang } from "./LangContext";

interface Props {
  players: PlayerPublic[];
  myId: string | null;
  lastGuess: GuessResult | null;
  phase: string;
}

export default function LiveHud({ players, myId, lastGuess, phase }: Props) {
  const { t } = useLang();
  const me = players.find((p) => p.id === myId);
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <aside className="live-hud">
      <div className="hud-card">
        <p className="hud-label">{t.yourRound}</p>
        {lastGuess ? (
          <>
            <div className="hud-stat">
              <span>{t.distance}</span>
              <strong>{formatDistance(lastGuess.distanceKm)}</strong>
            </div>
            <div className="hud-stat">
              <span>{t.points}</span>
              <strong className="red">+{lastGuess.points}</strong>
            </div>
          </>
        ) : (
          <p className="hud-wait">
            {phase === "playing" ? t.placePoint : "…"}
          </p>
        )}
        <div className="hud-stat total">
          <span>{t.total}</span>
          <strong>{me?.score ?? 0}</strong>
        </div>
      </div>

      <div className="hud-card rank-card">
        <p className="hud-label">{t.ranking}</p>
        <ol className="rank-list">
          {ranked.map((p, i) => (
            <li key={p.id} className={p.id === myId ? "me" : ""}>
              <span className="rank-n">{i + 1}</span>
              <span className="dot" style={{ background: p.color }} />
              <span className="rank-name">{p.name}</span>
              <span className="rank-score">{p.score}</span>
              {p.hasGuessed && phase === "playing" && (
                <span className="guessed-check">✓</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
