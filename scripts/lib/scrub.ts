const SENSITIVE_HEADERS = new Set([
  'cookie',
  'set-cookie',
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'x-csrf-token',
  'x-xsrf-token',
]);

const SENSITIVE_HEADER_NAME = /token|secret|session|csrf|xsrf|api-?key|auth|cookie/i;

export function stripSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (SENSITIVE_HEADERS.has(lower) || SENSITIVE_HEADER_NAME.test(lower)) continue;
    kept[lower] = value;
  }
  return kept;
}

export interface ScrubCounts {
  scripts: number;
  hiddenInputs: number;
  inputValues: number;
  emails: number;
  stellarAddresses: number;
  recordIds: number;
  profileLinks: number;
  tokens: number;
  images: number;
  dataAttributes: number;
  literals: number;
}

export interface ScrubResult {
  html: string;
  counts: ScrubCounts;
}

// The lookbehind keeps "box.com/foo" from matching as "x.com/foo".
const PROFILE_LINK =
  /(?<![\w.-])((?:https?:\/\/)?(?:www\.)?(?:github\.com|x\.com|twitter\.com|t\.me|linkedin\.com\/in|discord\.gg))\/?[^/"'?#\s<>)]+/gi;
const ATTR_VALUE = String.raw`(?:"[^"]*"|'[^']*'|[^\s>"']+)`;
const SECRET_QUERY = /([?&;](?:token|key|sig|signature|auth|session|code|secret)=)[^&"'\s<>]+/gi;
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scrubHtml(html: string, literals: readonly string[] = []): ScrubResult {
  const counts: ScrubCounts = {
    scripts: 0,
    hiddenInputs: 0,
    inputValues: 0,
    emails: 0,
    stellarAddresses: 0,
    recordIds: 0,
    profileLinks: 0,
    tokens: 0,
    images: 0,
    dataAttributes: 0,
    literals: 0,
  };
  const count = (key: keyof ScrubCounts, replacement: string) => () => {
    counts[key] += 1;
    return replacement;
  };

  let out = html;
  out = out.replace(/<script\b[\s\S]*?<\/script\s*>/gi, count('scripts', ''));
  out = out.replace(
    /<input\b[^>]*\btype\s*=\s*["']?hidden["']?[^>]*>/gi,
    count('hiddenInputs', ''),
  );
  out = out.replace(
    new RegExp(`(<(?:input|textarea)\\b[^>]*?)\\svalue\\s*=\\s*${ATTR_VALUE}`, 'gi'),
    (_m, head) => {
      counts.inputValues += 1;
      return `${head} value=""`;
    },
  );
  out = out.replace(/(<textarea\b[^>]*>)[\s\S]*?(<\/textarea\s*>)/gi, (_m, open, close) => {
    counts.inputValues += 1;
    return `${open}${close}`;
  });
  out = out.replace(new RegExp(`(\\sdata-[\\w:.-]+\\s*=\\s*)${ATTR_VALUE}`, 'gi'), (_m, head) => {
    counts.dataAttributes += 1;
    return `${head}""`;
  });
  out = out.replace(JWT, count('tokens', '[token]'));
  out = out.replace(SECRET_QUERY, (_m, head) => {
    counts.tokens += 1;
    return `${head}REDACTED`;
  });
  out = out.replace(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    count('emails', 'user@example.invalid'),
  );
  out = out.replace(/\bG[A-Z2-7]{55}\b/g, count('stellarAddresses', `G${'X'.repeat(55)}`));
  out = out.replace(/\brec[A-Za-z0-9]{14}\b/g, count('recordIds', `rec${'X'.repeat(14)}`));
  out = out.replace(PROFILE_LINK, (_m, head) => {
    counts.profileLinks += 1;
    return `${head}/example-user`;
  });
  out = out.replace(
    new RegExp(`(<(?:img|source)\\b[^>]*?)\\ssrcset\\s*=\\s*${ATTR_VALUE}`, 'gi'),
    '$1',
  );
  out = out.replace(
    new RegExp(`(<(?:img|source)\\b[^>]*?\\s)src\\s*=\\s*${ATTR_VALUE}`, 'gi'),
    (_m, head) => {
      counts.images += 1;
      return `${head}src="https://example.invalid/image.png"`;
    },
  );
  out = out.replace(
    new RegExp(`(<image\\b[^>]*?\\s(?:xlink:)?href\\s*=\\s*)${ATTR_VALUE}`, 'gi'),
    (_m, head) => {
      counts.images += 1;
      return `${head}"https://example.invalid/image.png"`;
    },
  );
  out = out.replace(
    new RegExp(`(\\sstyle\\s*=\\s*)(${ATTR_VALUE})`, 'gi'),
    (_m, head: string, value: string) => {
      let changed = false;
      const next = value.replace(/url\([^)]*\)/gi, () => {
        changed = true;
        return 'url(about:blank)';
      });
      if (changed) counts.images += 1;
      return `${head}${next}`;
    },
  );
  for (const literal of literals) {
    const trimmed = literal.trim();
    if (trimmed === '') continue;
    out = out.replace(new RegExp(escapeRegExp(trimmed), 'gi'), count('literals', '[redacted]'));
  }
  return { html: out, counts };
}
