import { StrKey } from '@stellar/stellar-base';

export type StrkeyKind = 'account' | 'contract';

const CANDIDATE = /(?<![A-Za-z0-9])[GC][A-Z2-7]{55}(?![A-Za-z0-9])/g;

export interface DetectedAddresses {
  accounts: string[];
  contracts: string[];
}

export function isValidStrkey(value: string, kind: StrkeyKind): boolean {
  return kind === 'account' ? StrKey.isValidEd25519PublicKey(value) : StrKey.isValidContract(value);
}

export const isValidAccountId = (value: string): boolean => isValidStrkey(value, 'account');
export const isValidContractId = (value: string): boolean => isValidStrkey(value, 'contract');

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
