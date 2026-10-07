import { haversineKm, scoreFromDistanceKm } from "./geo";
import { pickRoundPeople } from "./people";
import {
  DEFAULT_SETTINGS,
  PLAYER_COLORS,
  SOLO_DEFAULT_SETTINGS,
  type GameSettings,
  type GuessResult,
  type Person,
  type PlayerPublic,
  type RoomState,
} from "./types";

interface InternalPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  lastSeen: number;
}

interface InternalGuess {
  playerId: string;
  lat: number;
  lng: number;
  distanceKm: number;
  points: number;
}

interface Room {
  code: string;
  settings: GameSettings;
  players: Map<string, InternalPlayer>;
  phase: RoomState["phase"];
  deck: Person[];
  roundIndex: number;
  currentPerson: Person | null;
  guesses: Map<string, InternalGuess>;
  endsAt: number | null;
  urgencyEndsAt: number | null;
  flashEndsAt: number | null;
  /** Fin de l'écran résultats (5s) avant prochaine manche */
  resultEndsAt: number | null;
}

type GlobalRooms = { __gmo_rooms?: Map<string, Room> };

function getRooms(): Map<string, Room> {
  const g = globalThis as unknown as GlobalRooms;
  if (!g.__gmo_rooms) g.__gmo_rooms = new Map();
  return g.__gmo_rooms;
}

