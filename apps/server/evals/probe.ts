import {
  createStellarlightTools,
  STELLARLIGHT_TOOL_NAMES,
} from "../src/ai/stellarlight";

type Args = Record<string, unknown>;

const tools = createStellarlightTools();

const call = async (name: string, args: Args): Promise<string> => {
  const run = tools.stellarlight.execute as unknown as (
    input: { tool: string; args: Args },
    options: { toolCallId: string; messages: never[] },
  ) => Promise<unknown>;
  const result = await run(
    { tool: name, args },
    { toolCallId: name, messages: [] },
  );
  return typeof result === "string" ? result : JSON.stringify(result);
};

const FAILURE =
  /^(Stellarlight answered|Stellarlight did not answer|Unknown Stellarlight|A required argument)/;

const json = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const firstOf = (value: unknown, keys: string[]): unknown => {
  if (Array.isArray(value)) return value[0];
  if (typeof value !== "object" || value === null) return undefined;
  for (const key of keys) {
    const inner: unknown = Reflect.get(value, key);
    if (Array.isArray(inner)) return inner[0];
  }
  return undefined;
};

const pick = (row: unknown, keys: string[]): string | undefined => {
  if (typeof row !== "object" || row === null) return undefined;
  for (const key of keys) {
    const value: unknown = Reflect.get(row, key);
    if (typeof value === "string" && value !== "") return value;
  }
  return undefined;
};

const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);

const hackathons = json(await call("get_hackathons", { limit: 3 }));
const slugs = (
  Array.isArray(hackathons)
    ? hackathons
    : ((hackathons as { hackathons?: unknown[] } | null)?.hackathons ?? [])
)
  .map((row) => pick(row, ["slug"]))
  .filter((slug): slug is string => slug !== undefined);
const builds = json(
  await call("search_hackathon_builds", { q: "wallet", limit: 3 }),
);
const build = firstOf(builds, ["builds", "results", "submissions", "items"]);
const partners = json(await call("get_partners", { limit: 3 }));
const partner = firstOf(partners, ["partners", "results", "items"]);
const skills = json(await call("list_skills", {}));
const skill = firstOf(skills, ["skills", "results", "items"]);
const skillName =
  pick(skill, ["name", "slug", "id"]) ??
  /"name":\s*"([^"]+)"/.exec(JSON.stringify(skills))?.[1] ??
  "";

const SAMPLES: Record<string, Args> = {
  get_builders: { limit: 3 },
  get_people: { limit: 3 },
  search_projects: { q: "anchor", limit: 3 },
  search_repos: { q: "soroban", limit: 3 },
  explain_repo: { q: "how does a token contract handle transfers" },
  locate_source: { q: "transfer" },
  get_hackathons: { limit: 3 },
  get_hackathon: { slug: slugs[0] ?? "" },
  compare_hackathons: { slugs: slugs.slice(0, 2) },
  search_hackathon_builds: { q: "wallet", limit: 3 },
  get_hackathon_submission: { id: pick(build, ["id", "slug"]) ?? "" },
  analyze_hackathon_submissions: { facet: "track", top: 5 },
  review_submission: {
    link:
      pick(build, ["repoUrl", "githubUrl", "url", "link"]) ??
      "https://github.com/stellar/soroban-examples",
  },
  get_audits: { limit: 3 },
  search_research: { query: "SEP-10 authentication", limit: 3 },
  get_rfps: { limit: 3 },
  get_partners: { limit: 3 },
  get_leaderboard: { limit: 3 },
  get_clusters: {},
  analyze_ecosystem: { dimension: "funding" },
  vet_idea: { q: "stablecoin payroll for contractors" },
  hackathon_brief: { q: "remittance wallet" },
  scf_pitch: { q: "payments" },
  list_skills: {},
  get_skill: { name: skillName },
  get_changelog: { limit: 3 },
  get_stablecoins: { limit: 3 },
  get_rwa: { limit: 3 },
  get_contracts: { limit: 3 },
  get_lifecycle: {},
  verify_claim: { type: "audited", subject: "Soroswap" },
  get_xlm_price: {},
  get_changes: { since },
  repo_trust: { repo: "stellar/js-stellar-sdk" },
  resolve_project: { q: "Soroswap" },
  get_partner: { slug: pick(partner, ["slug", "id"]) ?? "" },
  match_partners: { need: "a fiat on-ramp in Brazil", limit: 3 },
  get_quality: {},
  get_status: {},
};

const rows: string[] = [];
let failed = 0;
const names = [...STELLARLIGHT_TOOL_NAMES];
const untested = names.filter((name) => !(name in SAMPLES));
const orphan = Object.keys(SAMPLES).filter((name) => !names.includes(name));

const queue = [...names.filter((name) => name in SAMPLES)];
const worker = async (): Promise<void> => {
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    const started = Date.now();
    let note = "";
    let ok = false;
    try {
      const out = await call(name, SAMPLES[name] ?? {});
      const parsed = json(out.replace(/\n\[cut:.*$/s, ""));
      const cut = out.includes("[cut:");
      ok =
        !FAILURE.test(out) &&
        out.trim() !== "" &&
        out.trim() !== "[]" &&
        out.trim() !== "{}";
      note = ok
        ? `${out.length} chars${parsed === null ? ", not JSON" : ""}${cut ? ", cut" : ""}`
        : out.slice(0, 140);
    } catch (error) {
      note = `threw ${String(error).slice(0, 100)}`;
    }
    if (!ok) failed += 1;
    rows.push(
      `${ok ? "ok  " : "FAIL"} ${name.padEnd(30)} ${String(Date.now() - started).padStart(5)}ms  ${note}`,
    );
  }
};
await Promise.all([worker(), worker(), worker()]);

const finder = tools.find_builder.execute as unknown as (
  input: { handle?: string; query?: string },
  options: { toolCallId: string; messages: never[] },
) => Promise<{ found?: boolean }>;
const known = await finder(
  { handle: "stellar" },
  { toolCallId: "f", messages: [] },
);
const missing = await finder(
  { handle: "zzzz-not-a-real-user-1234" },
  { toolCallId: "f", messages: [] },
);
rows.push(
  `${known.found !== undefined && missing.found === false ? "ok  " : "FAIL"} find_builder (handle and not-found paths) ${known.found} / ${missing.found}`,
);
if (!(known.found !== undefined && missing.found === false)) failed += 1;

console.log(rows.sort().join("\n"));
if (untested.length > 0) console.log(`\nNo sample for: ${untested.join(", ")}`);
if (orphan.length > 0)
  console.log(`\nSample for unknown tool: ${orphan.join(", ")}`);
console.log(`\n${rows.length - failed} of ${rows.length} reachable`);
process.exit(failed > 0 || untested.length > 0 || orphan.length > 0 ? 1 : 0);
