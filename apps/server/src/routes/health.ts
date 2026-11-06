import { Hono } from "hono";

export interface HealthInfo {
  version: string;
  model: string;
}

export function createHealthRoute(info: HealthInfo) {
  return new Hono().get("/", (c) =>
    c.json({ ok: true, version: info.version, model: info.model }),
  );
}
