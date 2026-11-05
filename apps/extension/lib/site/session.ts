import { AppError, assertNever } from '../errors';
import { SITE_ORIGIN } from './routes';

export type SessionErrorKind = 'not-logged-in' | 'failed';

export class SessionError extends AppError<SessionErrorKind> {
  readonly status: number | undefined;

  private constructor(kind: SessionErrorKind, message: string, status: number | undefined) {
    super({ name: 'SessionError', kind, message });
    this.status = status;
  }

  static notLoggedIn(): SessionError {
    return new SessionError('not-logged-in', 'No signed-in session was found.', undefined);
  }

  static failed(status?: number): SessionError {
    const message =
      status === undefined
        ? 'The session could not be read.'
        : `The session request returned ${status}.`;
    return new SessionError('failed', message, status);
  }

  userMessage(): string {
    switch (this.kind) {
      case 'not-logged-in':
        return "You're not signed in to the Community Fund. Sign in on the site, then try again.";
      case 'failed':
        return 'Your Community Fund session could not be read. Please try again.';
      default:
        return assertNever(this.kind);
    }
  }
}

export type SessionResult = { ok: true; token: string } | { ok: false; error: SessionError };

const SESSION_URL = `${SITE_ORIGIN}/api/auth/session`;
const TIMEOUT_MS = 10_000;

let pending: Promise<SessionResult> | null = null;

function failure(error: SessionError): SessionResult {
  return { ok: false, error };
}

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
    if (!response.ok) return failure(SessionError.failed(response.status));
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return failure(SessionError.notLoggedIn());
    const token = 'accessToken' in body ? body.accessToken : null;
    if (typeof token !== 'string' || token.length === 0) {
      return failure(SessionError.notLoggedIn());
    }
    return { ok: true, token };
  } catch {
    return failure(SessionError.failed());
  }
}

export function getSession(): Promise<SessionResult> {
  pending ??= readSession().finally(() => {
    pending = null;
  });
  return pending;
}
