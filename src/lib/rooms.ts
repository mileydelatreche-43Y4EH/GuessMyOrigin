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
  socketId: string;
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
  timers: { round?: ReturnType<typeof setTimeout>; urgency?: ReturnType<typeof setTimeout> };
}

const rooms = new Map<string, Room>();

function code4(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function clearTimers(room: Room) {
  if (room.timers.round) clearTimeout(room.timers.round);
  if (room.timers.urgency) clearTimeout(room.timers.urgency);
  room.timers = {};
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
  return [...room.players.values()]
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      score: p.score,
      hasGuessed: room.guesses.has(p.id),
      isHost: p.isHost,
      connected: p.connected,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function getRoomState(code: string, viewerId?: string): RoomState | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;

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
  socketId: string,
  opts?: { solo?: boolean }
): RoomState {
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
    timers: {},
  };

  room.players.set(hostId, {
    id: hostId,
    name: hostName.trim().slice(0, 16) || (opts?.solo ? "Solo" : "Hôte"),
    color: PLAYER_COLORS[0],
    score: 0,
    isHost: true,
    connected: true,
    socketId,
  });

  rooms.set(code, room);
  return getRoomState(code, hostId)!;
}

export function joinRoom(
  code: string,
  playerId: string,
  name: string,
  socketId: string
): { ok: true; state: RoomState } | { ok: false; error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { ok: false, error: "Salon introuvable" };
  if (room.settings.solo) return { ok: false, error: "Partie solo — impossible de rejoindre" };
  if (room.phase !== "lobby") return { ok: false, error: "Partie déjà commencée" };
  if (room.players.size >= 10) return { ok: false, error: "Salon plein (max 10)" };

  if (room.players.has(playerId)) {
    const p = room.players.get(playerId)!;
    p.connected = true;
    p.socketId = socketId;
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
    socketId,
  });

  return { ok: true, state: getRoomState(room.code, playerId)! };
}

export function updateSettings(
  code: string,
  playerId: string,
  patch: Partial<GameSettings>
): { ok: true; state: RoomState } | { ok: false; error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { ok: false, error: "Salon introuvable" };
  const player = room.players.get(playerId);
  if (!player?.isHost) return { ok: false, error: "Seul l'hôte peut changer les réglages" };
  if (room.phase !== "lobby") return { ok: false, error: "Trop tard" };

  applySettingsPatch(room, patch);
  return { ok: true, state: getRoomState(room.code, playerId)! };
}

type Broadcast = (code: string) => void;

/** Crée une partie solo et la lance tout de suite */
export function startSolo(
  hostId: string,
  hostName: string,
  socketId: string,
  settingsPatch: Partial<GameSettings>,
  broadcast: Broadcast,
  onRoundEnd: (code: string) => void
): { ok: true; state: RoomState } | { ok: false; error: string } {
  const state = createRoom(hostId, hostName, socketId, { solo: true });
  const room = rooms.get(state.code)!;
  applySettingsPatch(room, settingsPatch);
  room.settings.solo = true;
  if (settingsPatch.timePerRound == null) {
    room.settings.timePerRound = 30;
  }
  for (const p of room.players.values()) p.score = 0;
  room.deck = pickRoundPeople(room.settings.rounds);
  room.roundIndex = 0;
  beginRound(room, broadcast, onRoundEnd);
  return { ok: true, state: getRoomState(room.code, hostId)! };
}

export function startGame(
  code: string,
  playerId: string,
  broadcast: Broadcast,
  onRoundEnd: (code: string) => void
): { ok: true; state: RoomState } | { ok: false; error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { ok: false, error: "Salon introuvable" };
  const player = room.players.get(playerId);
  if (!player?.isHost) return { ok: false, error: "Seul l'hôte peut démarrer" };
  if (room.phase !== "lobby" && room.phase !== "finished") {
    return { ok: false, error: "Partie en cours" };
  }

  for (const p of room.players.values()) p.score = 0;
  room.deck = pickRoundPeople(room.settings.rounds);
  room.roundIndex = 0;
  beginRound(room, broadcast, onRoundEnd);
  return { ok: true, state: getRoomState(room.code, playerId)! };
}

