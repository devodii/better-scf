import { SITE_ORIGIN } from './routes';

export type SignedInState = 'signed-in' | 'signed-out' | 'unknown';

const HEAD_BYTES = 8;
const MEMO_MS = 30_000;

let memo: { at: number; state: SignedInState } | null = null;

function classify(head: string): SignedInState {
  const text = head.trim();
  if (text.startsWith('null') || text.replace(/\s/g, '').startsWith('{}')) return 'signed-out';
  if (text.startsWith('{"')) return 'signed-in';
  return 'unknown';
}

export async function readSignedInState(): Promise<SignedInState> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.state;
  let state: SignedInState = 'unknown';
  try {
    const response = await fetch(`${SITE_ORIGIN}/api/auth/session`, { credentials: 'include' });
    const reader = response.body?.getReader();
    if (response.ok && reader) {
      const { value } = await reader.read();
      await reader.cancel();
      state = value ? classify(new TextDecoder().decode(value.slice(0, HEAD_BYTES))) : 'unknown';
    }
  } catch {
    state = 'unknown';
  }
  memo = { at: Date.now(), state };
  return state;
}
