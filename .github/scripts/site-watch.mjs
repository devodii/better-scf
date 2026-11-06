import { writeFileSync } from 'node:fs';

const ORIGIN = (process.env.SITE_ORIGIN || 'https://communityfund.stellar.org').replace(/\/+$/, '');
const SUBMISSION = '/submissions/recuKWaSdUL8Lkw9o';
const AGENT = 'better-scf-site-watch (daily check of the public pages the extension relies on)';

const get = async (path) => {
  const response = await fetch(ORIGIN + path, { headers: { 'user-agent': AGENT } });
  if (!response.ok) throw new Error(`${path} answered ${response.status}`);
  return response.text();
};

const headings = (html) =>
  [...html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)].map((match) =>
    match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim(),
  );

const flight = (html) => html.replace(/\\"/g, '"');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const checks = [
  {
    name: 'Proposal page keeps its section headings',
    why: 'The parser, table of contents, tranche summary and team avatars read these headings.',
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
      const missing = need.filter((pattern) => !found.some((text) => pattern.test(text)));
      expect(missing.length === 0, `missing headings: ${missing.map(String).join(', ')}`);
      return `${found.length} headings found`;
    },
  },
  {
    name: 'Proposal page still has a title',
    why: 'The title block is the anchor for the share button and the page parser.',
    async run() {
      const html = await get(SUBMISSION);
      expect(/<h2[^>]*>[^<]+<\/h2>/.test(html), 'no h2 title found');
    },
  },
  {
    name: 'Proposal data still carries the fields we read',
    why: 'Round and project facts come from the page payload, not from the visible text.',
    async run() {
      const data = flight(await get(SUBMISSION));
      const missing = ['totalAwarded', 'awardType', 'projectName', 'roundName', 'isCvvc'].filter(
        (key) => !data.includes(`"${key}"`),
      );
      expect(missing.length === 0, `missing payload fields: ${missing.join(', ')}`);
    },
  },
  {
    name: 'RFP proposals still say which RFP they answer',
    why: 'The RFP tag looks for this wording in the proposal text.',
    async run() {
      const text = flight(await get(SUBMISSION));
      expect(
        /respon(?:ds?|se|ding)\s+to[^.\n]{0,90}?\bRFP\b/i.test(text),
        'the known RFP proposal no longer matches the RFP wording',
      );
    },
  },
  {
    name: 'Project directory keeps its record shape',
    why: 'Dashboard search reads the project list embedded in the public projects page.',
    async run() {
      const data = flight(await get('/projects'));
      const missing = ['slug', 'title', 'category', 'thumbnail', 'lastAwardedRound'].filter(
        (key) => !data.includes(`"${key}"`),
      );
      expect(missing.length === 0, `missing project fields: ${missing.join(', ')}`);
    },
  },
  {
    name: 'Landing page keeps its two entry buttons',
    why: 'The clearer landing choice finds the site buttons by their text.',
    async run() {
      const html = await get('/');
      const chunks = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js[^"]*)"/g)].map(
        (m) => m[1],
      );
      expect(chunks.length > 0, 'no script files found on the landing page');
      let login = false;
      let apply = false;
      for (const chunk of chunks) {
        const code = await get(chunk);
        login ||= code.includes('Go to dashboard');
        apply ||= /I don(?:'|\\u2019|’)t have an account/.test(code);
        if (login && apply) break;
      }
      expect(login, 'the "Go to dashboard" button text is gone');
      expect(apply, 'the "I don\'t have an account" button text is gone');
    },
  },
  {
    name: 'Sign-in status endpoint still answers the same way',
    why: 'The landing choice tells signed-in visitors apart using the first bytes of this answer.',
    async run() {
      const answer = (await get('/api/auth/session')).trim();
      expect(
        answer === 'null' || answer === '{}',
        `signed-out answer changed (starts with "${answer.slice(0, 12)}")`,
      );
    },
  },
];

const rows = [];
for (const check of checks) {
  try {
    const detail = await check.run();
    rows.push({ ...check, ok: true, detail: detail ?? '' });
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
  `# SCF site check: ${failed.length === 0 ? 'all clear' : `${failed.length} of ${rows.length} checks failed`}`,
  '',
  `Checked ${ORIGIN} on ${new Date().toISOString().slice(0, 10)}.`,
  '',
  ...rows.map((row) =>
    row.ok
      ? `- OK: ${row.name}${row.detail ? ` (${row.detail})` : ''}`
      : `- **BROKEN: ${row.name}**\n  - What changed: ${row.detail}\n  - What it affects: ${row.why}`,
  ),
  '',
  'Not covered here because they need a login: the round and award-round pages. The extension logs those problems on the page when debug logging is on.',
];
const report = lines.join('\n');
writeFileSync('site-watch-report.md', report);
console.log(report);
process.exit(failed.length === 0 ? 0 : 1);