function pickRoundSeconds(room: Room): number {
  if (room.settings.mode !== "random") return room.settings.timePerRound;
  const min = room.settings.randomTimeMin;
  const max = room.settings.randomTimeMax;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function beginRound(room: Room, broadcast: Broadcast, onRoundEnd: (code: string) => void) {
  clearTimers(room);
  room.phase = "playing";
  room.guesses.clear();
  room.urgencyEndsAt = null;
  room.currentPerson = room.deck[room.roundIndex];

  const roundSeconds = pickRoundSeconds(room);
  room.endsAt = Date.now() + roundSeconds * 1000;

  if (room.settings.mode === "hardcore") {
    room.flashEndsAt = Date.now() + room.settings.flashSeconds * 1000;
  } else {
    room.flashEndsAt = null;
  }

  room.timers.round = setTimeout(() => {
    finishRound(room, broadcast, onRoundEnd);
  }, roundSeconds * 1000);

  broadcast(room.code);
}

function finishRound(room: Room, broadcast: Broadcast, onRoundEnd: (code: string) => void) {
  clearTimers(room);
  room.urgencyEndsAt = null;
  room.endsAt = null;
  room.flashEndsAt = null;
  room.phase = "roundResult";
  broadcast(room.code);
  onRoundEnd(room.code);

  room.timers.round = setTimeout(() => {
    room.roundIndex += 1;
    if (room.roundIndex >= room.settings.rounds) {
      room.phase = "finished";
      room.currentPerson = room.currentPerson; // keep last for display
      broadcast(room.code);
      return;
    }
    beginRound(room, broadcast, onRoundEnd);
  }, 5000);
}

export function submitGuess(
  code: string,
  playerId: string,
  lat: number,
  lng: number,
  broadcast: Broadcast,
  onUrgency: (code: string) => void,
  onRoundEnd: (code: string) => void
): { ok: true; state: RoomState } | { ok: false; error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { ok: false, error: "Salon introuvable" };
  if (room.phase !== "playing") return { ok: false, error: "Pas en jeu" };
  if (!room.currentPerson) return { ok: false, error: "Pas de manche" };
  if (!room.players.has(playerId)) return { ok: false, error: "Joueur inconnu" };
  if (room.guesses.has(playerId)) return { ok: false, error: "Déjà deviné" };

  const person = room.currentPerson;
  const distanceKm = haversineKm(lat, lng, person.lat, person.lng);
  const points = scoreFromDistanceKm(distanceKm);

  room.guesses.set(playerId, { playerId, lat, lng, distanceKm, points });
  const player = room.players.get(playerId)!;
  player.score += points;

  const connected = [...room.players.values()].filter((p) => p.connected);
  const allGuessed = connected.every((p) => room.guesses.has(p.id));

  if (room.guesses.size === 1 && !allGuessed) {
    room.urgencyEndsAt = Date.now() + room.settings.urgencySeconds * 1000;
    if (room.timers.round) clearTimeout(room.timers.round);
    room.timers.urgency = setTimeout(() => {
      finishRound(room, broadcast, onRoundEnd);
    }, room.settings.urgencySeconds * 1000);
    onUrgency(room.code);
  }

  if (allGuessed) {
    finishRound(room, broadcast, onRoundEnd);
  } else {
    broadcast(room.code);
  }

  return { ok: true, state: getRoomState(room.code, playerId)! };
}

export function disconnectPlayer(socketId: string, broadcast: Broadcast) {
  for (const room of rooms.values()) {
    for (const p of room.players.values()) {
      if (p.socketId === socketId) {
        p.connected = false;
        broadcast(room.code);
        return;
      }
    }
  }
}

export function findPlayerBySocket(socketId: string): { code: string; playerId: string } | null {
  for (const room of rooms.values()) {
    for (const p of room.players.values()) {
      if (p.socketId === socketId) return { code: room.code, playerId: p.id };
    }
  }
  return null;
}

export function rebindSocket(code: string, playerId: string, socketId: string): RoomState | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  const p = room.players.get(playerId);
  if (!p) return null;
  p.socketId = socketId;
  p.connected = true;
  return getRoomState(room.code, playerId);
}
