import { mkdirSync, writeFileSync } from "node:fs";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import { CHAT_LIMITS } from "shared";
import { buildContextBlock, SYSTEM_PROMPT } from "../src/ai/prompts";
import { createStellarlightTools } from "../src/ai/stellarlight";
import { CASES, type EvalCase } from "./cases";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY is required (run with --env-file=.env).");
  process.exit(2);
}

const provider = createAnthropic({ apiKey });
const model = provider(process.env.MODEL ?? "claude-sonnet-5-5");
const judge = provider(process.env.JUDGE_MODEL ?? "claude-haiku-5-5");
const threshold = Number(process.env.EVAL_THRESHOLD ?? "0.9");
const concurrency = Number(process.env.EVAL_CONCURRENCY ?? "4");
const only = process.argv
  .find((arg) => arg.startsWith("--only="))
  ?.slice(7)
  .split(",");

const tools = createStellarlightTools();

interface Outcome {
  id: string;
  group: string;
  pass: boolean;
  problems: string[];
  calls: string[];
  toolErrors: number;
  steps: number;
  tokens: number;
  ms: number;
  answer: string;
  evidenceChars: number;
}

const outputOf = (value: unknown): string =>
  typeof value === "string" ? value : (JSON.stringify(value) ?? "");

const FAILED_CALL =
  /^(Stellarlight answered [45]|Stellarlight did not answer|Unknown Stellarlight|A required argument)|"found":false,"error"/;

async function grade(
  item: EvalCase,
  answer: string,
  evidence: string,
  usedTools: boolean,
): Promise<string[]> {
  const asks = [
    usedTools
      ? "grounded: true only if every concrete fact in the answer (names, numbers, repos, links) appears in the tool results or the page context. Facts the assistant states from general knowledge about Stellar ecosystem data count as not grounded."
      : "grounded: true.",
    item.rubric
      ? `rubricMet: true only if the answer satisfies this rubric: ${item.rubric}`
      : "rubricMet: true.",
  ].join("\n");
  const { text } = await generateText({
    model: judge,
    maxOutputTokens: 1500,
    prompt: `You grade an AI assistant's answer. A link of the form https://stellarlight.xyz/builders/<githubUsername> is acceptable when that username appears in the results, and saying that data comes from Stellarlight is attribution, not a claim to verify. Reply with one JSON object only and nothing else: {"grounded": boolean, "rubricMet": boolean, "reason": string}. Keep reason under 25 words.\n${asks}\n\nQUESTION:\n${item.question}\n\nPAGE CONTEXT:\n${item.page?.context ?? "none"}\n\nTOOL RESULTS (may be cut):\n${evidence.slice(0, 150000) || "none"}\n\nANSWER:\n${answer}`,
  });
  try {
    const parsed = JSON.parse(
      text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
    ) as {
      grounded?: boolean;
      rubricMet?: boolean;
      reason?: string;
    };
    const problems: string[] = [];
    if (parsed.grounded === false)
      problems.push(`not grounded: ${parsed.reason ?? ""}`);
    if (parsed.rubricMet === false)
      problems.push(`rubric: ${parsed.reason ?? ""}`);
    return problems;
  } catch {
    return [`judge reply was not JSON: ${text.slice(0, 80)}`];
  }
}

