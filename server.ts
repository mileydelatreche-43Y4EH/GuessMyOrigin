import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import {
  createRoom,
  disconnectPlayer,
  getRoomState,
  joinRoom,
  rebindSocket,
  startGame,
  startSolo,
  submitGuess,
  updateSettings,
} from "./src/lib/rooms";
import type { GameSettings } from "./src/lib/types";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const broadcast = (code: string) => {
    const room = io.sockets.adapter.rooms.get(code);
    if (!room) return;
    for (const socketId of room) {
      const sock = io.sockets.sockets.get(socketId);
      const playerId = sock?.data.playerId as string | undefined;
      const state = getRoomState(code, playerId);
      if (state) sock?.emit("state", state);
    }
  };

  const onUrgency = (code: string) => {
    io.to(code).emit("urgency");
    broadcast(code);
  };

  const onRoundEnd = (code: string) => {
    io.to(code).emit("roundEnd");
    broadcast(code);
  };

  io.on("connection", (socket) => {
    socket.on(
      "create",
      (payload: { playerId: string; name: string }, cb?: (r: unknown) => void) => {
        const state = createRoom(payload.playerId, payload.name, socket.id);
        socket.data.playerId = payload.playerId;
        socket.data.code = state.code;
        socket.join(state.code);
        cb?.({ ok: true, state });
        broadcast(state.code);
      }
    );

    socket.on(
      "soloStart",
      (
        payload: {
          playerId: string;
          name: string;
          settings: Partial<GameSettings>;
        },
        cb?: (r: unknown) => void
      ) => {
        const result = startSolo(
          payload.playerId,
          payload.name,
          socket.id,
          payload.settings,
          broadcast,
          onRoundEnd
        );
        if (!result.ok) {
          cb?.(result);
          return;
        }
        socket.data.playerId = payload.playerId;
        socket.data.code = result.state.code;
        socket.join(result.state.code);
        cb?.(result);
        broadcast(result.state.code);
      }
    );

    socket.on(
      "join",
      (
        payload: { code: string; playerId: string; name: string },
        cb?: (r: unknown) => void
      ) => {
        const result = joinRoom(payload.code, payload.playerId, payload.name, socket.id);
        if (!result.ok) {
          cb?.(result);
          return;
        }
        socket.data.playerId = payload.playerId;
        socket.data.code = result.state.code;
        socket.join(result.state.code);
        cb?.(result);
        broadcast(result.state.code);
      }
    );

    socket.on(
      "rejoin",
      (payload: { code: string; playerId: string }, cb?: (r: unknown) => void) => {
        const state = rebindSocket(payload.code, payload.playerId, socket.id);
        if (!state) {
          cb?.({ ok: false, error: "Impossible de rejoindre" });
          return;
        }
        socket.data.playerId = payload.playerId;
        socket.data.code = state.code;
        socket.join(state.code);
        cb?.({ ok: true, state });
        broadcast(state.code);
      }
    );

    socket.on(
      "settings",
      (payload: { code: string; playerId: string; settings: Partial<GameSettings> }, cb?) => {
        const result = updateSettings(payload.code, payload.playerId, payload.settings);
        cb?.(result);
        if (result.ok) broadcast(payload.code.toUpperCase());
      }
    );

    socket.on(
      "start",
      (payload: { code: string; playerId: string }, cb?) => {
        const result = startGame(payload.code, payload.playerId, broadcast, onRoundEnd);
        cb?.(result);
        if (result.ok) broadcast(payload.code.toUpperCase());
      }
    );

    socket.on(
      "guess",
      (
        payload: { code: string; playerId: string; lat: number; lng: number },
        cb?
      ) => {
        const result = submitGuess(
          payload.code,
          payload.playerId,
          payload.lat,
          payload.lng,
          broadcast,
          onUrgency,
          onRoundEnd
        );
        cb?.(result);
      }
    );

    socket.on("disconnect", () => {
      disconnectPlayer(socket.id, broadcast);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Origine prêt sur http://localhost:${port}`);
  });
});
