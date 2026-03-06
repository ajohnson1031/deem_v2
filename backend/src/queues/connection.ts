// src/queues/connection.ts
import type { ConnectionOptions } from "bullmq";
import "../bootstrap/env.ts";

export function getBullMqConnection(): ConnectionOptions {
  const raw = process.env.REDIS_URL ?? "redis://localhost:6379";
  const u = new URL(raw);

  const isTls = u.protocol === "rediss:";

  const dbFromPath = u.pathname?.replace("/", "");
  const db = dbFromPath ? Number(dbFromPath) : undefined;

  const port = u.port ? Number(u.port) : 6379;

  // BullMQ/ioredis uses `username`/`password` if provided
  const username = u.username || undefined;
  const password = u.password || undefined;

  const conn: ConnectionOptions = {
    host: u.hostname,
    port,
    db,
    username,
    password,
  };

  if (isTls) {
    // Minimal TLS config (customize if you need CA/certs)
    (conn as any).tls = {};
  }

  return conn;
}
