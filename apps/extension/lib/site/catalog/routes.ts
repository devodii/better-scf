import { fillPattern, type PathParams } from "./pattern";

export interface RouteEntry {
  id: string;
  path: string;
  title: string;
  description: string;
  keywords: readonly string[];
  needsLogin: boolean;
}

export interface RouteCandidate {
  route: RouteEntry;
  confidence: number;
}

export const routes = [
  {
    id: "home",
    path: "/",
    title: "Home",
    description: "The public landing page of the Stellar Community Fund.",
    keywords: ["landing", "start", "main page", "front page", "scf"],
    needsLogin: false,
  },
  {
    id: "awards",
    path: "/awards",
    title: "Awards",
    description: "Public page about the awards the Community Fund gives out.",
    keywords: ["award", "grants", "funding", "prizes", "what you can win"],
    needsLogin: false,
  },
  {
    id: "governance",
    path: "/governance",
    title: "Governance",
    description: "Public page explaining how the Community Fund is governed.",
    keywords: ["governance", "rules", "how it works", "process", "dao"],
    needsLogin: false,
  },
  {
    id: "projects-public",
    path: "/projects",
    title: "Funded Projects",
    description:
      "Public directory of every funded project, in category carousels with a search field.",
    keywords: [
      "projects",
      "funded projects",
      "directory",
      "all projects",
      "categories",
      "search projects",
    ],
    needsLogin: false,
  },
  {
    id: "project",
    path: "/project/:slug",
    title: "Project",
    description: "Public page of one funded project.",
    keywords: ["project page", "funded project"],
    needsLogin: false,
  },
  {
    id: "award-rounds",
    path: "/dashboard/award-rounds",
    title: "Award Rounds",
    description:
      "Dashboard list of open rounds and completed rounds, each with a View button.",
    keywords: [
      "rounds",
      "scf rounds",
      "open rounds",
      "completed rounds",
      "past rounds",
      "deadline",
      "dashboard",
    ],
    needsLogin: true,
  },
  {
    id: "round",
    path: "/dashboard/award-rounds/:roundId",
    title: "Award Round",
    description:
      "One round with its phase dates, awarded submissions and received submissions.",
    keywords: [
      "round",
      "round page",
      "submissions in a round",
      "received submissions",
      "awarded submissions",
    ],
    needsLogin: true,
  },
  {
    id: "submission",
    path: "/dashboard/submissions/:submissionId",
    title: "Submission",
    description:
      "One submission with its proposal sections, budget, tranches, team and project stats.",
    keywords: [
      "submission",
      "proposal",
      "application",
      "tranche",
      "deliverables",
      "budget",
    ],
    needsLogin: true,
  },
  {
    id: "my-projects",
    path: "/dashboard/projects",
    title: "My Projects",
    description: "Dashboard page with your own projects and their submissions.",
    keywords: ["my projects", "my submissions", "own projects", "mine"],
    needsLogin: true,
  },
  {
    id: "my-project",
    path: "/dashboard/projects/:projectId",
    title: "My Project",
    description: "Dashboard page of one of your own projects.",
    keywords: ["project details", "project dashboard", "own project page"],
    needsLogin: true,
  },
  {
    id: "tasks",
    path: "/dashboard/tasks",
    title: "Tasks",
    description: "The Tasks page of the dashboard.",
    keywords: ["tasks", "todo", "to do", "my tasks"],
    needsLogin: true,
  },
  {
    id: "tiers",
    path: "/dashboard/tiers",
    title: "Verified Members",
    description: "Verified member tiers, tier requests and nominations.",
    keywords: [
      "tiers",
      "tier",
      "verified",
      "members",
      "nominations",
      "navigator",
      "pilot",
      "reputation",
    ],
    needsLogin: true,
  },
  {
    id: "delegate-trust",
    path: "/dashboard/delegate-trust",
    title: "Delegates and Trust",
    description: "Delegates, trust and tier nominations.",
    keywords: [
      "delegate",
      "delegates",
      "delegation",
      "trust",
      "trusted",
      "voting power",
    ],
    needsLogin: true,
  },
  {
    id: "vote",
    path: "/dashboard/vote",
    title: "Community Vote",
    description:
      "The community vote page, with the NQG graph and your delegates.",
    keywords: [
      "vote",
      "voting",
      "ballot",
      "cast vote",
      "nqg",
      "community vote",
    ],
    needsLogin: true,
  },
  {
    id: "voting-history",
    path: "/dashboard/voting-history",
    title: "Community Vote History",
    description:
      "Your voting statistics per round and your NQG score over time.",
    keywords: [
      "voting history",
      "vote history",
      "past votes",
      "my votes",
      "statistics",
      "nqg score",
      "neuron",
    ],
    needsLogin: true,
  },
  {
    id: "analytics",
    path: "/dashboard/analytics",
    title: "Analytics",
    description:
      "Insights and charts across rounds: funding, participation, delegation and voting trends.",
    keywords: [
      "analytics",
      "insights",
      "charts",
      "stats",
      "trends",
      "metrics",
      "data",
    ],
    needsLogin: true,
  },
  {
    id: "how-nqg-works",
    path: "/dashboard/analytics/how-nqg-works",
    title: "How NQG Works",
    description: "Explanation of the NQG score, a subpage of Analytics.",
    keywords: [
      "nqg",
      "how nqg works",
      "neural quorum governance",
      "score explained",
      "quorum",
    ],
    needsLogin: true,
  },
  {
    id: "account",
    path: "/dashboard/account",
    title: "Account",
    description: "Your account details form.",
    keywords: [
      "account",
      "profile",
      "settings",
      "my details",
      "email",
      "discord",
      "user",
    ],
    needsLogin: true,
  },
] as const satisfies readonly RouteEntry[];

