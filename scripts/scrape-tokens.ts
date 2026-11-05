import { z } from 'zod';
import { openSession, run, visitPages, waitForHumanLogin, writeRepoFile } from './lib/browser';
import { parseCli } from './lib/cli';
import { TOKEN_PROBE } from './lib/page-scripts';
import {
  formatTokensScss,
  mergeTokenValues,
  missingTokens,
  normalizeColor,
  TOKEN_NAMES,
  type TokenName,
  type TokenValues,
} from './lib/tokens';

const OUTPUT = 'apps/extension/entrypoints/scf.content/styles/tokens.scss';

const COLOR_TOKENS = new Set<TokenName>([
  'bg',
  'surface',
  'text',
  'text-muted',
  'chip-purple-bg',
  'chip-purple-fg',
  'chip-olive-bg',
  'chip-olive-fg',
  'chip-yellow-bg',
  'chip-yellow-fg',
  'accent-yellow',
  'link',
]);

const probeSchema = z.object({
  found: z.record(z.string(), z.string()),
  notes: z.record(z.string(), z.string()),
  variables: z.record(z.string(), z.string()),
});

function toTokenValues(found: Record<string, string>): TokenValues {
  const values: TokenValues = {};
  for (const name of TOKEN_NAMES) {
    const raw = found[name];
    if (raw === undefined) continue;
    const value = COLOR_TOKENS.has(name) ? normalizeColor(raw) : raw;
    if (value !== null) values[name] = value;
  }
  return values;
}

async function main(): Promise<void> {
  const { pages, delayMs } = parseCli(process.argv.slice(2));
  const perPage: TokenValues[] = [];
  const siteVariables: Record<string, string> = {};

  const session = await openSession();
  try {
    await waitForHumanLogin(session);
    const result = await visitPages(session, pages, delayMs, {
      beforeNavigate: () => undefined,
      onPage: async (page) => {
        const probe = probeSchema.parse(await page.evaluate(TOKEN_PROBE));
        const values = toTokenValues(probe.found);
        perPage.push(values);
        for (const [name, value] of Object.entries(probe.variables)) {
          if (!(name in siteVariables)) siteVariables[name] = value;
        }
        console.log(
          `  ${Object.keys(values).length} tokens, ${Object.keys(probe.variables).length} root variables`,
        );
        for (const [name, note] of Object.entries(probe.notes)) {
          console.log(`    ${name} <- ${note}`);
        }
      },
    });
    if (result.skipped.length > 0) {
      console.error(
        `\nWARNING: ${result.skipped.length} page(s) were skipped: ${result.skipped.map((s) => `${s.name} (${s.reason})`).join(', ')}. Their tokens are missing.`,
      );
    }
  } finally {
    await session.end();
  }

  const merged = mergeTokenValues(perPage);
  const written = await writeRepoFile(OUTPUT, formatTokensScss(merged, siteVariables));
  console.log(`\nWrote ${written}`);
  const missing = missingTokens(merged);
  if (missing.length > 0) {
    console.warn(`Not found, omitted from the file: ${missing.join(', ')}`);
    console.warn(
      'Check the page list passed on the command line; do not fill the values in by hand.',
    );
  }
}

run(main);
