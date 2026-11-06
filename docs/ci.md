# CI secrets and variables

## Repository secrets

- `RAILWAY_TOKEN`: Railway project token for the production environment (deploy is skipped without it).
- `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`: Chrome Web Store publishing (all four or the publish step is skipped).

## Repository variables

- `WXT_SERVER_URL`: public base URL of the deployed server. The extension build bakes it in (a release fails without it) and the deploy workflow polls its `/health` after a deploy. It is a public address, not a secret.

## Getting the Railway token

In the Railway dashboard open the project, then Settings, Tokens, and create a project token for the production environment. Add it as the repository secret `RAILWAY_TOKEN`. The deploy workflow then runs on every push to `main` that touches `apps/server`, `packages/shared` or `railway.toml`, and fails if `/health` does not answer within a minute.

## Extension id

The manifest pins its key, so every build has the id `eaplcaohhkncckjnobkipmkpbnaddnkp`. Set `ALLOWED_EXTENSION_IDS` to that value. When the extension is published in the Chrome Web Store it gets a second id; add it as a comma separated entry.

## Railway service environment

The build and deploy config is `railway.toml` at the repository root (Dockerfile `apps/server/Dockerfile`, built with the root as context), so no "Config as Code file path" setting is needed in the Railway dashboard.

`ANTHROPIC_API_KEY`, `ALLOWED_EXTENSION_IDS`, `MODEL`, `DAILY_CAP_PER_CLIENT`, `BURST_PER_MINUTE`, `GLOBAL_DAILY_CAP`, `NODE_ENV=production`.

## Watching the SCF site

`site-watch.yml` runs every day (and on demand) and checks, without logging in, the things the extension depends on: the headings and data of a public proposal page (including the record shape every round page uses), that the dashboard pages still exist at the same addresses, the project directory, the two landing buttons and the sign-in status answer. When any of them changes it opens an issue labelled `site-change` with what changed and what it affects, and it closes the issue by itself once everything passes again. What the dashboard pages look like inside needs a login, so that is not covered.
