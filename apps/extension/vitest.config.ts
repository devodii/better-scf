import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // WxtVitest provides the `@/` alias, auto-imports and an in-memory `browser` (fake chrome.*).
  plugins: [WxtVitest()],
  test: {
    name: 'extension',
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.output/**', '.wxt/**'],
    // fake-indexeddb installs `indexedDB` for the idb layer; jest-dom adds the DOM matchers.
    setupFiles: ['fake-indexeddb/auto', '@testing-library/jest-dom/vitest'],
  },
});
