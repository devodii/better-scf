import { defineConfig } from 'vitest/config';

// Vitest 5 has no `vitest.workspace.ts`; projects are declared here instead.
// Running `vitest` at the repo root runs every package with that package's own config
// (packages/shared has none and uses the defaults).
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: ['apps/extension', 'apps/server', 'packages/shared', 'scripts'],
  },
});
