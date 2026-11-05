import { SITE_ORIGIN } from './routes';

export type SessionResult =
  | { status: 'ok'; token: string }
  | { status: 'not-logged-in' }
  | { status: 'failed' };

const SESSION_URL = `${SITE_ORIGIN}/api/auth/session`;
const TIMEOUT_MS = 10_000;

let pending: Promise<SessionResult> | null = null;

async function readSession(): Promise<SessionResult> {
  try {
    const response = await fetch(SESSION_URL, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { status: 'failed' };
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return { status: 'not-logged-in' };
    const token = 'accessToken' in body ? body.accessToken : null;
    if (typeof token !== 'string' || token.length === 0) return { status: 'not-logged-in' };
    return { status: 'ok', token };
  } catch {
    return { status: 'failed' };
  }
}

export function getSession(): Promise<SessionResult> {
  pending ??= readSession().finally(() => {
    pending = null;
  });
  return pending;
}
