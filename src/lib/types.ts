export type GamePhase = "lobby" | "playing" | "roundResult" | "finished";

export interface Person {
  id: string;
  name: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  imageUrl: string;
}

export type GameMode = "standard" | "hardcore" | "random";

export interface GameSettings {
  solo: boolean;
  mode: GameMode;
  rounds: number;
  timePerRound: number;
  urgencySeconds: number;
  /** Hardcore : durée d'apparition du visage (0.1 → 5 s) */
  flashSeconds: number;
  /** Mode random : bornes du temps de manche (s) */
  randomTimeMin: number;
  randomTimeMax: number;
  /** Solo : secondes restantes avant animation urgence (comme duel) */
  soloUrgencyAt: number;
}

export interface PlayerPublic {
  id: string;
  name: string;
  color: string;
  score: number;
  hasGuessed: boolean;
  isHost: boolean;
  connected: boolean;
}

export interface GuessResult {
  playerId: string;
  playerName: string;
  color: string;
  lat: number;
  lng: number;
  distanceKm: number;
  points: number;
}

export interface RoundState {
  index: number;
  total: number;
  person: Omit<Person, "lat" | "lng" | "country" | "city"> & {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  endsAt: number | null;
  urgencyEndsAt: number | null;
  /** Hardcore : fin du flash visage */
  flashEndsAt: number | null;
  guesses: GuessResult[];
  revealed: boolean;
}

export interface RoomState {
  code: string;
  phase: GamePhase;
  settings: GameSettings;
  players: PlayerPublic[];
  round: RoundState | null;
  you: {
    id: string;
    hasGuessed: boolean;
    lastGuess: GuessResult | null;
  } | null;
}

export const DEFAULT_SETTINGS: GameSettings = {
  solo: false,
  mode: "standard",
  rounds: 10,
  timePerRound: 60,
  urgencySeconds: 10,
  flashSeconds: 1,
  randomTimeMin: 10,
  randomTimeMax: 90,
  soloUrgencyAt: 5,
};

export const SOLO_DEFAULT_SETTINGS: GameSettings = {
  ...DEFAULT_SETTINGS,
  solo: true,
  rounds: 10,
  timePerRound: 30,
  soloUrgencyAt: 5,
};

export const MODE_LABELS: Record<GameMode, { title: string; desc: string }> = {
  standard: {
    title: "Standard",
    desc: "Photo en haut à droite, agrandir & zoomer",
  },
  hardcore: {
    title: "Hardcore",
    desc: "Le visage n’apparaît qu’un instant",
  },
  random: {
    title: "Random",
    desc: "Comme le standard, mais le chrono change à chaque manche",
  },
};

export const PLAYER_COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#5AC8FA",
  "#007AFF",
  "#AF52DE",
  "#FF2D55",
  "#5856D6",
  "#64D2FF",
];
