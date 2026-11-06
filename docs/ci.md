# CI secrets and variables

## Repository secrets

- `RAILWAY_TOKEN`: Railway project token for the production environment (deploy is skipped without it).
- `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`: Chrome Web Store publishing (all four or the publish step is skipped).

## Repository variables

- `WXT_SERVER_URL`: public base URL of the deployed server (a release fails without it).
- `SERVER_URL`: same URL, used to poll `/health` after a deploy.

## Getting the Railway token

In the Railway dashboard open the project, then Settings, Tokens, and create a project token for the production environment. Add it as the repository secret `RAILWAY_TOKEN`. The deploy workflow then runs on every push to `main` that touches `apps/server`, `packages/shared` or `railway.toml`, and fails if `/health` does not answer within a minute.

## Extension id

The manifest pins its key, so every build has the id `eaplcaohhkncckjnobkipmkpbnaddnkp`. Set `ALLOWED_EXTENSION_IDS` to that value. When the extension is published in the Chrome Web Store it gets a second id; add it as a comma separated entry.

## Railway service environment

The build and deploy config is `railway.toml` at the repository root (Dockerfile `apps/server/Dockerfile`, built with the root as context), so no "Config as Code file path" setting is needed in the Railway dashboard.

`ANTHROPIC_API_KEY`, `ALLOWED_EXTENSION_IDS`, `MODEL`, `DAILY_CAP_PER_CLIENT`, `BURST_PER_MINUTE`, `GLOBAL_DAILY_CAP`, `NODE_ENV=production`.
