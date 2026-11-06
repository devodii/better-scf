import { writeFileSync } from "node:fs";

const ORIGIN = (
  process.env.SITE_ORIGIN || "https://communityfund.stellar.org"
).replace(/\/+$/, "");
const SUBMISSION = "/submissions/recuKWaSdUL8Lkw9o";
const AGENT =
  "better-scf-site-watch (daily check of the public pages the extension relies on)";

const get = async (path) => {
  const response = await fetch(ORIGIN + path, {
    headers: { "user-agent": AGENT, "cache-control": "no-cache" },
  });
  if (!response.ok) {
    const hint =
      path === SUBMISSION
        ? " (the pinned example proposal may have been removed)"
        : "";
    throw new Error(`${path} answered ${response.status}${hint}`);
  }
  return response.text();
};

const routeStatus = async (path) => {
  const response = await fetch(ORIGIN + path, {
    redirect: "manual",
    headers: { "user-agent": AGENT },
  });
  return {
    status: response.status,
    location: response.headers.get("location") ?? "",
  };
};

const headings = (html) =>
  [...html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)].map((match) =>
    match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim(),
  );

const flight = (html) => html.replace(/\\"/g, '"');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const checks = [
  {
    name: "Proposal page keeps its section headings",
    why: "The parser, table of contents, tranche summary and team avatars read these headings.",
    async run() {
      const found = headings(await get(SUBMISSION));
      const need = [
        /^Products & Services$/,
        /^Requested Budget$/,
        /^Traction Evidence$/,
        /^Tranche 1\b/,
        /^Tranche 2\b/,
        /^Tranche 3\b/,
        /^Team$/,
        /^Project Stats$/,
        /^Other Submissions$/,
      ];
      const missing = need.filter(
        (pattern) => !found.some((text) => pattern.test(text)),
      );
      expect(
        missing.length === 0,
        `missing headings: ${missing.map(String).join(", ")}`,
      );
      return `${found.length} headings found`;
    },
  },
  {
    name: "Proposal page still has a title",
    why: "The title block is the anchor for the share button and the page parser.",
    async run() {
      const html = await get(SUBMISSION);
      expect(/<h2[^>]*>[^<]+<\/h2>/.test(html), "no h2 title found");
    },
  },
  {
    name: "Proposal data still carries the fields we read",
    why: "Round and project facts come from the page payload, not from the visible text.",
    async run() {
      const data = flight(await get(SUBMISSION));
      const missing = [
        "totalAwarded",
        "awardType",
        "projectName",
        "roundName",
        "isCvvc",
      ].filter((key) => !data.includes(`"${key}"`));
      expect(
        missing.length === 0,
        `missing payload fields: ${missing.join(", ")}`,
      );
    },
  },
  {
    name: "RFP proposals still say which RFP they answer",
    why: "The RFP tag looks for this wording in the proposal text.",
    async run() {
      const text = flight(await get(SUBMISSION));
      expect(
        /respon(?:ds?|se|ding)\s+to[^.\n]{0,90}?\bRFP\b/i.test(text),
        "the known RFP proposal no longer matches the RFP wording",
      );
    },
  },
  {
    name: "Project directory keeps its record shape",
    why: "Dashboard search reads the project list embedded in the public projects page.",
    async run() {
      const data = flight(await get("/projects"));
      const missing = [
        "slug",
        "title",
        "category",
        "thumbnail",
        "lastAwardedRound",
      ].filter((key) => !data.includes(`"${key}"`));
      expect(
        missing.length === 0,
        `missing project fields: ${missing.join(", ")}`,
      );
    },
  },
  {
    name: "Dashboard pages still exist at the same addresses",
    why: "The extension recognises the round list, a round, a proposal and My Projects by these paths.",
    async run() {
      const paths = [
        "/dashboard/award-rounds",
        "/dashboard/award-rounds/recxrSMYwAl8vcglg",
        "/dashboard/submissions/recuKWaSdUL8Lkw9o",
        "/dashboard/projects",
      ];
      const gone = [];
      for (const path of paths) {
        const { status, location } = await routeStatus(path);
        const sentToLogin =
          status >= 300 && status < 400 && location.includes("login");
        if (!(status === 200 || sentToLogin))
          gone.push(`${path} -> ${status} ${location}`.trim());
      }
      expect(gone.length === 0, `routes changed: ${gone.join("; ")}`);
      return `${paths.length} routes answer`;
    },
  },
  {
    name: "Round records still have the fields the round parser reads",
    why: "Cards are matched to proposals using these fields, in every round page payload.",
    async run() {
      const data = flight(await get(SUBMISSION));
      const at = data.indexOf('"roundName":"SCF #');
      expect(
        at > 0,
        "no submission record with a round name was found in the page payload",
      );
      const record = data.slice(Math.max(0, at - 400), at + 400);
      const missing = [
        "id",
        "title",
        "status",
        "project",
        "projectName",
        "budget",
        "awardType",
        "isCvvc",
        "thumbnail",
      ].filter((key) => !record.includes(`"${key}"`));
      expect(
        missing.length === 0,
        `missing record fields: ${missing.join(", ")}`,
      );
    },
  },
];

const rows = [];
for (const check of checks) {
  try {
    const detail = await check.run();
    rows.push({ ...check, ok: true, detail: detail ?? "" });
  } catch (error) {
    rows.push({
      ...check,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

const failed = rows.filter((row) => !row.ok);
const lines = [
  `# SCF site check: ${failed.length === 0 ? "all clear" : `${failed.length} of ${rows.length} checks failed`}`,
  "",
  `Checked ${ORIGIN} on ${new Date().toISOString().slice(0, 10)}.`,
  "",
  ...rows.map((row) =>
    row.ok
      ? `- OK: ${row.name}${row.detail ? ` (${row.detail})` : ""}`
      : `- **BROKEN: ${row.name}**\n  - What changed: ${row.detail}\n  - What it affects: ${row.why}`,
  ),
  "",
  "Not covered here because they need a login: what the round list, round and dashboard proposal pages look like inside. The checks above cover their addresses and the data they are built from.",
];
const report = lines.join("\n");
writeFileSync("site-watch-report.md", report);
console.log(report);
process.exit(failed.length === 0 ? 0 : 1);
