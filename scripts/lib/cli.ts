import { parseArgs } from 'node:util';

export const SITE_HOST = 'communityfund.stellar.org';
export const MAX_PAGES = 8;
export const DEFAULT_DELAY_MS = 5000;
export const MIN_DELAY_MS = 2000;

export interface PageSpec {
  name: string;
  url: string;
}

export interface CliOptions {
  pages: PageSpec[];
  delayMs: number;
  redact: string[];
}

/**
 * Parses `name=https://communityfund.stellar.org/path` arguments. Only https URLs on the site
 * are accepted and the number of pages is capped, so a typo cannot send the browser elsewhere or
 * turn a run into a crawl. The pause between pages cannot go below two seconds.
 */
export function parseCli(argv: readonly string[]): CliOptions {
  const { values, positionals } = parseArgs({
    args: argv.filter((arg) => arg !== '--'),
    allowPositionals: true,
    options: {
      'delay-ms': { type: 'string' },
      redact: { type: 'string' },
    },
  });

  if (positionals.length === 0) {
    throw new Error(
      `Pass the pages to visit as name=url, for example round=https://${SITE_HOST}/rounds/46`,
    );
  }
  if (positionals.length > MAX_PAGES) {
    throw new Error(`At most ${MAX_PAGES} pages per run; got ${positionals.length}.`);
  }

  const seen = new Set<string>();
  const pages = positionals.map((arg): PageSpec => {
    const separator = arg.indexOf('=');
    if (separator <= 0) throw new Error(`"${arg}" is not name=url.`);
    const name = arg.slice(0, separator);
    const rawUrl = arg.slice(separator + 1);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      throw new Error(`Page name "${name}" must be lowercase letters, digits and dashes.`);
    }
    if (seen.has(name)) throw new Error(`Page name "${name}" is used twice.`);
    seen.add(name);
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new Error(`"${rawUrl}" is not a valid URL.`);
    }
    if (url.protocol !== 'https:' || url.hostname !== SITE_HOST) {
      throw new Error(`"${rawUrl}" is not an https URL on ${SITE_HOST}.`);
    }
    return { name, url: url.toString() };
  });

  const delayMs = values['delay-ms'] === undefined ? DEFAULT_DELAY_MS : Number(values['delay-ms']);
  if (!Number.isFinite(delayMs) || delayMs < MIN_DELAY_MS) {
    throw new Error(`--delay-ms must be a number of at least ${MIN_DELAY_MS}.`);
  }

  const redact = (values.redact ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
  return { pages, delayMs, redact };
}