async function run(item: EvalCase): Promise<Outcome> {
  const started = Date.now();
  const problems: string[] = [];
  let calls: string[] = [];
  let outputs: string[] = [];
  let answer = "";
  let steps = 0;
  let tokens = 0;
  try {
    const result = await generateText({
      model,
      instructions: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "system",
          content: buildContextBlock(
            item.page?.context ?? "No page context.",
            item.page?.kind ?? "other",
          ),
        },
      ],
      messages: [{ role: "user", content: item.question }],
      tools,
      stopWhen: stepCountIs(CHAT_LIMITS.maxSteps),
      maxOutputTokens: 3500,
    });
    answer = result.text.trim();
    steps = result.steps.length;
    tokens =
      (result.totalUsage.inputTokens ?? 0) +
      (result.totalUsage.outputTokens ?? 0);
    for (const step of result.steps) {
      for (const call of step.toolCalls) {
        const input = call.input as { tool?: string };
        calls.push(
          call.toolName === "stellarlight"
            ? `stellarlight:${input.tool ?? "?"}`
            : call.toolName,
        );
      }
      for (const output of step.toolResults)
        outputs.push(outputOf(output.output));
    }
  } catch (error) {
    problems.push(`run failed: ${String(error).slice(0, 160)}`);
  }
  calls = calls.slice();
  outputs = outputs.slice();

  if (answer === "" && problems.length === 0) problems.push("empty answer");
  if (item.noTools && calls.length > 0)
    problems.push(`used tools on an off-topic question: ${calls.join(", ")}`);
  for (const wanted of item.allOf ?? [])
    if (!calls.includes(wanted)) problems.push(`never called ${wanted}`);
  if (
    item.anyOf &&
    item.anyOf.length > 0 &&
    !item.anyOf.some((name) => calls.includes(name))
  )
    problems.push(
      `called none of ${item.anyOf.join(" | ")} (called: ${calls.join(", ") || "nothing"})`,
    );
  for (const pattern of item.include ?? [])
    if (!pattern.test(answer)) problems.push(`answer lacks ${pattern}`);
  for (const pattern of item.exclude ?? [])
    if (pattern.test(answer)) problems.push(`answer contains ${pattern}`);
  const toolErrors = outputs.filter((output) =>
    FAILED_CALL.test(output),
  ).length;
  if (answer !== "" && (outputs.length > 0 || item.rubric)) {
    try {
      problems.push(
        ...(await grade(
          item,
          answer,
          outputs.join("\n---\n"),
          outputs.length > 0,
        )),
      );
    } catch (error) {
      problems.push(`judge failed: ${String(error).slice(0, 100)}`);
    }
  }
  return {
    id: item.id,
    group: item.group,
    pass: problems.length === 0,
    problems,
    calls,
    toolErrors,
    steps,
    tokens,
    ms: Date.now() - started,
    answer,
    evidenceChars: outputs.join("").length,
  };
}

const selected = CASES.filter(
  (item) => !only || only.includes(item.id) || only.includes(item.group),
);
const queue = [...selected];
const outcomes: Outcome[] = [];
const worker = async (): Promise<void> => {
  for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
    const outcome = await run(item);
    outcomes.push(outcome);
    console.log(
      `${outcome.pass ? "PASS" : "FAIL"} ${outcome.id.padEnd(34)} ${String(outcome.steps).padStart(2)} steps ${String(Math.round(outcome.ms / 1000)).padStart(3)}s  ${outcome.calls.join(", ") || "no tools"}${outcome.toolErrors > 0 ? `  (${outcome.toolErrors} tool errors)` : ""}`,
    );
    for (const problem of outcome.problems) console.log(`       - ${problem}`);
  }
};
await Promise.all(Array.from({ length: concurrency }, () => worker()));

const passed = outcomes.filter((outcome) => outcome.pass).length;
const byGroup = new Map<string, { pass: number; total: number }>();
for (const outcome of outcomes) {
  const entry = byGroup.get(outcome.group) ?? { pass: 0, total: 0 };
  entry.total += 1;
  if (outcome.pass) entry.pass += 1;
  byGroup.set(outcome.group, entry);
}
console.log("\nBy group:");
for (const [group, { pass, total }] of [...byGroup].sort())
  console.log(`  ${group.padEnd(11)} ${pass}/${total}`);
const rate = outcomes.length === 0 ? 0 : passed / outcomes.length;
const tokens = outcomes.reduce((sum, outcome) => sum + outcome.tokens, 0);
console.log(
  `\n${passed}/${outcomes.length} passed (${Math.round(rate * 100)}%), ${tokens} tokens, ${outcomes.reduce((sum, outcome) => sum + outcome.toolErrors, 0)} tool errors`,
);

mkdirSync("evals/results", { recursive: true });
const file = `evals/results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(
  file,
  JSON.stringify(
    {
      model: process.env.MODEL ?? "claude-sonnet-5-5",
      rate,
      outcomes: outcomes.sort((a, b) => a.id.localeCompare(b.id)),
    },
    null,
    1,
  ),
);
console.log(`Saved ${file}`);
process.exit(rate >= threshold ? 0 : 1);
