import { createHash } from 'node:crypto';
import { EXTENSION_PUBLIC_KEY } from 'shared';

export function extensionIdFromKey(key: string): string {
  const digest = createHash('sha256').update(Buffer.from(key, 'base64')).digest('hex').slice(0, 32);
  return Array.from(digest, (char) => String.fromCharCode(97 + Number.parseInt(char, 16))).join('');
}

export const PINNED_EXTENSION_ID = extensionIdFromKey(EXTENSION_PUBLIC_KEY);
