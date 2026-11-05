import { describe, expect, it } from 'vitest';
import {
  CHAT_LIMITS,
  chatError,
  EXTENSION_VERSION,
  findQuickPrompt,
  parseChatError,
  parseChatRequest,
  QUICK_PROMPTS,
} from '../src/index';

const base = {
  submissionId: 'rec123',
  contentHash: 'abc',
  page: 'submission',
  context: 'ctx',
  messages: [{ role: 'user', content: 'hi' }],
};

describe('chat request', () => {
  it('accepts a valid request, with and without promptId', () => {
    expect(parseChatRequest(base).ok).toBe(true);
    const withPrompt = parseChatRequest({ ...base, promptId: 'summarize-5' });
    expect(withPrompt.ok && withPrompt.data.promptId).toBe('summarize-5');
  });

  it('never throws on garbage', () => {
    for (const input of [null, undefined, 5, 'x', [], {}]) {
      expect(parseChatRequest(input).ok).toBe(false);
    }
  });

  it('limits messages to 20 and requires at least one', () => {
    const msg = { role: 'user', content: 'a' };
    expect(
      parseChatRequest({ ...base, messages: Array(CHAT_LIMITS.maxMessages).fill(msg) }).ok,
    ).toBe(true);
    expect(
      parseChatRequest({ ...base, messages: Array(CHAT_LIMITS.maxMessages + 1).fill(msg) }).ok,
    ).toBe(false);
    expect(parseChatRequest({ ...base, messages: [] }).ok).toBe(false);
  });

  it('limits user messages to 2000 characters', () => {
    const at = [{ role: 'user', content: 'a'.repeat(2000) }];
    const over = [{ role: 'user', content: 'a'.repeat(2001) }];
    expect(parseChatRequest({ ...base, messages: at }).ok).toBe(true);
    expect(parseChatRequest({ ...base, messages: over }).ok).toBe(false);
  });

  it('limits assistant messages to 6000 characters', () => {
    const user = { role: 'user', content: 'q' };
    const at = [user, { role: 'assistant', content: 'a'.repeat(6000) }, user];
    const over = [user, { role: 'assistant', content: 'a'.repeat(6001) }, user];
    expect(parseChatRequest({ ...base, messages: at }).ok).toBe(true);
    expect(parseChatRequest({ ...base, messages: over }).ok).toBe(false);
  });

  it('rejects empty and whitespace-only content for both roles', () => {
    for (const role of ['user', 'assistant']) {
      for (const content of ['', '   ', '\n\t ']) {
        const result = parseChatRequest({ ...base, messages: [{ role, content }] });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('content must not be empty');
      }
    }
  });

  it('limits context to 24000 characters', () => {
    expect(parseChatRequest({ ...base, context: 'a'.repeat(24000) }).ok).toBe(true);
    expect(parseChatRequest({ ...base, context: 'a'.repeat(24001) }).ok).toBe(false);
  });

  it('rejects a bad role, page, missing ids and empty promptId', () => {
    expect(parseChatRequest({ ...base, messages: [{ role: 'system', content: 'x' }] }).ok).toBe(
      false,
    );
    expect(parseChatRequest({ ...base, page: 'other' }).ok).toBe(false);
    expect(parseChatRequest({ ...base, submissionId: '' }).ok).toBe(false);
    expect(parseChatRequest({ ...base, contentHash: undefined }).ok).toBe(false);
    expect(parseChatRequest({ ...base, promptId: '' }).ok).toBe(false);
    expect(
      parseChatRequest({ ...base, promptId: 'p'.repeat(CHAT_LIMITS.maxPromptIdChars + 1) }).ok,
    ).toBe(false);
  });

  it('limits id lengths', () => {
    expect(parseChatRequest({ ...base, submissionId: 'a'.repeat(CHAT_LIMITS.maxIdChars) }).ok).toBe(
      true,
    );
    expect(
      parseChatRequest({ ...base, submissionId: 'a'.repeat(CHAT_LIMITS.maxIdChars + 1) }).ok,
    ).toBe(false);
  });
});

describe('chat error', () => {
  it('builds and parses error bodies', () => {
    const plain = chatError('bad_request', 'nope');
    expect(plain).toEqual({ error: { code: 'bad_request', message: 'nope' } });
    const limited = chatError('daily_limit', 'slow down', 60);
    expect(parseChatError(limited)).toEqual({ ok: true, data: limited });
  });

  it('rejects unknown codes and wrong shapes', () => {
    expect(parseChatError({ error: { code: 'boom', message: 'x' } }).ok).toBe(false);
    expect(
      parseChatError({ error: { code: 'internal', message: 'x', retryAfterSeconds: -1 } }).ok,
    ).toBe(false);
    expect(parseChatError(null).ok).toBe(false);
  });
});

describe('constants', () => {
  it('has the spec limits and a semver version', () => {
    expect(CHAT_LIMITS.maxMessages).toBe(20);
    expect(CHAT_LIMITS.maxUserMessageChars).toBe(2000);
    expect(CHAT_LIMITS.maxAssistantMessageChars).toBe(6000);
    expect(CHAT_LIMITS.maxContextChars).toBe(24000);
    expect(EXTENSION_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has the eight quick prompts with unique stable ids and both scopes', () => {
    expect(QUICK_PROMPTS).toHaveLength(8);
    expect(new Set(QUICK_PROMPTS.map((p) => p.id)).size).toBe(8);
    expect(QUICK_PROMPTS.filter((p) => p.scope === 'round')).toHaveLength(2);
    expect(findQuickPrompt('summarize-5')?.text).toBe('Summarize in 5 bullets');
    expect(findQuickPrompt('missing')).toBeUndefined();
    for (const p of QUICK_PROMPTS)
      expect(p.text.length).toBeLessThanOrEqual(CHAT_LIMITS.maxUserMessageChars);
  });
});
