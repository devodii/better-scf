/** Stellar strkey detection (spec 5.4, 6.5): real checksum, no dependency. */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Version bytes: account ids (G...) are 6 << 3, contract ids (C...) are 2 << 3. */
const VERSION_BYTE = { account: 6 << 3, contract: 2 << 3 } as const;

export type StrkeyKind = keyof typeof VERSION_BYTE;

const PAYLOAD_BYTES = 32;
const STRKEY_LENGTH = 56;

/** A G or C followed by 55 base32 characters, not embedded in a longer alphanumeric run. */
const CANDIDATE = /(?<![A-Za-z0-9])[GC][A-Z2-7]{55}(?![A-Za-z0-9])/g;

export interface DetectedAddresses {
  accounts: string[];
  contracts: string[];
}

function crc16Xmodem(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function base32Decode(text: string): Uint8Array | null {
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) return null;
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }
  // 56 chars = 280 bits = exactly 35 bytes; leftover bits must be zero padding.
  if (buffer !== 0) return null;
  return Uint8Array.from(out);
}

function base32Encode(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += BASE32_ALPHABET.charAt((buffer >> bits) & 31);
      buffer &= (1 << bits) - 1;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET.charAt((buffer << (5 - bits)) & 31);
  return out;
}

/** Encodes a 32 byte payload as a strkey. Exported so tests can build valid keys. */
export function encodeStrkey(kind: StrkeyKind, payload: Uint8Array): string {
  if (payload.length !== PAYLOAD_BYTES) throw new Error('strkey payload must be 32 bytes');
  const body = new Uint8Array(PAYLOAD_BYTES + 1);
  body[0] = VERSION_BYTE[kind];
  body.set(payload, 1);
  const crc = crc16Xmodem(body);
  const full = new Uint8Array(body.length + 2);
  full.set(body, 0);
  full[body.length] = crc & 0xff;
  full[body.length + 1] = crc >> 8;
  return base32Encode(full);
}

/** True when `value` is a well formed strkey of the given kind with a correct checksum. */
export function isValidStrkey(value: string, kind: StrkeyKind): boolean {
  if (value.length !== STRKEY_LENGTH) return false;
  const bytes = base32Decode(value);
  if (!bytes || bytes.length !== PAYLOAD_BYTES + 3) return false;
  if (bytes[0] !== VERSION_BYTE[kind]) return false;
  const body = bytes.subarray(0, PAYLOAD_BYTES + 1);
  const crc = crc16Xmodem(body);
  return bytes[PAYLOAD_BYTES + 1] === (crc & 0xff) && bytes[PAYLOAD_BYTES + 2] === crc >> 8;
}

export const isValidAccountId = (value: string): boolean => isValidStrkey(value, 'account');
export const isValidContractId = (value: string): boolean => isValidStrkey(value, 'contract');

/** Finds every valid G and C strkey in `text`, deduplicated, in order of appearance. */
export function detectStellarAddresses(text: string): DetectedAddresses {
  const accounts: string[] = [];
  const contracts: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(CANDIDATE)) {
    const candidate = match[0];
    if (seen.has(candidate)) continue;
    if (candidate.startsWith('G') && isValidAccountId(candidate)) {
      seen.add(candidate);
      accounts.push(candidate);
    } else if (candidate.startsWith('C') && isValidContractId(candidate)) {
      seen.add(candidate);
      contracts.push(candidate);
    }
  }
  return { accounts, contracts };
}
