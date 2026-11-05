# MCP servers

Loaded by `work` through `--mcp-dir <repo>/mcp`. Servers connect only when a session starts.

- `playwright.json`: the browser for visual checks and screenshots (`docs/verification/pw-shot-*.png`, gitignored).
  Deviation from the team template: no `--sandbox`, by the decision of the repository owner for unattended runs.
  Roles use this config as it is and never edit it.
