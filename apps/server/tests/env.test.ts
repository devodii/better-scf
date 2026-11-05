import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/env.js';

describe('parseEnv', () => {
  it('applies defaults and splits extension ids', () => {
    const result = parseEnv({ ANTHROPIC_API_KEY: 'k', ALLOWED_EXTENSION_IDS: ' aaa, bbb ,,' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.env.ALLOWED_EXTENSION_IDS).toEqual(['aaa', 'bbb']);
      expect(result.env).toMatchObject({
        PORT: 8787,
        DAILY_CAP_PER_CLIENT: 40,
        BURST_PER_MINUTE: 6,
        GLOBAL_DAILY_CAP: 3000,
        MODEL: 'claude-sonnet-4-5',
        NODE_ENV: 'production',
      });
    }
  });

  it('treats blank values from .env.example as unset', () => {
    const result = parseEnv({ ANTHROPIC_API_KEY: 'k', ALLOWED_EXTENSION_IDS: '', PORT: '' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.env.ALLOWED_EXTENSION_IDS).toEqual([]);
      expect(result.env.PORT).toBe(8787);
    }
  });

  it('fails with a clear message naming ANTHROPIC_API_KEY when it is missing outside test', () => {
    for (const source of [{}, { ANTHROPIC_API_KEY: '' }, { NODE_ENV: 'development' }]) {
      const result = parseEnv(source);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('ANTHROPIC_API_KEY');
      }
    }
  });

  it('does not require the key in test mode', () => {
    expect(parseEnv({ NODE_ENV: 'test' }).ok).toBe(true);
  });

  it('rejects invalid numbers and never echoes values', () => {
    const result = parseEnv({ ANTHROPIC_API_KEY: 'sk-ant-secret', PORT: 'abc' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('PORT');
      expect(result.message).not.toContain('sk-ant-secret');
      expect(result.message).not.toContain('abc');
    }
  });
});
