import { createStellarlightTools } from "../src/ai/stellarlight";

const [name, raw] = process.argv.slice(2);
const tools = createStellarlightTools();
const run = (
  tools as Record<
    string,
    { execute: (i: unknown, o: unknown) => Promise<unknown> }
  >
)[name];
if (!run) {
  console.error(`tools: ${Object.keys(tools).join(", ")}`);
  process.exit(2);
}
const started = Date.now();
const result = await run.execute(JSON.parse(raw ?? "{}"), {
  toolCallId: name,
  messages: [],
});
const text = typeof result === "string" ? result : JSON.stringify(result);
console.log(text);
console.error(`[${Date.now() - started}ms ${text.length} chars]`);
