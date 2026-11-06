export type StrkeyKind = "account" | "contract";

const CANDIDATE = /(?<![A-Za-z0-9])[GC][A-Z2-7]{55}(?![A-Za-z0-9])/g;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ENCODED_LENGTH = 56;
const DECODED_LENGTH = 35;
const VERSION_BYTE: Record<StrkeyKind, number> = {
  account: 6 << 3,
  contract: 2 << 3,
};

export interface DetectedAddresses {
  accounts: string[];
  contracts: string[];
}

function decode(value: string): Uint8Array | null {
  const bytes = new Uint8Array(DECODED_LENGTH);
  let bits = 0;
  let buffer = 0;
  let at = 0;
  for (const char of value) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) return null;
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes[at++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes;
}

function checksum(bytes: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < DECODED_LENGTH - 2; i++) {
    crc ^= (bytes[i] ?? 0) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function isValidStrkey(value: string, kind: StrkeyKind): boolean {
  if (value.length !== ENCODED_LENGTH) return false;
  const bytes = decode(value);
  if (!bytes || bytes[0] !== VERSION_BYTE[kind]) return false;
  return checksum(bytes) === (((bytes[34] ?? 0) << 8) | (bytes[33] ?? 0));
}

export const isValidAccountId = (value: string): boolean =>
  isValidStrkey(value, "account");
export const isValidContractId = (value: string): boolean =>
  isValidStrkey(value, "contract");

export function detectStellarAddresses(text: string): DetectedAddresses {
  const accounts: string[] = [];
  const contracts: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(CANDIDATE)) {
    const candidate = match[0];
    if (seen.has(candidate)) continue;
    if (candidate.startsWith("G") && isValidAccountId(candidate)) {
      seen.add(candidate);
      accounts.push(candidate);
    } else if (candidate.startsWith("C") && isValidContractId(candidate)) {
      seen.add(candidate);
      contracts.push(candidate);
    }
  }
  return { accounts, contracts };
}
