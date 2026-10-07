"use client";

import { formatDistance } from "@/lib/geo";
import type { GuessResult, PlayerPublic } from "@/lib/types";

interface Props {
  players: PlayerPublic[];
  myId: string | null;
  lastGuess: GuessResult | null;
  phase: string;
}

export default function LiveHud({ players, myId, lastGuess, phase }: Props) {
  const me = players.find((p) => p.id === myId);
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <aside className="live-hud">
      <div className="hud-card">
        <p className="hud-label">Ta manche</p>
        {lastGuess ? (
          <>
            <div className="hud-stat">
              <span>Distance</span>
              <strong>{formatDistance(lastGuess.distanceKm)}</strong>
            </div>
            <div className="hud-stat">
              <span>Points</span>
              <strong className="red">+{lastGuess.points}</strong>
            </div>
          </>
        ) : (
          <p className="hud-wait">
            {phase === "playing" ? "Place ton point…" : "—"}
          </p>
        )}
        <div className="hud-stat total">
          <span>Total</span>
          <strong>{me?.score ?? 0}</strong>
        </div>
      </div>

      <div className="hud-card rank-card">
        <p className="hud-label">Classement</p>
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
