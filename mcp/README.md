# MCP servers

Loaded by `work` through `--mcp-dir <repo>/mcp`. Servers connect only when a session starts.

- `playwright.json`: the browser for visual checks and screenshots (`docs/verification/pw-shot-*.png`, gitignored).
  Deviation from the team template: no `--sandbox`, by the decision of the repository owner for unattended runs.
  Roles use this config as it is and never edit it.
- `storybook.json`: the Storybook MCP (`@storybook/addon-mcp`), served by the Storybook dev server at `http://localhost:6006/mcp`.
  Start `pnpm storybook` and wait until it answers before launching the session; a session started without it never gets the `mcp__storybook__*` tools, and starting Storybook later does not fix that session.
  Unverified: this JSON form is a translation of the documented `npx mcp-add --type http` CLI form.
  The test toolset is off because no test addon is installed.
- `stellarlight.json`: the Stellarlight MCP (`@stellar-light/scout-mcp`, run with `npx`), for exploring Stellarlight's tools and data while working on the repository.
  Nothing in the shipped extension or server uses it: the assistant calls Stellarlight's public API directly from `apps/server/src/ai/stellarlight.ts`.
  Claude Code no longer picks it up from the repository root, so start a session with `--mcp-config mcp/stellarlight.json`, or let `work` load it through `--mcp-dir`.
