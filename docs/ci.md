# CI and secrets

Workflows live in `.github/workflows/`. Every step calls a root or package `pnpm` script; Node comes from `.nvmrc` and pnpm from the `packageManager` field.

## Workflows

| File | Trigger | What it does |
|---|---|---|
| `ci.yml` | push to `main`, pull requests | `check` (lint, typecheck, test), `build-extension` (build, zip, upload `better-scf-<version>.zip` for 14 days), `build-server` (build, start with fake values, `curl /health`), `secrets-scan` (gitleaks plus a failing grep for Anthropic key shaped strings). |
| `release-extension.yml` | tag `v*` | Fails first if `WXT_SERVER_URL` is unset or the tagged commit is not reachable from `origin/main`, then re-checks, builds and zips the extension, creates a GitHub Release with the zip and generated notes. The tag must equal `v<root package.json version>`. An optional job publishes to the Chrome Web Store when its four secrets exist. |
| `deploy-server.yml` | push to `main` touching `apps/server/**` or `packages/shared/**`, manual dispatch | Re-checks, then `railway up --service better-scf-server --detach` from the repository root (the server Dockerfile needs the root as its build context), then polls `<SERVER_URL>/health` for up to 60 seconds. Runs from `main` only. |

Pull requests from forks get no secrets: CI jobs need none, and the deploy and release workflows never run for them.

## One time setup (done by a human)

### Secrets (Settings, Secrets and variables, Actions, Secrets)

| Name | Needed by | How to get it |
|---|---|---|
| `RAILWAY_TOKEN` | `deploy-server.yml` | Railway project, Settings, Tokens, create a project token for the production environment. If absent the deploy job skips with a notice in its summary. |
| `CWS_CLIENT_ID` | optional Chrome Web Store publish | Google Cloud OAuth client with the Chrome Web Store API enabled. |
| `CWS_CLIENT_SECRET` | optional Chrome Web Store publish | Same OAuth client. |
| `CWS_REFRESH_TOKEN` | optional Chrome Web Store publish | OAuth refresh token for the publisher account (see the `chrome-webstore-upload-cli` help for the one time flow). |
| `CWS_EXTENSION_ID` | optional Chrome Web Store publish | The extension id from the Chrome Web Store developer dashboard. |

The publish job runs on every release but does nothing, and writes a "Skipped" line to its summary, unless all four `CWS_*` secrets are set. `GITHUB_TOKEN` is provided by GitHub and needs no setup.

### Variables (Settings, Secrets and variables, Actions, Variables)

| Name | Needed by | Value |
|---|---|---|
| `WXT_SERVER_URL` | extension builds in `ci.yml` and `release-extension.yml` | Public base URL of the deployed server, for example `https://<service>.up.railway.app`. A release fails immediately if it is unset. `ci.yml` falls back to `http://localhost:8787` when it is unset (an empty value would make `new URL()` in `wxt.config.ts` throw); CI builds are never released. |
| `SERVER_URL` | health poll in `deploy-server.yml` | Same public base URL, no trailing slash needed. |

### Railway service environment (set in the Railway dashboard, never in GitHub)

`ANTHROPIC_API_KEY`, `ALLOWED_EXTENSION_IDS`, `MODEL`, `DAILY_CAP_PER_CLIENT`, `BURST_PER_MINUTE`, `GLOBAL_DAILY_CAP`, `NODE_ENV=production`. The service must be named `better-scf-server`.

Railway one time setup in the dashboard:

- Set the service's config-as-code file path to `/apps/server/railway.toml`. That file sets the Dockerfile path (`apps/server/Dockerfile`) relative to the repository root, which is the build context because `railway up` uploads the repository root.
- Optional: attach a volume mounted at `/data` for the sqlite answer cache. The image runs as the non-root `node` user while Railway mounts volumes owned by root, so also set the service variable `RAILWAY_RUN_UID=0`. Without a volume the server falls back to its in-memory cache.

## Notes

- The smoke start in `ci.yml` uses fake values (`ANTHROPIC_API_KEY=ci-fake-key`); the model is never called.
- The secrets scan fails on key shaped strings (`sk-ant-` followed by 20 or more key characters), not on the bare prefix, because `docs/build-spec.md` names the prefix.
- The `check` jobs have no display name, so branch protection lists them as `check`.
- The Anthropic key never exists in GitHub; it lives only in Railway.
- Cutting a release: bump the root `package.json` version, commit, tag `v<version>`, push the tag.
