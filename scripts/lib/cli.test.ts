import { describe, expect, it } from 'vitest';
import { parseCli } from './cli';

const ROUND = 'round=https://communityfund.stellar.org/rounds/46';

describe('parseCli', () => {
  it('parses pages, delay and literals to redact', () => {
    const options = parseCli([
      '--',
      ROUND,
      'my-projects=https://communityfund.stellar.org/projects',
      '--delay-ms',
      '3000',
      '--redact',
      'Jane Doe, John',
    ]);
    expect(options.pages.map((p) => p.name)).toEqual(['round', 'my-projects']);
    expect(options.delayMs).toBe(3000);
    expect(options.redact).toEqual(['Jane Doe', 'John']);
  });

  it('uses a default pause of several seconds', () => {
    expect(parseCli([ROUND]).delayMs).toBeGreaterThanOrEqual(2000);
  });

  it('rejects other hosts, http, bad names, duplicates and too short a pause', () => {
    expect(() => parseCli(['x=https://example.com/a'])).toThrow(/communityfund/);
    expect(() => parseCli(['x=http://communityfund.stellar.org/a'])).toThrow();
    expect(() => parseCli(['Bad_Name=https://communityfund.stellar.org/a'])).toThrow(/Page name/);
    expect(() => parseCli([ROUND, ROUND])).toThrow(/twice/);
    expect(() => parseCli([ROUND, '--delay-ms', '100'])).toThrow(/delay-ms/);
    expect(() => parseCli([])).toThrow();
  });

  it('caps the number of pages', () => {
    const many = Array.from(
      { length: 9 },
      (_, i) => `p${i}=https://communityfund.stellar.org/${i}`,
    );
    expect(() => parseCli(many)).toThrow(/At most/);
  });
});
