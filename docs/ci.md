# CI secrets and variables

## Repository secrets

- `RAILWAY_TOKEN`: Railway project token for the production environment (deploy is skipped without it).
- `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`: Chrome Web Store publishing (all four or the publish step is skipped).

## Repository variables

- `WXT_SERVER_URL`: public base URL of the deployed server (a release fails without it).
- `SERVER_URL`: same URL, used to poll `/health` after a deploy.

## Railway service environment

`ANTHROPIC_API_KEY`, `ALLOWED_EXTENSION_IDS`, `MODEL`, `DAILY_CAP_PER_CLIENT`, `BURST_PER_MINUTE`, `GLOBAL_DAILY_CAP`, `NODE_ENV=production`.
