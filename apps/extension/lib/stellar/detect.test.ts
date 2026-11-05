import { describe, expect, it } from 'vitest';
import {
  detectStellarAddresses,
  encodeStrkey,
  isValidAccountId,
  isValidContractId,
} from './detect';

const KNOWN_ACCOUNT = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
const ZERO_ACCOUNT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const ZERO_CONTRACT = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

const payload = (seed: number) => Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + seed) & 0xff);
const account2 = encodeStrkey('account', payload(1));
const account3 = encodeStrkey('account', payload(2));
const contract2 = encodeStrkey('contract', payload(3));

/** Same key with one character changed, so the checksum no longer matches. */
function corrupt(key: string): string {
  const index = 20;
  const replacement = key.charAt(index) === 'A' ? 'B' : 'A';
  return key.slice(0, index) + replacement + key.slice(index + 1);
}

describe('strkey validation', () => {
  it('accepts known valid keys', () => {
    expect(isValidAccountId(KNOWN_ACCOUNT)).toBe(true);
    expect(isValidAccountId(ZERO_ACCOUNT)).toBe(true);
    expect(isValidContractId(ZERO_CONTRACT)).toBe(true);
  });

  it('accepts generated keys of both kinds', () => {
    expect(isValidAccountId(account2)).toBe(true);
    expect(isValidContractId(contract2)).toBe(true);
    expect(account2.startsWith('G')).toBe(true);
    expect(contract2.startsWith('C')).toBe(true);
  });

  it('rejects a bad checksum', () => {
    expect(isValidAccountId(corrupt(KNOWN_ACCOUNT))).toBe(false);
    expect(isValidContractId(corrupt(contract2))).toBe(false);
  });

  it('rejects the wrong version byte for the kind', () => {
    expect(isValidContractId(KNOWN_ACCOUNT)).toBe(false);
    expect(isValidAccountId(contract2)).toBe(false);
    // Right checksum for a muxed/secret style version byte is still not an account.
    expect(isValidAccountId(`S${KNOWN_ACCOUNT.slice(1)}`)).toBe(false);
  });

  it('rejects wrong length and characters outside base32', () => {
    expect(isValidAccountId(KNOWN_ACCOUNT.slice(0, 55))).toBe(false);
    expect(isValidAccountId(`${KNOWN_ACCOUNT}A`)).toBe(false);
    expect(isValidAccountId(`${KNOWN_ACCOUNT.slice(0, 55)}1`)).toBe(false);
    expect(isValidAccountId(KNOWN_ACCOUNT.toLowerCase())).toBe(false);
    expect(isValidAccountId('')).toBe(false);
  });
});

describe('detectStellarAddresses', () => {
  it('returns deduplicated accounts and contracts in order of appearance', () => {
    const text = `Pay ${account3}, then ${account2}. Contract ${contract2}; again ${account3} and ${contract2}.`;
    expect(detectStellarAddresses(text)).toEqual({
      accounts: [account3, account2],
      contracts: [contract2],
    });
  });

  it('finds keys next to punctuation and inside markup-like text', () => {
    const text = `(${account2}) "${contract2}" <${account3}>`;
    expect(detectStellarAddresses(text)).toEqual({
      accounts: [account2, account3],
      contracts: [contract2],
    });
  });

  it('skips near misses', () => {
    const text = [
      corrupt(KNOWN_ACCOUNT),
      KNOWN_ACCOUNT.slice(0, 55),
      `X${KNOWN_ACCOUNT.slice(1)}`,
      KNOWN_ACCOUNT.toLowerCase(),
      `${KNOWN_ACCOUNT}A`,
      `A${KNOWN_ACCOUNT}`,
      `${KNOWN_ACCOUNT}_extra`.replace('_', '9'),
    ].join(' ');
    expect(detectStellarAddresses(text)).toEqual({ accounts: [], contracts: [] });
  });

  it('does not take a key out of a longer alphanumeric run', () => {
    expect(detectStellarAddresses(`0${account2}`)).toEqual({ accounts: [], contracts: [] });
    expect(detectStellarAddresses(`${account2}0`)).toEqual({ accounts: [], contracts: [] });
  });

  it('handles empty and overlong text without trouble', () => {
    expect(detectStellarAddresses('')).toEqual({ accounts: [], contracts: [] });
    const filler = 'lorem ipsum G dolor sit amet '.repeat(40_000);
    const long = `${filler}${account2} ${'A'.repeat(200_000)} ${contract2} ${filler}`;
    expect(detectStellarAddresses(long)).toEqual({ accounts: [account2], contracts: [contract2] });
  });
});
