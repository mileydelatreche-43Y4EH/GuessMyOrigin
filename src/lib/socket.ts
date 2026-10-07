"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "";
  const key = "origine_player_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
