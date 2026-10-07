"use client";

import type { GameSettings, RoomState } from "./types";

type ApiResult = { ok: boolean; state?: RoomState; error?: string };

async function post(body: Record<string, unknown>): Promise<ApiResult> {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try {
    return (await res.json()) as ApiResult;
  } catch {
    return { ok: false, error: "BAD_REQUEST" };
  }
}

export async function apiCreate(playerId: string, name: string) {
  return post({ action: "create", playerId, name });
}

export async function apiJoin(code: string, playerId: string, name: string) {
  return post({ action: "join", code, playerId, name });
}

export async function apiSolo(
  playerId: string,
  name: string,
  settings: Partial<GameSettings>
) {
  return post({ action: "solo", playerId, name, settings });
}

export async function apiSettings(
  code: string,
  playerId: string,
  settings: Partial<GameSettings>
) {
  return post({ action: "settings", code, playerId, settings });
}

export async function apiStart(code: string, playerId: string) {
  return post({ action: "start", code, playerId });
}

export async function apiGuess(
  code: string,
  playerId: string,
  lat: number,
  lng: number
) {
  return post({ action: "guess", code, playerId, lat, lng });
}

export async function apiState(code: string, playerId: string) {
  const res = await fetch(
    `/api/room?code=${encodeURIComponent(code)}&playerId=${encodeURIComponent(playerId)}`,
    { cache: "no-store" }
  );
  try {
    return (await res.json()) as ApiResult;
  } catch {
    return { ok: false, error: "BAD_REQUEST" };
  }
}

export function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "";
  const key = "guessmyorigin_player_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
