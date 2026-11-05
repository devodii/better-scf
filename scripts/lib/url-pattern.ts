const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AIRTABLE_RECORD_ID = /^rec[A-Za-z0-9]{14}$/;
const DIGITS = /^\d+$/;
const LONG_HEX = /^[0-9a-f]{16,}$/i;
const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;
const TOKEN_CHARS = /^[A-Za-z0-9_-]{20,}$/;

function isOpaqueToken(value: string): boolean {
  return TOKEN_CHARS.test(value) && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

export function placeholderFor(value: string): string | null {
  if (value === '') return null;
  if (UUID.test(value)) return ':uuid';
  if (AIRTABLE_RECORD_ID.test(value)) return ':recId';
  if (STELLAR_ADDRESS.test(value)) return ':stellarAddress';
  if (DIGITS.test(value)) return ':num';
  if (LONG_HEX.test(value)) return ':hex';
  return null;
}

export function segmentPlaceholderFor(value: string): string | null {
  return placeholderFor(value) ?? (isOpaqueToken(value) ? ':token' : null);
}

function normalizeSegment(segment: string): string {
  const dot = segment.lastIndexOf('.');
  if (dot > 0) {
    const stem = segment.slice(0, dot);
    const placeholder = segmentPlaceholderFor(stem);
    if (placeholder !== null) return `${placeholder}${segment.slice(dot)}`;
  }
  return segmentPlaceholderFor(segment) ?? segment;
}

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
