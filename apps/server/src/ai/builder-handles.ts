const BASE = "https://stellarlight.xyz";
const PAGE = 200;
const FRESH_MS = 15 * 60_000;
const TIMEOUT_MS = 20_000;
const MAX_PAGES = 20;

export interface HandleSnapshot {
  handles: string[];
  at: number;
}

interface BuildersPage {
  builders?: { githubUsername?: string }[];
  meta?: { counts?: { total?: number } };
}

let snapshot: HandleSnapshot | null = null;
let refreshing: Promise<HandleSnapshot> | null = null;

async function load(): Promise<HandleSnapshot> {
  const handles = new Set<string>();
  let total = Number.POSITIVE_INFINITY;
  for (let page = 0; page < MAX_PAGES && page * PAGE < total; page += 1) {
    const response = await fetch(
      `${BASE}/api/builders?limit=${PAGE}&offset=${page * PAGE}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "better-scf-server",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!response.ok)
      throw new Error(`stellarlight builders answered ${response.status}`);
    const body = (await response.json()) as BuildersPage;
    total = body.meta?.counts?.total ?? 0;
    for (const builder of body.builders ?? [])
      if (builder.githubUsername)
        handles.add(builder.githubUsername.toLowerCase());
  }
  if (handles.size === 0) throw new Error("stellarlight returned no builders");
  return { handles: [...handles].sort(), at: Date.now() };
}

function refresh(): Promise<HandleSnapshot> {
  refreshing ??= load()
    .then((next) => {
      snapshot = next;
      return next;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function builderHandles(): Promise<HandleSnapshot> {
  if (snapshot && Date.now() - snapshot.at < FRESH_MS) return snapshot;
  if (snapshot) {
    refresh().catch(() => undefined);
    return snapshot;
  }
  return refresh();
}
