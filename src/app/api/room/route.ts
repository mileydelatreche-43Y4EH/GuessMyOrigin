import { NextRequest, NextResponse } from "next/server";
import {
  createRoom,
  getRoomState,
  joinRoom,
  startGame,
  startSolo,
  submitGuess,
  updateSettings,
} from "@/lib/rooms";
import type { GameSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Action =
  | "create"
  | "join"
  | "solo"
  | "settings"
  | "start"
  | "guess"
  | "state";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const playerId = req.nextUrl.searchParams.get("playerId");
  if (!code || !playerId) {
    return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 400 });
  }
  const state = getRoomState(code, playerId);
  if (!state) {
    return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, state });
}

export async function POST(req: NextRequest) {
  let body: {
    action?: Action;
    playerId?: string;
    name?: string;
    code?: string;
    settings?: Partial<GameSettings>;
    lat?: number;
    lng?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const action = body.action;
  const playerId = body.playerId?.trim();
  if (!action || !playerId) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  switch (action) {
    case "create": {
      const state = createRoom(playerId, body.name || "Hôte");
      return NextResponse.json({ ok: true, state });
    }
    case "solo": {
      const result = startSolo(playerId, body.name || "Solo", body.settings || {});
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "join": {
      if (!body.code) {
        return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 400 });
      }
      const result = joinRoom(body.code, playerId, body.name || "Joueur");
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "settings": {
      if (!body.code) {
        return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 400 });
      }
      const result = updateSettings(body.code, playerId, body.settings || {});
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "start": {
      if (!body.code) {
        return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 400 });
      }
      const result = startGame(body.code, playerId);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "guess": {
      if (!body.code || body.lat == null || body.lng == null) {
        return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
      }
      const result = submitGuess(body.code, playerId, body.lat, body.lng);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "state": {
      if (!body.code) {
        return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 400 });
      }
      const state = getRoomState(body.code, playerId);
      if (!state) {
        return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, state });
    }
    default:
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }
}
