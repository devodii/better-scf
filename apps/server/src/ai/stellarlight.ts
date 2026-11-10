import { tool } from "ai";
import { z } from "zod";

const BASE = "https://stellarlight.xyz";
const TIMEOUT_MS = 12_000;
const MAX_CHARS = 8_000;
const CACHE_MS = 10 * 60_000;
const CACHE_LIMIT = 200;
const USER_AGENT = "better-scf-server";
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const ARG_KEY = /^[A-Za-z]{1,20}$/;

interface Endpoint {
  summary: string;
  path: (args: Record<string, unknown>) => string | null;
  pathKey?: string;
  method?: "GET" | "POST";
  body?: (args: Record<string, unknown>) => unknown;
}

const text = (args: Record<string, unknown>, key: string): string | null => {
  const value = args[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
};

const slug = (key: string, route: string) => ({
  pathKey: key,
  path: (args: Record<string, unknown>) => {
    const value = text(args, key);
    return value === null ? null : `${route}/${encodeURIComponent(value)}`;
  },
});

const get = (summary: string, route: string): Endpoint => ({
  summary,
  path: () => route,
});

const ENDPOINTS: Record<string, Endpoint> = {
  get_builders: get(
    "get_builders(q?, location?, skill?, limit?, offset?): the people directory with bio, role and shipped projects. For one named person prefer find_builder",
    "/api/builders",
  ),
  get_people: get(
    "get_people(q?, section?, limit?, offset?): Stellar Development Foundation leadership, board and advisors",
    "/api/people",
  ),
  search_projects: get(
    "search_projects(q?, category?: Infrastructure|Tooling|User-Facing App|Asset|Protocol/Contract|Anchor|Partner Integration, type?: Wallet|DEX|Lending|Bridge|Payments|Anchor|SDK|Indexer|Explorer|Analytics|AI|Gaming|Education|Security|NFT|RWA|Stablecoin|Oracle|Yield|..., scfAwarded?, status?, limit?, offset?): the project directory: what has been built, by whom, with which SCF funding",
    "/api/projects/search",
  ),
  search_repos: get(
    "search_repos(q?, language?, activity?: active|maintained|dormant|archived|unknown, minScore?, limit?, offset?, view?: full|compact): indexed GitHub repos scored for depth, freshness and traction",
    "/api/repos/search",
  ),
  explain_repo: get(
    "explain_repo(q!, repo?: owner/name): slow (10s or more) and often times out; prefer locate_source for where something is defined, use this only for a narrow question about one named repo",
    "/api/repos/explain",
  ),
  locate_source: get(
    "locate_source(q!, repo?: stellar/stellar-core|stellar/rs-soroban-sdk|stellar/rs-soroban-env|stellar/js-stellar-sdk|stellar/stellar-rpc|stellar/stellar-cli|stellar/soroban-examples|OpenZeppelin/stellar-contracts|..., kind?: file|symbol|heading, page?): where something is defined in the Stellar core source repos",
    "/api/sources/locate",
  ),
  get_hackathons: get(
    "get_hackathons(status?: upcoming|active|completed, organizer?, q?, source?: curated|dorahacks, limit?): Stellar hackathon events, most recent first, without winners (call get_hackathon(slug) for winners)",
    "/api/hackathons",
  ),
  get_hackathon: {
    summary:
      "get_hackathon(slug!): one hackathon with every submission, placement and prize",
    ...slug("slug", "/api/hackathons"),
  },
  compare_hackathons: {
    summary:
      "compare_hackathons(slugs![2-5 slugs]): side by side comparison of hackathons; slugs come from get_hackathons",
    method: "POST",
    path: () => "/api/hackathons/compare",
    body: (args) => ({ slugs: Array.isArray(args.slugs) ? args.slugs : [] }),
  },
  search_hackathon_builds: get(
    "search_hackathon_builds(q?, mode?: keyword|meaning|hybrid, winnersOnly?, hackathon?, track?, category?, package?, limit?, offset?): prior art across hackathon prototypes",
    "/api/hackathons/builds",
  ),
  get_hackathon_submission: {
    summary: "get_hackathon_submission(id!): one hackathon submission in full",
    ...slug("id", "/api/hackathons/builds"),
  },
  analyze_hackathon_submissions: get(
    "analyze_hackathon_submissions(facet?: category|package|library|activity|project|projectStatus|scf|placement|track|event|year, by?: event|year|placement|track, value?, top?, q?, mode?, winnersOnly?, hackathon?, track?, category?, package?): counts across hackathon submissions",
    "/api/hackathons/analyze",
  ),
  review_submission: get(
    "review_submission(link!, hackathon?): facts about one hackathon submission from its repo or DoraHacks link",
    "/api/hackathons/review",
  ),
  get_audits: get(
    "get_audits(project?, auditor?, q?, since?, limit?, offset?): Stellar security audit reports",
    "/api/audits",
  ),
  search_research: get(
    "search_research(q! or query!, source?: sdf-blog|scf-handbook|sep|cap|dev-docs|paper|scf-proposal|repo-docs|audit|incident|security-program|sdf-org|release, auditor?, protocol?, severity?: critical|high|medium|low|informational, limit?): semantic search over SDF blog, SCF handbook, SEPs, CAPs, docs, audits and incidents",
    "/api/research",
  ),
  get_rfps: get(
    "get_rfps(status?: open|closed, quarter?, q?, category?, limit?, offset?): curated Stellar RFPs",
    "/api/rfps",
  ),
  get_partners: get(
    "get_partners(type?: anchor|on-off-ramp|infrastructure|tooling|protocol|wallet|audit-firm|legal|agency|asset-issuer|other, sector?, region?: global|north-america|latam|europe|africa|mena|asia|oceania, ramps?, accepting?: 1|0, q?, limit?): audit firms, anchors, ramps, infrastructure, wallets and other partners",
    "/api/partners",
  ),
  get_partner: {
    summary: "get_partner(slug!): one partner in full",
    ...slug("slug", "/api/partners"),
  },
  match_partners: {
    summary:
      "match_partners(need!, type?, sector?, region?, limit?): partners that fit a plain language need, for example 'a fiat on-ramp in Brazil'",
    method: "POST",
    path: () => "/api/partners/match",
    body: (args) => ({
      need: text(args, "need") ?? "",
      ...(text(args, "type") ? { type: text(args, "type") } : {}),
      ...(text(args, "sector") ? { sector: text(args, "sector") } : {}),
      ...(text(args, "region") ? { region: text(args, "region") } : {}),
      ...(typeof args.limit === "number" ? { limit: args.limit } : {}),
    }),
  },
  get_leaderboard: get(
    "get_leaderboard(sort?: activity|stars|issues|tvl|supply, range?: 7d|30d|90d|1y|all, category?, type?, limit?): ranked active projects with GitHub rollups and developer counts",
    "/api/leaderboard",
  ),
  get_clusters: get(
    "get_clusters(dimension?: category|types, minSize?): topic clusters scored on how crowded they are",
    "/api/clusters",
  ),
  analyze_ecosystem: get(
    "analyze_ecosystem(dimension?: all|hackathons|categories|funding|tvl|gaps|developers|toolchain): ecosystem totals, SCF funding per round, TVL, gaps and developer counts",
    "/api/analyze",
  ),
  vet_idea: get(
    "vet_idea(q!): competitors, maturity and prior art for an idea on Stellar (not for hackathon questions, hackathon_brief already includes it)",
    "/api/vet-idea",
  ),
  hackathon_brief: get(
    "hackathon_brief(q!): large result: vet view, winners, starter repos and contracts for an idea. Do not also call vet_idea",
    "/api/hackathon-brief",
  ),
  scf_pitch: get(
    "scf_pitch(q!): live SCF round state, funded projects in the vertical and pitch angles",
    "/api/scf-pitch",
  ),
  list_skills: get(
    "list_skills(q?, source?: sdf|stellarlight|lumenloop|external|community, kind?: skill-md|mcp-server|sdk|cli|agent-kit|tool): installable Stellar AI skills and tools",
    "/api/skills",
  ),
  get_skill: {
    summary: "get_skill(name!): one skill in full",
    ...slug("name", "/api/skills"),
  },
  get_changelog: get(
    "get_changelog(since?, limit?): changes to the Stellarlight API itself",
    "/api/changelog",
  ),
  get_stablecoins: get(
    "get_stablecoins(sort?: marketcap|supply|holders|volume, peg?, assetType?, limit?): stablecoins on Stellar with supply, issuers and market data. Supply can be unmeasured (counts.byBasis), say so instead of ranking by it",
    "/api/stablecoins",
  ),
  get_rwa: get(
    "get_rwa(state?: live|issued-single-holder|deployed-no-supply|not-found, level?, kind?: classic|soroban, project?, limit?): registry of tokenized real-world assets on Stellar",
    "/api/rwa",
  ),
  get_contracts: get(
    "get_contracts(q?, domain?: defi-lending|defi-amm|defi-yield|oracle|payments-x402|wallet-infra|anchor-ramp|indexer, limit?, offset?): verified mainnet contracts grouped by what they do",
    "/api/contracts",
  ),
  get_lifecycle: get(
    "get_lifecycle(): counts of directory projects by launch state (launched, marked live, no activity data) plus names newly launched or newly inactive. There is no abandoned count",
    "/api/lifecycle",
  ),
  verify_claim: get(
    "verify_claim(type!: audited|live|maintained|issued, subject!, auditor?, since?): checks a claim against indexed evidence, for example whether a project was audited",
    "/api/verify",
  ),
  get_xlm_price: get(
    "get_xlm_price(): current XLM price, volume and market cap",
    "/api/xlm-price",
  ),
  get_changes: get(
    "get_changes(since!: ISO date, surfaces?, limit?): what changed in the directory since a date",
    "/api/changes",
  ),
  repo_trust: get(
    "repo_trust(repo!: owner/name): trust summary for one repo; take the repo from a project or builder record, never guess it",
    "/api/repos/trust",
  ),
  resolve_project: get(
    "resolve_project(q!): resolves a project name, slug or URL to its directory record",
    "/api/projects/resolve",
  ),
  get_quality: get(
    "get_quality(): how complete and fresh the Stellarlight data is, per source",
    "/api/quality",
  ),
  get_status: get(
    "get_status(): freshness and size of each data source",
    "/api/status",
  ),
};

const NAMES = Object.keys(ENDPOINTS) as [string, ...string[]];

export const STELLARLIGHT_TOOL_NAMES: readonly string[] = NAMES;

const cache = new Map<string, { at: number; value: string }>();
const inflight = new Map<
  string,
  Promise<{ ok: boolean; status: number; body: string }>
>();

function remember(key: string, value: string): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

async function request(
  endpoint: Endpoint,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: string }> {
  const path = endpoint.path(args);
  if (path === null)
    return { ok: false, status: 400, body: "A required argument is missing." };
  const query = new URLSearchParams();
  if (endpoint.method !== "POST") {
    for (const [key, value] of Object.entries(args)) {
      if (!ARG_KEY.test(key) || key === "slugs" || key === endpoint.pathKey)
        continue;
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      )
        query.set(key, String(value));
    }
  }
  const url = `${BASE}${path}${query.size > 0 ? `?${query}` : ""}`;
  const cacheKey = `${endpoint.method ?? "GET"} ${url} ${endpoint.body ? JSON.stringify(endpoint.body(args)) : ""}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS)
    return { ok: true, status: 200, body: hit.value };
  const shared = inflight.get(cacheKey);
  if (shared) return shared;
  const started = (async () => {
    const response = await fetch(url, {
      method: endpoint.method ?? "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(endpoint.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(endpoint.body ? { body: JSON.stringify(endpoint.body(args)) } : {}),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await response.text();
    if (response.ok) remember(cacheKey, body);
    return { ok: response.ok, status: response.status, body };
  })().finally(() => inflight.delete(cacheKey));
  inflight.set(cacheKey, started);
  return started;
}

const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0);

const META_NOISE = new Set([
  "methodology",
  "matchBasis",
  "matchModeLabel",
  "note",
  "validTypes",
  "validRamps",
  "humanPage",
  "apiVersion",
  "generatedAt",
]);
const ROW_NOISE = new Set([
  "logoUrl",
  "tomlSourceUrl",
  "tomlFetchedAt",
  "factors",
  "blobSha",
  "verifiedAt",
]);

function prune(value: unknown, depth: number, parent = ""): unknown {
  if (Array.isArray(value))
    return value.map((item) => prune(item, depth + 1, parent));
  if (typeof value !== "object" || value === null) return value;
  const kept: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (depth > 0 && ROW_NOISE.has(key)) continue;
    if (parent === "meta" && depth === 1 && META_NOISE.has(key)) continue;
    const next = prune(item, depth + 1, key);
    if (depth > 0 && isEmpty(next)) continue;
    kept[key] = next;
  }
  return kept;
}

export function compactJson(body: string): string {
  try {
    return JSON.stringify(prune(JSON.parse(body), 0));
  } catch {
    return body;
  }
}

function fitJson(value: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  const holder: Record<string, unknown> = Array.isArray(parsed)
    ? { items: parsed }
    : typeof parsed === "object" && parsed !== null
      ? { ...(parsed as Record<string, unknown>) }
      : {};
  let key: string | null = null;
  let size = 0;
  for (const [name, entry] of Object.entries(holder)) {
    if (Array.isArray(entry) && entry.length > size) {
      key = name;
      size = entry.length;
    }
  }
  if (key === null) return null;
  const list = holder[key] as unknown[];
  const build = (shown: number): string =>
    JSON.stringify({
      ...holder,
      [key]: list.slice(0, shown),
      _truncated: {
        list: key,
        shown,
        total: list.length,
        note: "Narrow the query or lower limit to see the rest.",
      },
    });
  let low = 1;
  let high = list.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (build(mid).length <= MAX_CHARS) low = mid;
    else high = mid - 1;
  }
  const fitted = build(low);
  return fitted.length <= MAX_CHARS ? fitted : null;
}

function clip(value: string): string {
  if (value.length <= MAX_CHARS) return value;
  return (
    fitJson(value) ??
    `${value.slice(0, MAX_CHARS)}\n[cut: ${value.length - MAX_CHARS} more characters. Narrow the query or lower limit.]`
  );
}

interface BuilderRow {
  githubUsername?: string;
  displayName?: string;
  bio?: string;
  roleTitle?: string;
  location?: string;
  websiteUrl?: string;
  twitterHandle?: string;
  projectCount?: number;
  projects?: unknown[];
  url?: string;
  onStellar?: Record<string, unknown> & {
    topRepos?: unknown[];
    contributesTo?: unknown[];
  };
}

function briefBuilder(row: BuilderRow): Record<string, unknown> {
  return {
    githubUsername: row.githubUsername,
    displayName: row.displayName,
    roleTitle: row.roleTitle,
    location: row.location,
    bio: row.bio?.slice(0, 200),
    projectCount: row.projectCount,
    profileUrl: `${BASE}/builders/${encodeURIComponent(row.githubUsername ?? "")}`,
  };
}

function compactBuilder(row: BuilderRow): Record<string, unknown> {
  const stellar = row.onStellar ?? {};
  return {
    githubUsername: row.githubUsername,
    displayName: row.displayName,
    bio: row.bio?.slice(0, 600),
    roleTitle: row.roleTitle,
    location: row.location,
    websiteUrl: row.websiteUrl,
    twitterHandle: row.twitterHandle,
    profileUrl: `${BASE}/builders/${encodeURIComponent(row.githubUsername ?? "")}`,
    projectCount: row.projectCount,
    projects: row.projects?.slice(0, 8),
    onStellar: {
      repoCount: stellar.repoCount,
      stars: stellar.stars,
      commits90d: stellar.commits90d,
      contributedCommits12m: stellar.contributedCommits12m,
      lastCommitAt: stellar.lastCommitAt,
      languages: stellar.languages,
      builds: stellar.builds,
      contributesTo: stellar.contributesTo?.slice(0, 8),
      topRepos: stellar.topRepos?.slice(0, 4),
    },
  };
}

export function createStellarlightTools() {
  return {
    find_builder: tool({
      description:
        "Finds one builder on Stellarlight by GitHub handle, or by name or keyword. Returns their profile, shipped projects, Stellar repos, recent activity and what they contribute to: their track record in the Stellar ecosystem. Team members on SCF proposals list GitHub links: pass the handle from the link. If there is no profile, the result says so with the Stellarlight link.",
      inputSchema: z.object({
        handle: z
          .string()
          .optional()
          .describe("GitHub username, for example devodii"),
        query: z
          .string()
          .optional()
          .describe("Name or keyword when there is no handle"),
      }),
      execute: async ({ handle, query }, options) => {
        const wanted = handle?.trim().replace(/^@/, "");
        if (wanted !== undefined && wanted !== "" && !HANDLE.test(wanted))
          return {
            found: false,
            error: "That does not look like a GitHub username.",
          };
        const term = wanted || query?.trim();
        if (!term)
          return {
            found: false,
            error: "Pass handle (a GitHub username) or query (a name).",
          };
        try {
          const result = await request(
            { summary: "", path: () => "/api/builders" },
            { q: term, limit: 10 },
          );
          if (!result.ok)
            return {
              found: false,
              error: `Stellarlight answered ${result.status}.`,
            };
          const rows =
            (JSON.parse(result.body) as { builders?: BuilderRow[] }).builders ??
            [];
          const exact = wanted
            ? rows.find(
                (row) =>
                  row.githubUsername?.toLowerCase() === wanted.toLowerCase(),
              )
            : undefined;
          if (exact) return { found: true, builder: compactBuilder(exact) };
          if (wanted)
            return {
              found: false,
              note: "Stellarlight has no profile for this GitHub username. It has not indexed them, which says nothing about their experience.",
              checkedUrl: `${BASE}/builders/${encodeURIComponent(wanted)}`,
              similar: rows.slice(0, 3).map((row) => ({
                githubUsername: row.githubUsername,
                displayName: row.displayName,
              })),
            };
          return {
            found: rows.length > 0,
            builders: rows.slice(0, 6).map(briefBuilder),
          };
        } catch {
          return {
            found: false,
            error: "Stellarlight did not answer in time.",
          };
        }
      },
    }),
    stellarlight: tool({
      description: `Queries Stellarlight (stellarlight.xyz), the community-indexed directory of the Stellar ecosystem. Pick a \`tool\` and pass \`args\` as an object. Tools (! means required):\n${Object.values(
        ENDPOINTS,
      )
        .map((entry) => `- ${entry.summary}`)
        .join("\n")}`,
      inputSchema: z.object({
        tool: z.enum(NAMES),
        args: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async ({ tool: name, args }, options) => {
        const endpoint = ENDPOINTS[name];
        if (!endpoint) return "Unknown Stellarlight tool.";
        try {
          const result = await request(endpoint, args ?? {});
          if (!result.ok)
            return `Stellarlight answered ${result.status} for ${name}: ${result.body.slice(0, 300)}. Usage: ${endpoint.summary}`;
          return clip(compactJson(result.body));
        } catch {
          return "Stellarlight did not answer in time.";
        }
      },
    }),
  };
}
