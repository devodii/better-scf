import { Hono } from "hono";
import { chatError } from "shared";
import { builderHandles } from "../ai/builder-handles.js";

export function createStellarlightRoute(): Hono {
  builderHandles().catch(() => undefined);
  return new Hono().get("/handles", async (c) => {
    try {
      const { handles, at } = await builderHandles();
      c.header("Cache-Control", "private, max-age=600");
      return c.json({ handles, updatedAt: at });
    } catch {
      return c.json(
        chatError("internal", "Stellarlight is not reachable right now."),
        502,
      );
    }
  });
}
