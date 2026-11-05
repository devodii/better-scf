import { describe, expect, it } from 'vitest';
import { encodeStrkey } from './detect';
import { daysSince, type FetchLike, fetchHorizonSummary } from './horizon';

const ACCOUNT = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
const CONTRACT = encodeStrkey('contract', new Uint8Array(32).fill(5));
const NOW = Date.parse('2026-11-05T00:00:00Z');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function recordingFetch(respond: () => Promise<Response>): { fn: FetchLike; urls: string[] } {
  const urls: string[] = [];
  return {
    urls,
    fn: (input) => {
      urls.push(input);
      return respond();
    },
  };
}

const horizonBody = {
  account_id: ACCOUNT,
  last_modified_ledger: 123456,
  last_modified_time: '2026-10-26T00:00:00Z',
  balances: [
    { asset_type: 'credit_alphanum4', balance: '5.0000000', asset_code: 'USDC' },
    { asset_type: 'credit_alphanum12', balance: '1.0000000', asset_code: 'LONGCODE' },
    { asset_type: 'native', balance: '100.5000000' },
  ],
};

describe('fetchHorizonSummary', () => {
  it('requests only /accounts/:id and maps the response', async () => {
    const { fn, urls } = recordingFetch(async () => jsonResponse(horizonBody));
    const summary = await fetchHorizonSummary(ACCOUNT, fn, { now: NOW });
    expect(urls).toEqual([`https://horizon.stellar.org/accounts/${ACCOUNT}`]);
    expect(summary).toEqual({
      accountId: ACCOUNT,
      createdAt: null,
      lastModifiedLedger: 123456,
      xlmBalance: '100.5000000',
      trustlines: 2,
      lastActiveAt: '2026-10-26T00:00:00Z',
      fetchedAt: NOW,
    });
  });

  it('uses a custom base url without a double slash', async () => {
    const { fn, urls } = recordingFetch(async () => jsonResponse(horizonBody));
    await fetchHorizonSummary(ACCOUNT, fn, { baseUrl: 'https://h.example/', now: NOW });
    expect(urls).toEqual([`https://h.example/accounts/${ACCOUNT}`]);
  });

  it('fills missing fields with null', async () => {
    const { fn } = recordingFetch(async () => jsonResponse({ account_id: ACCOUNT }));
    const summary = await fetchHorizonSummary(ACCOUNT, fn, { now: NOW });
    expect(summary).toEqual({
      accountId: ACCOUNT,
      createdAt: null,
      lastModifiedLedger: null,
      xlmBalance: null,
      trustlines: 0,
      lastActiveAt: null,
      fetchedAt: NOW,
    });
  });

  it('treats 404 and other error statuses as no data', async () => {
    for (const status of [404, 429, 500]) {
      const { fn } = recordingFetch(async () => jsonResponse({ status }, status));
      expect(await fetchHorizonSummary(ACCOUNT, fn)).toBeNull();
    }
  });

  it('treats network errors as no data', async () => {
    const { fn } = recordingFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await fetchHorizonSummary(ACCOUNT, fn)).toBeNull();
  });

  it('treats malformed bodies as no data', async () => {
    const notJson = recordingFetch(async () => new Response('<html>', { status: 200 }));
    expect(await fetchHorizonSummary(ACCOUNT, notJson.fn)).toBeNull();
    const wrongShape = recordingFetch(async () => jsonResponse({ hello: 'world' }));
    expect(await fetchHorizonSummary(ACCOUNT, wrongShape.fn)).toBeNull();
  });

  it('makes no request for contracts or invalid ids', async () => {
    const { fn, urls } = recordingFetch(async () => jsonResponse(horizonBody));
    expect(await fetchHorizonSummary(CONTRACT, fn)).toBeNull();
    expect(await fetchHorizonSummary('../etc/passwd', fn)).toBeNull();
    expect(urls).toEqual([]);
  });
});

describe('daysSince', () => {
  it('counts whole days', () => {
    expect(daysSince('2026-10-26T00:00:00Z', NOW)).toBe(10);
  });
  it('returns null for missing or unparsable input', () => {
    expect(daysSince(null, NOW)).toBeNull();
    expect(daysSince('not a date', NOW)).toBeNull();
  });
});
