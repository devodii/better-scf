import Sandbox, { SandboxExecutionQuotaExceededError } from "@nyariv/sandboxjs";
import { z } from "zod";
import { readProposalText } from "../../site/enrich";
import { readFacts } from "../../site/round-facts";
import { readItems, saveItem } from "../scratchpad";
import { defineTool } from "./registry";

const QUOTA = 3_000_000n;
const MAX_RESULT_CHARS = 9000;
const MAX_LOG_CHARS = 1500;

function trackIndex(): {
  tracks: Record<string, string>;
  facts: Record<string, unknown>;
} {
  const tracks: Record<string, string> = {};
  const facts: Record<string, unknown> = {};
  for (const [id, data] of readFacts()) {
    if (data.track) tracks[id] = data.track;
    facts[id] = {
      track: data.track,
      title: data.title,
      status: data.status,
      round: data.round,
      team: data.builders.map((builder) => builder.name),
      people: data.builders,
      text: readProposalText(id),
      awardedBeforeUsd: data.awardedUsd,
      awardedBeforeCount: data.awardedCount,
    };
  }
  return { tracks, facts };
}

export const tool = defineTool({
  name: "run_js",
  description:
    "Runs JavaScript you write to parse, filter, join, count, rank or compare data already fetched. Write a function body that ends with return <JSON value>. Scope: data (saved items, e.g. data.rounds.records), tracks (submission id -> open|integration|rfp for proposals read so far), facts (id -> team, track, funding history), console.log. No network or DOM. Use it for every count, sum or comparison instead of doing arithmetic yourself. Optional save keeps the result as data.<save>.",
  input: z.object({
    code: z.string().trim().min(1).max(8000),
    save: z.string().trim().min(1).max(40).optional(),
  }),
  run: ({ code, save }) => {
    const logs: string[] = [];
    const scope = {
      data: readItems(),
      ...trackIndex(),
      console: {
        log: (...parts: unknown[]) => logs.push(parts.map(String).join(" ")),
      },
    };
    try {
      const result: unknown = new Sandbox({ executionQuota: QUOTA })
        .compile(code)(scope)
        .run();
      if (save) saveItem(save, result);
      const text = JSON.stringify(result) ?? "undefined";
      return {
        ok: true,
        result:
          text.length > MAX_RESULT_CHARS
            ? `${text.slice(0, MAX_RESULT_CHARS)} [truncated]`
            : JSON.parse(text),
        ...(save ? { savedAs: `data.${save}` } : {}),
        ...(logs.length > 0
          ? { logs: logs.join("\n").slice(0, MAX_LOG_CHARS) }
          : {}),
        ...(result === undefined
          ? { note: "The code returned nothing. End it with return <value>." }
          : {}),
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof SandboxExecutionQuotaExceededError
            ? "The code ran for too long. Simplify it."
            : String(error).slice(0, 300),
        hint: "Fix the code and call run_js again. It is a function body: use return, no imports.",
      };
    }
  },
});
