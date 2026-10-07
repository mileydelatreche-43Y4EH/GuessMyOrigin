"use client";

import { haversineKm, scoreFromDistanceKm } from "./geo";
import { pickRoundPeople } from "./people";
import {
  PLAYER_COLORS,
  type GameSettings,
  type Person,
  type RoomState,
} from "./types";

/** État solo 100 % client — marche sur Vercel sans store serveur. */
export type SoloEngine = {
  playerId: string;
  name: string;
  settings: GameSettings;
  deck: Person[];
  roundIndex: number;
  score: number;
  phase: RoomState["phase"];
  endsAt: number | null;
  urgencyEndsAt: number | null;
  flashEndsAt: number | null;
  resultEndsAt: number | null;
  lastGuess: {
    lat: number;
    lng: number;
    distanceKm: number;
    points: number;
  } | null;
};

function pickRoundSeconds(settings: GameSettings): number {
  if (settings.mode !== "random") return settings.timePerRound;
  const min = settings.randomTimeMin;
  const max = settings.randomTimeMax;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createSoloEngine(
  playerId: string,
  name: string,
  settings: GameSettings
): SoloEngine {
  const deck = pickRoundPeople(settings.rounds);
  const roundSeconds = pickRoundSeconds(settings);
  const now = Date.now();
  return {
    playerId,
    name: name.trim().slice(0, 16) || "Solo",
    settings: { ...settings, solo: true },
    deck,
    roundIndex: 0,
    score: 0,
    phase: "playing",
    endsAt: now + roundSeconds * 1000,
    urgencyEndsAt: null,
    flashEndsAt:
      settings.mode === "hardcore"
        ? now + settings.flashSeconds * 1000
        : null,
    resultEndsAt: null,
    lastGuess: null,
  };
}

function beginRound(engine: SoloEngine): void {
  engine.phase = "playing";
  engine.lastGuess = null;
  engine.urgencyEndsAt = null;
  engine.resultEndsAt = null;
  const roundSeconds = pickRoundSeconds(engine.settings);
  const now = Date.now();
  engine.endsAt = now + roundSeconds * 1000;
  engine.flashEndsAt =
    engine.settings.mode === "hardcore"
      ? now + engine.settings.flashSeconds * 1000
      : null;
}

/** Avance les phases selon l'horloge (à appeler dans le tick UI). */
export function tickSolo(engine: SoloEngine): SoloEngine {
  const now = Date.now();
  const next = { ...engine };

  if (next.phase === "playing") {
    const deadline = next.urgencyEndsAt ?? next.endsAt;
    if (deadline != null && now >= deadline) {
      next.phase = "roundResult";
      next.endsAt = null;
      next.urgencyEndsAt = null;
      next.flashEndsAt = null;
      next.resultEndsAt = now + 5000;
    }
  } else if (next.phase === "roundResult") {
    if (next.resultEndsAt != null && now >= next.resultEndsAt) {
      next.roundIndex += 1;
      next.resultEndsAt = null;
      if (next.roundIndex >= next.settings.rounds) {
        next.phase = "finished";
        next.endsAt = null;
        next.urgencyEndsAt = null;
        next.flashEndsAt = null;
      } else {
        beginRound(next);
      }
    }
  }

  return next;
}

export function guessSolo(
  engine: SoloEngine,
  lat: number,
  lng: number
): SoloEngine {
  if (engine.phase !== "playing" || engine.lastGuess) return engine;
  const person = engine.deck[engine.roundIndex];
  if (!person) return engine;

  const distanceKm = haversineKm(lat, lng, person.lat, person.lng);
  const points = scoreFromDistanceKm(distanceKm);
  const next = { ...engine };
  next.score += points;
  next.lastGuess = { lat, lng, distanceKm, points };
  // Solo : on clôture la manche dès le guess (comme avant)
  next.phase = "roundResult";
  next.endsAt = null;
  next.urgencyEndsAt = null;
  next.flashEndsAt = null;
  next.resultEndsAt = Date.now() + 5000;
  return next;
}

export function soloToRoomState(engine: SoloEngine): RoomState {
  const person = engine.deck[engine.roundIndex] ?? engine.deck[0];
  const revealed =
    engine.phase === "roundResult" || engine.phase === "finished";
  const last = engine.lastGuess;

  return {
    code: "SOLO",
    phase: engine.phase,
    settings: engine.settings,
    players: [
      {
        id: engine.playerId,
        name: engine.name,
        color: PLAYER_COLORS[0],
        score: engine.score,
        hasGuessed: !!last && engine.phase !== "playing",
        isHost: true,
        connected: true,
      },
    ],
    round: person
      ? {
          index: Math.min(engine.roundIndex, engine.settings.rounds - 1),
          total: engine.settings.rounds,
          person: revealed
            ? {
                id: person.id,
                name: person.name,
                imageUrl: person.imageUrl,
                country: person.country,
                city: person.city,
                lat: person.lat,
                lng: person.lng,
              }
            : {
                id: person.id,
                name: person.name,
                imageUrl: person.imageUrl,
              },
          endsAt: engine.endsAt,
          urgencyEndsAt: engine.urgencyEndsAt,
          flashEndsAt: engine.flashEndsAt,
          guesses:
            revealed && last
              ? [
                  {
                    playerId: engine.playerId,
                    playerName: engine.name,
                    color: PLAYER_COLORS[0],
                    lat: last.lat,
                    lng: last.lng,
                    distanceKm: last.distanceKm,
                    points: last.points,
                  },
                ]
              : [],
          revealed,
        }
      : null,
    you: {
      id: engine.playerId,
      hasGuessed: !!last,
      lastGuess: last
        ? {
            playerId: engine.playerId,
            playerName: engine.name,
            color: PLAYER_COLORS[0],
            lat: last.lat,
            lng: last.lng,
            distanceKm: last.distanceKm,
            points: last.points,
          }
        : null,
    },
  };
}
