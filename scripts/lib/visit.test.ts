import { describe, expect, it, vi } from 'vitest';
import type { PageSpec } from './cli';
import { callKey } from './recon-report';
import { createPageTracker, isTimeoutError, type Navigable, visitWith } from './visit';

const specs: PageSpec[] = [
  { name: 'round', url: 'https://communityfund.stellar.org/round/46' },
  { name: 'project', url: 'https://communityfund.stellar.org/project/x' },
];

/** A fake tab: `goto` fires the response listener for each URL, like the browser does mid-navigation. */
function fakePage(
  onResponse: (url: string) => void,
  failFor: Record<string, Error> = {},
): Navigable {
  return {
    setDefaultTimeout: () => undefined,
    goto: async (url) => {
      onResponse(`${url}/api/data`);
      const failure = failFor[url];
      if (failure) throw failure;
    },
  };
}

describe('page attribution', () => {
  it('is empty before any page begins', () => {
    expect(createPageTracker().current()).toBe('');
  });

  it('attributes responses that arrive during a navigation to that page, not the previous one', async () => {
    const tracker = createPageTracker();
    const keys: string[] = [];
    const page = fakePage((url) =>
      keys.push(callKey({ page: tracker.current(), method: 'GET', pattern: url, status: 200 })),
    );

    await visitWith(page, specs, 0, {
      beforeNavigate: (spec) => tracker.begin(spec.name),
      onPage: async () => undefined,
    });

    expect(keys).toEqual([
      'round GET https://communityfund.stellar.org/round/46/api/data 200',
      'project GET https://communityfund.stellar.org/project/x/api/data 200',
    ]);
  });

  it('calls beforeNavigate before goto for each page', async () => {
    const order: string[] = [];
    const page: Navigable = {
      setDefaultTimeout: () => undefined,
      goto: async (url) => {
        order.push(`goto ${url}`);
      },
    };
    await visitWith(page, specs, 0, {
      beforeNavigate: (spec) => order.push(`before ${spec.name}`),
      onPage: async (_page, spec) => {
        order.push(`done ${spec.name}`);
      },
    });
    expect(order).toEqual([
      'before round',
      `goto ${specs[0]?.url}`,
      'done round',
      'before project',
      `goto ${specs[1]?.url}`,
      'done project',
    ]);
  });
});

describe('visitWith failures', () => {
  it('reports a network-idle timeout clearly, skips the page and does not retry', async () => {
    const timeout = new Error('page.goto: Timeout 45000ms exceeded.');
    timeout.name = 'TimeoutError';
    const goto = vi.fn(async (url: string) => {
      if (url === specs[0]?.url) throw timeout;
    });
    const page: Navigable = { setDefaultTimeout: () => undefined, goto };
    const onPage = vi.fn(async () => undefined);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await visitWith(page, specs, 0, { beforeNavigate: () => undefined, onPage });

    expect(goto).toHaveBeenCalledTimes(2);
    expect(onPage).toHaveBeenCalledTimes(1);
    expect(result.visited).toEqual(['project']);
    expect(result.skipped).toEqual([
      { name: 'round', reason: 'timeout', message: timeout.message },
    ]);
    expect(errors.mock.calls.flat().join('\n')).toMatch(/SKIPPED round: timed out .*network idle/);
    errors.mockRestore();
  });

  it('recognises timeouts by name or message only', () => {
    expect(isTimeoutError(new Error('Timeout 1ms exceeded'))).toBe(true);
    expect(isTimeoutError(new Error('net::ERR_FAILED'))).toBe(false);
    expect(isTimeoutError('timeout')).toBe(false);
  });
});
