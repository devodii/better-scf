import { describe, expect, it } from 'vitest';
import {
  isFirstParty,
  normalizeUrlPattern,
  placeholderFor,
  segmentPlaceholderFor,
} from './url-pattern';

const ADDRESS = `G${'A'.repeat(55)}`;

describe('placeholderFor', () => {
  it('recognises ids and leaves words alone', () => {
    expect(placeholderFor('rec1234567890abcd')).toBe(':recId');
    expect(placeholderFor('123e4567-e89b-12d3-a456-426614174000')).toBe(':uuid');
    expect(placeholderFor(ADDRESS)).toBe(':stellarAddress');
    expect(placeholderFor('46')).toBe(':num');
    expect(placeholderFor('deadbeefdeadbeef00')).toBe(':hex');
    expect(placeholderFor('submissions')).toBeNull();
    expect(placeholderFor('')).toBeNull();
  });

  it('keeps readable keys and slugs, even long ones with digits', () => {
    expect(placeholderFor('tranche_3_deliverable_roadmap')).toBeNull();
    expect(placeholderFor('aB3dE5gH7jK9mN1pQ3sT')).toBeNull(); // opaque tokens are path-only
    expect(segmentPlaceholderFor('tranche_3_deliverable_roadmap')).toBeNull();
    expect(segmentPlaceholderFor('stellar-community-fund-round-46-results')).toBeNull();
  });
});

describe('segmentPlaceholderFor', () => {
  it('replaces opaque mixed-case tokens and still handles plain ids', () => {
    expect(segmentPlaceholderFor('aB3dE5gH7jK9mN1pQ3sT')).toBe(':token');
    expect(segmentPlaceholderFor('46')).toBe(':num');
    expect(segmentPlaceholderFor('short1A')).toBeNull();
  });
});

describe('normalizeUrlPattern', () => {
  it('replaces ids in the path and drops query values', () => {
    expect(
      normalizeUrlPattern(
        'https://communityfund.stellar.org/api/submissions/rec1234567890abcd?b=2&a=secret',
      ),
    ).toBe('communityfund.stellar.org/api/submissions/:recId?a&b');
  });

  it('keeps a file extension and drops the fragment', () => {
    expect(
      normalizeUrlPattern(
        'https://communityfund.stellar.org/_next/data/aB3dE5gH7jK9mN1pQ3sT/round/46.json#x',
      ),
    ).toBe('communityfund.stellar.org/_next/data/:token/round/:num.json');
  });

  it('keeps readable long slugs with digits in the path', () => {
    expect(
      normalizeUrlPattern('https://communityfund.stellar.org/rounds/tranche_3_deliverable_roadmap'),
    ).toBe('communityfund.stellar.org/rounds/tranche_3_deliverable_roadmap');
  });

  it('returns null for a relative or invalid URL', () => {
    expect(normalizeUrlPattern('/api/x')).toBeNull();
  });
});

describe('isFirstParty', () => {
  it('accepts the site and sibling subdomains only', () => {
    const site = 'communityfund.stellar.org';
    expect(isFirstParty('https://communityfund.stellar.org/a', site)).toBe(true);
    expect(isFirstParty('https://api.stellar.org/a', site)).toBe(true);
    expect(isFirstParty('https://evil-stellar.org/a', site)).toBe(false);
    expect(isFirstParty('https://www.google-analytics.com/c', site)).toBe(false);
  });
});
