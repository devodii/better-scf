import { describe, expect, it } from 'vitest';
import { describeShape, findKeyPaths } from './shape';

describe('describeShape', () => {
  it('keeps keys and types and drops values', () => {
    const shape = describeShape({
      id: 'rec1234567890abcd',
      title: 'Secret project',
      amount: 5000,
      tags: ['a', 'b'],
      owner: { email: 'a@b.co', verified: true, note: null },
      empty: [],
    });
    expect(shape).toEqual({
      id: 'string',
      title: 'string',
      amount: 'number',
      tags: ['string'],
      owner: { email: 'string', verified: 'boolean', note: 'null' },
      empty: [],
    });
    expect(JSON.stringify(shape)).not.toContain('Secret');
  });

  it('replaces id-like object keys and merges array items', () => {
    const shape = describeShape({ rec1234567890abcd: { n: 1 }, items: [{ a: 1 }, { b: 'x' }] });
    expect(shape).toEqual({ ':recId': { n: 'number' }, items: [{ a: 'number', b: 'string' }] });
  });
});

describe('describeShape readable keys', () => {
  it('keeps long readable keys that contain digits and replaces only real ids', () => {
    const shape = describeShape({
      tranche_3_deliverable_roadmap: 'x',
      stellar_community_fund_round_46: 1,
      aB3dE5gH7jK9mN1pQ3sT: 'kept: opaque tokens are only replaced in URL paths',
      '12345': 1,
    });
    expect(shape).toEqual({
      tranche_3_deliverable_roadmap: 'string',
      stellar_community_fund_round_46: 'number',
      aB3dE5gH7jK9mN1pQ3sT: 'string',
      ':num': 'number',
    });
  });
});

describe('findKeyPaths', () => {
  it('returns dotted paths of keys matching the pattern', () => {
    const shape = describeShape({ track: 'x', rows: [{ comments: [], meta: { Track: 1 } }] });
    expect(findKeyPaths(shape, /track|comment/i)).toEqual([
      'track',
      'rows[].comments',
      'rows[].meta.Track',
    ]);
  });
});
