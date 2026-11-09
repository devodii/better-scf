import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { chatError } from "shared";
import { type Env, loadEnv } from "./env.js";
import { PINNED_EXTENSION_ID } from "./extension-id.js";
import { client } from "./middleware/client.js";
import { origin } from "./middleware/origin.js";
import { createRateLimit } from "./middleware/ratelimit.js";
import {
  type ChatRouteDeps,
  createChatRoute,
  createModelFactory,
  logChatEntry,
} from "./routes/chat.js";
import { createHealthRoute } from "./routes/health.js";
import { createStellarlightRoute } from "./routes/stellarlight.js";

const SERVER_VERSION = "0.1.0";

interface AppDeps extends Partial<Omit<ChatRouteDeps, "now">> {
  now?: () => number;
}

function createApp(env: Env, deps: AppDeps = {}) {
  const app = new Hono();

  app.route(
    "/health",
    createHealthRoute({ version: SERVER_VERSION, model: env.MODEL }),
  );

  const v1 = new Hono();
  v1.use(
    origin({
      allowedExtensionIds: [
        ...new Set([PINNED_EXTENSION_ID, ...env.ALLOWED_EXTENSION_IDS]),
      ],
      development: env.NODE_ENV === "development",
    }),
  );
  v1.use(client);
  v1.use(
    createRateLimit({
      perClientPerDay: env.DAILY_CAP_PER_CLIENT,
      ...(deps.now ? { now: deps.now } : {}),
    }),
  );
  v1.route(
    "/chat",
    createChatRoute({
      getModel: deps.getModel ?? createModelFactory(env),
      log: deps.log ?? logChatEntry,
      ...(deps.now ? { now: deps.now } : {}),
    }),
  );
  v1.route("/stellarlight", createStellarlightRoute());
  app.route("/v1", v1);

  app.notFound((c) => c.json(chatError("bad_request", "Not found."), 404));

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json(
        chatError("bad_request", "The request could not be handled."),
        err.status,
      );
    }
    console.error(`unhandled error: ${err.name}`);
    return c.json(
      chatError("internal", "Something went wrong. Please try again."),
      500,
    );
  });

  return app;
}

export const app = createApp(loadEnv());
