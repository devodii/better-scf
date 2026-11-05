const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AIRTABLE_RECORD_ID = /^rec[A-Za-z0-9]{14}$/;
const DIGITS = /^\d+$/;
const LONG_HEX = /^[0-9a-f]{16,}$/i;
const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;
const TOKEN_CHARS = /^[A-Za-z0-9_-]{20,}$/;

/** Opaque build ids and session-like path segments: 20+ chars mixing lower case, upper case and digits. */
function isOpaqueToken(value: string): boolean {
  return TOKEN_CHARS.test(value) && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

/**
 * Returns the placeholder (such as `:recId`) a value is replaced with when it is an identifier
 * (uuid, record id, Stellar address, number, long hex), or null when it should be kept as is.
 * Used for object keys in response shapes, where readable keys such as
 * `tranche_3_deliverable_roadmap` must survive.
 */
export function placeholderFor(value: string): string | null {
  if (value === '') return null;
  if (UUID.test(value)) return ':uuid';
  if (AIRTABLE_RECORD_ID.test(value)) return ':recId';
  if (STELLAR_ADDRESS.test(value)) return ':stellarAddress';
  if (DIGITS.test(value)) return ':num';
  if (LONG_HEX.test(value)) return ':hex';
  return null;
}

/** Like `placeholderFor`, plus opaque mixed-case tokens such as a Next.js build id. Path segments only. */
export function segmentPlaceholderFor(value: string): string | null {
  return placeholderFor(value) ?? (isOpaqueToken(value) ? ':token' : null);
}

function normalizeSegment(segment: string): string {
  const dot = segment.lastIndexOf('.');
  // Keep a file extension such as `.json` so `abc123.json` becomes `:token.json`.
  if (dot > 0) {
    const stem = segment.slice(0, dot);
    const placeholder = segmentPlaceholderFor(stem);
    if (placeholder !== null) return `${placeholder}${segment.slice(dot)}`;
  }
  return segmentPlaceholderFor(segment) ?? segment;
}

/**
 * Turns a request URL into a pattern safe to record: ids in the path become placeholders, query
 * values are dropped (only the sorted parameter names stay), the fragment is dropped. Returns
 * null for a string that is not an absolute URL.
 */
export function normalizeUrlPattern(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const path = url.pathname.split('/').map(normalizeSegment).join('/');
  const names = [...new Set([...url.searchParams.keys()])].sort();
  const query = names.length > 0 ? `?${names.join('&')}` : '';
  return `${url.host}${path}${query}`;
}

/** True when the URL is on `host` or one of its sibling subdomains of the same registrable domain. */
export function isFirstParty(rawUrl: string, siteHost: string): boolean {
  let host: string;
  try {
    host = new URL(rawUrl).hostname;
  } catch {
    return false;
  }
  const parts = siteHost.split('.');
  const registrable = parts.slice(-2).join('.');
  return host === registrable || host.endsWith(`.${registrable}`);
}
