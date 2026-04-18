import type { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { redisSub } from "../redis/index.js";
import { config } from "../config.js";

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_thread", (threadId: unknown) => {
      if (typeof threadId === "string" && /^[\w-]{1,100}$/.test(threadId)) {
        socket.join(`thread:${threadId}`);
      }
    });

    socket.on("leave_thread", (threadId: unknown) => {
      if (typeof threadId === "string") {
        socket.leave(`thread:${threadId}`);
      }
    });
  });

  // Subscribe to all thread channels using a Redis pattern subscription
  redisSub.psubscribe("thread:*", (err) => {
    if (err) console.error("Redis psubscribe error:", err);
    else console.log("✓ Subscribed to Redis thread:* channels");
  });

  redisSub.on("pmessage", (_pattern, channel, message) => {
    try {
      const payload = JSON.parse(message) as unknown;
      io.to(channel).emit("thread_update", payload);
    } catch (err) {
      console.error("Failed to parse Redis pub/sub message:", err);
    }
  });

  return io;
}