function code4(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function guessResults(room: Room): GuessResult[] {
  const list: GuessResult[] = [];
  for (const g of room.guesses.values()) {
    const p = room.players.get(g.playerId);
    if (!p) continue;
    list.push({
      playerId: g.playerId,
      playerName: p.name,
      color: p.color,
      lat: g.lat,
      lng: g.lng,
      distanceKm: g.distanceKm,
      points: g.points,
    });
  }
  return list.sort((a, b) => b.points - a.points);
}

function publicPlayers(room: Room): PlayerPublic[] {
  const now = Date.now();
  return [...room.players.values()]
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      score: p.score,
      hasGuessed: room.guesses.has(p.id),
      isHost: p.isHost,
      connected: p.connected && now - p.lastSeen < 20_000,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Avance les phases selon les deadlines (compatible serverless / Vercel). */
export function tickRoom(room: Room): void {
  const now = Date.now();

  if (room.phase === "playing") {
    const deadline = room.urgencyEndsAt ?? room.endsAt;
    if (deadline != null && now >= deadline) {
      finishRound(room);
    }
  } else if (room.phase === "roundResult") {
    if (room.resultEndsAt != null && now >= room.resultEndsAt) {
      room.roundIndex += 1;
      room.resultEndsAt = null;
      if (room.roundIndex >= room.settings.rounds) {
        room.phase = "finished";
        room.endsAt = null;
        room.urgencyEndsAt = null;
        room.flashEndsAt = null;
        return;
      }
      beginRound(room);
    }
  }
}

export function getRoomState(code: string, viewerId?: string): RoomState | null {
  const room = getRooms().get(code.toUpperCase());
  if (!room) return null;

  tickRoom(room);

  if (viewerId) {
    const p = room.players.get(viewerId);
    if (p) {
      p.lastSeen = Date.now();
      p.connected = true;
    }
  }

  const revealed = room.phase === "roundResult" || room.phase === "finished";
  const person = room.currentPerson;

  let round: RoomState["round"] = null;
  if (person && room.phase !== "lobby") {
    round = {
      index: room.roundIndex,
      total: room.settings.rounds,
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
      endsAt: room.endsAt,
      urgencyEndsAt: room.urgencyEndsAt,
      flashEndsAt: room.flashEndsAt,
      guesses: revealed ? guessResults(room) : [],
      revealed,
    };
  }

  const youPlayer = viewerId ? room.players.get(viewerId) : undefined;
  const yourGuess = viewerId ? room.guesses.get(viewerId) : undefined;

  return {
    code: room.code,
    phase: room.phase,
    settings: room.settings,
    players: publicPlayers(room),
    round,
    you: youPlayer
      ? {
          id: youPlayer.id,
          hasGuessed: !!yourGuess,
          lastGuess: yourGuess
            ? {
                playerId: yourGuess.playerId,
                playerName: youPlayer.name,
                color: youPlayer.color,
                lat: yourGuess.lat,
                lng: yourGuess.lng,
                distanceKm: yourGuess.distanceKm,
                points: yourGuess.points,
              }
            : null,
        }
      : null,
  };
}

function applySettingsPatch(room: Room, patch: Partial<GameSettings>) {
  if (patch.mode === "standard" || patch.mode === "hardcore" || patch.mode === "random") {
    room.settings.mode = patch.mode;
  }
  if (patch.rounds != null) {
    room.settings.rounds = Math.min(20, Math.max(1, Math.round(patch.rounds)));
  }
  if (patch.timePerRound != null) {
    const minT = room.settings.solo ? 10 : 15;
    room.settings.timePerRound = Math.min(180, Math.max(minT, Math.round(patch.timePerRound)));
  }
  if (patch.urgencySeconds != null) {
    room.settings.urgencySeconds = Math.min(30, Math.max(5, Math.round(patch.urgencySeconds)));
  }
  if (patch.flashSeconds != null) {
    const raw = Number(patch.flashSeconds);
    room.settings.flashSeconds = Math.min(5, Math.max(0.1, Math.round(raw * 10) / 10));
  }
  if (patch.randomTimeMin != null) {
    room.settings.randomTimeMin = Math.min(120, Math.max(5, Math.round(patch.randomTimeMin)));
  }
  if (patch.randomTimeMax != null) {
    room.settings.randomTimeMax = Math.min(180, Math.max(10, Math.round(patch.randomTimeMax)));
  }
  if (patch.soloUrgencyAt != null) {
    room.settings.soloUrgencyAt = Math.min(15, Math.max(3, Math.round(patch.soloUrgencyAt)));
  }
  if (room.settings.randomTimeMin > room.settings.randomTimeMax) {
    const t = room.settings.randomTimeMin;
    room.settings.randomTimeMin = room.settings.randomTimeMax;
    room.settings.randomTimeMax = t;
  }
}

export function createRoom(
  hostId: string,
  hostName: string,
  opts?: { solo?: boolean }
): RoomState {
  const rooms = getRooms();
  let code = code4();
  while (rooms.has(code)) code = code4();

  const room: Room = {
    code,
    settings: opts?.solo ? { ...SOLO_DEFAULT_SETTINGS } : { ...DEFAULT_SETTINGS },
    players: new Map(),
    phase: "lobby",
    deck: [],
    roundIndex: 0,
    currentPerson: null,
    guesses: new Map(),
    endsAt: null,
    urgencyEndsAt: null,
    flashEndsAt: null,
    resultEndsAt: null,
  };

  room.players.set(hostId, {
    id: hostId,
    name: hostName.trim().slice(0, 16) || (opts?.solo ? "Solo" : "Hôte"),
    color: PLAYER_COLORS[0],
    score: 0,
    isHost: true,
    connected: true,
    lastSeen: Date.now(),
  });

  rooms.set(code, room);
  return getRoomState(code, hostId)!;
}

export function joinRoom(
  code: string,
  playerId: string,
  name: string
): { ok: true; state: RoomState } | { ok: false; error: string } {
  const room = getRooms().get(code.toUpperCase());
  if (!room) return { ok: false, error: "ROOM_NOT_FOUND" };
  tickRoom(room);
  if (room.settings.solo) return { ok: false, error: "SOLO_NO_JOIN" };
  if (room.phase !== "lobby") return { ok: false, error: "ALREADY_STARTED" };
  if (room.players.size >= 10) return { ok: false, error: "ROOM_FULL" };

  if (room.players.has(playerId)) {
    const p = room.players.get(playerId)!;
    p.connected = true;
    p.lastSeen = Date.now();
    p.name = name.trim().slice(0, 16) || p.name;
    return { ok: true, state: getRoomState(room.code, playerId)! };
  }

  const used = new Set([...room.players.values()].map((p) => p.color));
  const color = PLAYER_COLORS.find((c) => !used.has(c)) || PLAYER_COLORS[0];

  room.players.set(playerId, {
    id: playerId,
    name: name.trim().slice(0, 16) || "Joueur",
    color,
    score: 0,
    isHost: false,
    connected: true,
    lastSeen: Date.now(),
  });

  return { ok: true, state: getRoomState(room.code, playerId)! };
}

export function updateSettings(
  code: string,
  playerId: string,
  patch: Partial<GameSettings>
): { ok: true; state: RoomState } | { ok: false; error: string } {
  const room = getRooms().get(code.toUpperCase());
  if (!room) return { ok: false, error: "ROOM_NOT_FOUND" };
  tickRoom(room);
  const player = room.players.get(playerId);
  if (!player?.isHost) return { ok: false, error: "HOST_ONLY_SETTINGS" };
  if (room.phase !== "lobby") return { ok: false, error: "TOO_LATE" };

  applySettingsPatch(room, patch);
  return { ok: true, state: getRoomState(room.code, playerId)! };
}

export function startSolo(
  hostId: string,
  hostName: string,
  settingsPatch: Partial<GameSettings>
): { ok: true; state: RoomState } | { ok: false; error: string } {
  const state = createRoom(hostId, hostName, { solo: true });
  const room = getRooms().get(state.code)!;
  applySettingsPatch(room, settingsPatch);
  room.settings.solo = true;
  if (settingsPatch.timePerRound == null) {
    room.settings.timePerRound = 30;
  }
  for (const p of room.players.values()) p.score = 0;
  room.deck = pickRoundPeople(room.settings.rounds);
  room.roundIndex = 0;
  beginRound(room);
  return { ok: true, state: getRoomState(room.code, hostId)! };
}

export function startGame(
  code: string,
  playerId: string
): { ok: true; state: RoomState } | { ok: false; error: string } {
  const room = getRooms().get(code.toUpperCase());
  if (!room) return { ok: false, error: "ROOM_NOT_FOUND" };
  tickRoom(room);
  const player = room.players.get(playerId);
  if (!player?.isHost) return { ok: false, error: "HOST_ONLY_START" };
  if (room.phase !== "lobby" && room.phase !== "finished") {
    return { ok: false, error: "IN_PROGRESS" };
  }

  for (const p of room.players.values()) p.score = 0;
  room.deck = pickRoundPeople(room.settings.rounds);
  room.roundIndex = 0;
  beginRound(room);
  return { ok: true, state: getRoomState(room.code, playerId)! };
}

function pickRoundSeconds(room: Room): number {
  if (room.settings.mode !== "random") return room.settings.timePerRound;
  const min = room.settings.randomTimeMin;
  const max = room.settings.randomTimeMax;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function beginRound(room: Room) {
  room.phase = "playing";
  room.guesses.clear();
  room.urgencyEndsAt = null;
  room.resultEndsAt = null;
  room.currentPerson = room.deck[room.roundIndex];

  const roundSeconds = pickRoundSeconds(room);
  room.endsAt = Date.now() + roundSeconds * 1000;

  if (room.settings.mode === "hardcore") {
    room.flashEndsAt = Date.now() + room.settings.flashSeconds * 1000;
  } else {
    room.flashEndsAt = null;
  }
}

function finishRound(room: Room) {
  room.urgencyEndsAt = null;
  room.endsAt = null;
  room.flashEndsAt = null;
  room.phase = "roundResult";
  room.resultEndsAt = Date.now() + 5000;
}

export function submitGuess(
  code: string,
  playerId: string,
  lat: number,
  lng: number
): { ok: true; state: RoomState } | { ok: false; error: string } {
  const room = getRooms().get(code.toUpperCase());
  if (!room) return { ok: false, error: "ROOM_NOT_FOUND" };
  tickRoom(room);
  if (room.phase !== "playing") return { ok: false, error: "NOT_PLAYING" };
  if (!room.currentPerson) return { ok: false, error: "NO_ROUND" };
  if (!room.players.has(playerId)) return { ok: false, error: "UNKNOWN_PLAYER" };
  if (room.guesses.has(playerId)) return { ok: false, error: "ALREADY_GUESSED" };

  const person = room.currentPerson;
  const distanceKm = haversineKm(lat, lng, person.lat, person.lng);
  const points = scoreFromDistanceKm(distanceKm);

  room.guesses.set(playerId, { playerId, lat, lng, distanceKm, points });
  const player = room.players.get(playerId)!;
  player.score += points;
  player.lastSeen = Date.now();

  const active = [...room.players.values()].filter(
    (p) => p.connected && Date.now() - p.lastSeen < 20_000
  );
  const allGuessed =
    active.length > 0 && active.every((p) => room.guesses.has(p.id));

  if (room.guesses.size === 1 && !allGuessed) {
    room.urgencyEndsAt = Date.now() + room.settings.urgencySeconds * 1000;
  }

  if (allGuessed) {
    finishRound(room);
  }

  return { ok: true, state: getRoomState(room.code, playerId)! };
}
