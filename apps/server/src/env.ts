import { z } from "zod";

const DEFAULT_MODEL = "claude-sonnet-5-5";

const requiredInt = () =>
  z
    .string({ error: "is required (set it in the environment)" })
    .transform((raw) => Number(raw))
    .pipe(
      z.number({ error: "must be a positive whole number" }).int().positive(),
    );

const intWithDefault = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("production"),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    ALLOWED_EXTENSION_IDS: z
      .string()
      .default("")
      .transform((raw) =>
        raw
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      ),
    PORT: intWithDefault(8787),
    DAILY_CAP_PER_CLIENT: requiredInt(),
    REDIS_URL: z
      .string({ error: "is required (set it in the environment)" })
      .min(1),
    MODEL: z.string().min(1).default(DEFAULT_MODEL),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "test" && value.ANTHROPIC_API_KEY === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["ANTHROPIC_API_KEY"],
        message: "ANTHROPIC_API_KEY is required",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export type EnvResult = { ok: true; env: Env } | { ok: false; message: string };

function parseEnv(source: Record<string, string | undefined>): EnvResult {
  const present: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== "") {
      present[key] = value;
    }
  }
  const result = envSchema.safeParse(present);
  if (result.success) {
    return { ok: true, env: result.data };
  }
  const problems = result.error.issues.map(
    (issue) => `${issue.path.join(".") || "env"}: ${issue.message}`,
  );
  return {
    ok: false,
    message: `Invalid server configuration: ${problems.join("; ")}`,
  };
}

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const result = parseEnv(source);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  return result.env;
}