const STOP = new Set([
  "the",
  "a",
  "an",
  "to",
  "go",
  "open",
  "take",
  "me",
  "page",
  "show",
  "please",
  "of",
  "for",
  "and",
  "on",
]);

function tokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function withinOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length || i === b.length) return true;
  if (a.length === b.length)
    return (
      a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] &&
        a[i + 1] === b[i] &&
        a.slice(i + 2) === b.slice(i + 2))
    );
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  return long.slice(i + 1) === short.slice(i);
}

function tokenScore(token: string, words: ReadonlySet<string>): number {
  if (words.has(token)) return 1;
  let best = 0;
  for (const word of words) {
    if (
      token.length >= 3 &&
      (word.startsWith(token) || (word.length >= 4 && token.startsWith(word)))
    ) {
      best = Math.max(best, 0.7);
    } else if (token.length >= 5 && withinOne(token, word)) {
      best = Math.max(best, 0.6);
    }
  }
  return best;
}

interface Indexed {
  route: RouteEntry;
  idKey: string;
  titleKey: string;
  phrases: readonly string[];
  words: ReadonlySet<string>;
  descriptionWords: ReadonlySet<string>;
}

const index: Indexed[] = routes.map((route: RouteEntry) => ({
  route,
  idKey: route.id.replace(/-/g, " "),
  titleKey: tokens(route.title).join(" "),
  phrases: route.keywords.map((k) => tokens(k).join(" ")),
  words: new Set([
    ...tokens(route.title),
    ...route.keywords.flatMap(tokens),
    ...tokens(route.id),
  ]),
  descriptionWords: new Set(tokens(route.description)),
}));

const MIN_CONFIDENCE = 0.4;
const MAX_CANDIDATES = 5;

export function resolveRoute(query: string): RouteCandidate[] {
  const all = tokens(query);
  if (all.length === 0) return [];
  const used = all.filter((t) => !STOP.has(t));
  const queryTokens = used.length > 0 ? used : all;
  const phrase = queryTokens.join(" ");

  const candidates: RouteCandidate[] = [];
  for (const item of index) {
    let confidence: number;
    if (
      phrase === item.idKey ||
      phrase === item.titleKey ||
      item.phrases.includes(phrase)
    ) {
      confidence = 1;
    } else {
      let sum = 0;
      for (const token of queryTokens) {
        sum += Math.max(
          tokenScore(token, item.words),
          item.descriptionWords.has(token) ? 0.3 : 0,
        );
      }
      confidence = sum / queryTokens.length;
      if (confidence === 1) confidence = 0.95;
    }
    if (confidence >= MIN_CONFIDENCE)
      candidates.push({ route: item.route, confidence });
  }
  return candidates
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        a.route.path.length - b.route.path.length,
    )
    .slice(0, MAX_CANDIDATES);
}

export function buildPath(id: string, params: PathParams = {}): string | null {
  const route = index.find((item) => item.route.id === id)?.route;
  return route ? fillPattern(route.path, params) : null;
}
