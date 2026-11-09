# Stellarlight evals

Two checks for the assistant's Stellarlight integration. Both call the real Stellarlight API; the eval also calls the real model, so it costs tokens (about 1.3M per full run).

## `pnpm --filter server probe`

Runs every Stellarlight tool once through the same code the chat route uses (`createStellarlightTools`) with realistic arguments, and fails if any tool answers an error, returns nothing, or has no sample. Run it after changing `src/ai/stellarlight.ts`, or when Stellarlight ships a new endpoint (its spec is at `https://stellarlight.xyz/api/openapi.json`).

## `pnpm --filter server eval -- --yes`

Needs `ANTHROPIC_API_KEY` in `apps/server/.env`. Each case in `cases.ts` is asked through the production system prompt, context block, tools and step limit, then scored on:

- tool use: `anyOf` (at least one of these tools was called), `allOf`, or `noTools`, as `find_builder` or `stellarlight:<tool>`;
- answer text: `include` and `exclude` patterns;
- a judge model (`JUDGE_MODEL`, default `claude-haiku-5-5`) that sees the question, the page context, every full tool result and the answer, and checks that each concrete fact is grounded in them, plus the optional `rubric`.

It refuses to start without `--yes`, because a full run is about 1.3M tokens of paid model calls. Options: `--only=<case id or group>[,..]`, `EVAL_CONCURRENCY` (default 4), `EVAL_THRESHOLD` (default 0.9, the exit code is 1 below it), `MODEL`. Results are saved to `evals/results/` (gitignored) with every answer and the tool calls.

Add a case by appending to `CASES`. Keep expectations to what a correct answer cannot avoid, and use `rubric` for judgment calls.

## Baseline

After the prompt was rewritten to cover every tool (not only builders): 43 of 65 on the first judged run, 58 to 60 of 65 (89 to 92%) after tightening the prompt. Failures vary a little from run to run. They are mostly the model adding a small claim the results do not state.
