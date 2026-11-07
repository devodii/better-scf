import { tool } from "ai";
import { z } from "zod";

const BASE = "https://stellarlight.xyz";
const TIMEOUT_MS = 12_000;
const MAX_CHARS = 8_000;
const CACHE_MS = 5 * 60_000;
const CACHE_LIMIT = 200;
const USER_AGENT = "better-scf-server";
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const ARG_KEY = /^[A-Za-z]{1,20}$/;

interface Endpoint {
  summary: string;
  path: (args: Record<string, unknown>) => string | null;
  method?: "GET" | "POST";
  body?: (args: Record<string, unknown>) => unknown;
}

const text = (args: Record<string, unknown>, key: string): string | null => {
  const value = args[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
};

const slug =
  (key: string, route: string) => (args: Record<string, unknown>) => {
    const value = text(args, key);
    return value === null ? null : `${route}/${encodeURIComponent(value)}`;
  };

const ENDPOINTS: Record<string, Endpoint> = {
  get_builders: {
    summary:
      "get_builders(skill?, location?, limit?): people directory, with bio, role and shipped projects",
    path: () => "/api/builders",
  },
  get_people: {
    summary:
      "get_people(q?, section?, limit?): Stellar Development Foundation leadership, board and advisors",
    path: () => "/api/people",
  },
  search_projects: {
    summary:
      "search_projects(q?, category?, type?, status?, scfAwarded?, limit?): what has been built, by whom, with SCF funding",
    path: () => "/api/projects/search",
  },
  search_repos: {
    summary:
      "search_repos(q?, language?, activity?, minScore?, limit?, offset?): indexed GitHub repos scored for depth, freshness and traction",
    path: () => "/api/repos/search",
  },
  explain_repo: {
    summary:
      "explain_repo(q!, repo?): answers a deep code question about an indexed repo",
    path: () => "/api/repos/explain",
  },
  locate_source: {
    summary:
      "locate_source(q!, repo?, kind?, page?): where something is defined in Stellar core source repos",
    path: () => "/api/sources/locate",
  },
  get_hackathons: {
    summary:
      "get_hackathons(status?, q?, organizer?, source?, limit?): Stellar hackathon events",
    path: () => "/api/hackathons",
  },
  get_hackathon: {
    summary:
      "get_hackathon(slug!): one hackathon with every submission, placement and prize",
    path: slug("slug", "/api/hackathons"),
  },
  compare_hackathons: {
    summary: "compare_hackathons(slugs![2-5]): side by side comparison",
    method: "POST",
    path: () => "/api/hackathons/compare",
    body: (args) => ({ slugs: Array.isArray(args.slugs) ? args.slugs : [] }),
  },
  search_hackathon_builds: {
    summary:
      "search_hackathon_builds(q?, hackathon?, limit?, offset?): prior art across hackathon prototypes",
    path: () => "/api/hackathons/builds",
  },
  get_hackathon_submission: {
    summary: "get_hackathon_submission(id!): one hackathon submission in full",
    path: slug("id", "/api/hackathons/builds"),
  },
  analyze_hackathon_submissions: {
    summary:
      "analyze_hackathon_submissions(facet?, by?, value?, top?): counts across hackathon submissions",
    path: () => "/api/hackathons/analyze",
  },
  review_submission: {
    summary:
      "review_submission(link!, hackathon?): facts about one hackathon submission from its repo or DoraHacks link",
    path: () => "/api/hackathons/review",
  },
  get_audits: {
    summary:
      "get_audits(project?, auditor?, query?, since?, limit?): Stellar security audit reports",
    path: () => "/api/audits",
  },
  search_research: {
    summary:
      "search_research(query!, source?, auditor?, protocol?, severity?, limit?): semantic search over SDF blog, SCF handbook, SEPs, docs, audits",
    path: () => "/api/research",
  },
  get_rfps: {
    summary: "get_rfps(status?, quarter?, limit?): curated Stellar RFPs",
    path: () => "/api/rfps",
  },
  get_partners: {
    summary:
      "get_partners(type?, sector?, region?, q?): audit firms, anchors, ramps, infra, wallets",
    path: () => "/api/partners",
  },
  get_leaderboard: {
    summary:
      "get_leaderboard(type?): ranked active projects with GitHub rollups and developer counts",
    path: () => "/api/leaderboard",
  },
  get_clusters: {
    summary:
      "get_clusters(dimension?, minSize?): topic clusters scored on how crowded they are",
    path: () => "/api/clusters",
  },
  analyze_ecosystem: {
    summary:
      "analyze_ecosystem(dimension?: all|hackathons|categories|funding): ecosystem totals and SCF funding per round",
    path: () => "/api/analyze",
  },
  vet_idea: {
    summary:
      "vet_idea(q!): competitors, maturity and prior art for an idea on Stellar",
    path: () => "/api/vet-idea",
  },
  hackathon_brief: {
    summary:
      "hackathon_brief(q!): vet view, winners, starter repos and contracts for an idea",
    path: () => "/api/hackathon-brief",
  },
  scf_pitch: {
    summary:
      "scf_pitch(q!): live SCF round state, funded projects in the vertical and pitch angles",
    path: () => "/api/scf-pitch",
  },
  list_skills: {
    summary: "list_skills(): installable Stellar AI skills and tools",
    path: () => "/api/skills",
  },
  get_skill: {
    summary: "get_skill(name!): one skill in full",
    path: slug("name", "/api/skills"),
  },
  get_changelog: {
    summary: "get_changelog(since?, limit?): changes to the Stellarlight API",
    path: () => "/api/changelog",
  },
  get_status: {
    summary: "get_status(): freshness and size of each data source",
    path: () => "/api/status",
  },
};

const NAMES = Object.keys(ENDPOINTS) as [string, ...string[]];

const cache = new Map<string, { at: number; value: string }>();

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
  signal: AbortSignal | undefined,
): Promise<{ ok: boolean; status: number; body: string }> {
  const path = endpoint.path(args);
  if (path === null)
    return { ok: false, status: 400, body: "A required argument is missing." };
  const query = new URLSearchParams();
  if (endpoint.method !== "POST") {
    for (const [key, value] of Object.entries(args)) {
      if (!ARG_KEY.test(key) || key === "slugs") continue;
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
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const response = await fetch(url, {
    method: endpoint.method ?? "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      ...(endpoint.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(endpoint.body ? { body: JSON.stringify(endpoint.body(args)) } : {}),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const body = await response.text();
  if (response.ok) remember(cacheKey, body);
  return { ok: response.ok, status: response.status, body };
}

function clip(value: string): string {
  return value.length <= MAX_CHARS
    ? value
    : `${value.slice(0, MAX_CHARS)}\n[cut: ${value.length - MAX_CHARS} more characters. Narrow the query or lower limit.]`;
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
    profileUrl: row.url ?? `${BASE}/builders/${row.githubUsername}`,
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
    profileUrl: row.url ?? `${BASE}/builders/${row.githubUsername}`,
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
        if (!term) return { found: false, error: "Pass a handle or a query." };
        try {
          const result = await request(
            { summary: "", path: () => "/api/builders" },
            { q: term, limit: 10 },
            options.abortSignal,
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
          const result = await request(
            endpoint,
            args ?? {},
            options.abortSignal,
          );
          if (!result.ok)
            return `Stellarlight answered ${result.status} for ${name}: ${result.body.slice(0, 300)}. Usage: ${endpoint.summary}`;
          return clip(result.body);
        } catch {
          return "Stellarlight did not answer in time.";
        }
      },
    }),
  };
}
