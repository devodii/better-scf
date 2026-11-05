# better-scf

A Chrome extension that adds a reviewer-focused layer to [communityfund.stellar.org](https://communityfund.stellar.org), plus a small server behind its in-page AI chat.

Status: the foundation (extension scaffold, server, CI) is in place. The features below are built milestone by milestone; see the [Roadmap](#roadmap) and `docs/build-spec.md` for what is done.

## What it is

It reads the pages you already have open on the Stellar Community Fund site and adds facts next to them:

- Chips on every submission card: track, previously awarded, comment count.
- Team avatars resolved from the GitHub and X handles listed in the Team section.
- Read and unread state, navigation memory (return to where you were), and private stance, shortlist and notes.
- Grid filters, sorting and keyboard navigation; round header totals and phase countdown.
- On a submission page: a table of contents, a tranche summary, and Stellar address pills with a Horizon hover.
- A markdown or CSV export of your own review notes.
- An AI dock that answers questions about the proposal on screen.

Screenshots (placeholders, not yet captured):

- [PLACEHOLDER: a submission card before and after]
- [PLACEHOLDER: the AI dock open on a submission]

## Install from a GitHub Release

1. Download `better-scf-<version>.zip` from the latest [GitHub Release](../../releases) and unzip it into a folder you keep.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the unzipped folder.

To update, repeat steps 1 and 4 with the new release (or click the reload icon on the extension card after replacing the folder's contents).

## What leaves your device

- Chat: the question you type and the text of the proposal on screen are sent to our server, which sends them to Anthropic to produce the answer. Along with them go a random client id and the extension version.
- Data the page shows: requests to Horizon (`horizon.stellar.org`, on address hover), GitHub (`api.github.com`, repository info for visible cards; `github.com` for avatars) and `unavatar.io` (X avatars).
- Nothing else. No analytics, no telemetry, no tracking.

Your stance, shortlist, notes, read state and settings stay in the extension's own storage on your machine. Details: [docs/privacy.md](docs/privacy.md).

## What it will never do

- Score, rank or recommend submissions.
- Flag mismatches or judge the quality of anyone else's proposal. Self-checks (budget sums, missing sections) exist only on submissions you own.
- Click, scroll or type on the site for you, or write anything to the site. It only reads the pages and data you are browsing, using your own session.

## Contributing

Requirements: Node 22 or newer and pnpm (the version is pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

`pnpm dev` runs the extension (WXT, with hot reload in a managed Chrome) and the server in parallel. Copy `apps/extension/.env.example` and `apps/server/.env.example` to `.env` in each app first; the server needs an Anthropic key for local chat. Other root scripts: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. To produce the release zip: `pnpm --filter extension zip`.

### Design tokens

Injected UI uses only tokens scraped from the live site, so it looks native. `pnpm tokens` runs `scripts/scrape-tokens.ts` (Playwright, you log in yourself) and regenerates `apps/extension/entrypoints/scf.content/styles/tokens.scss`. Never edit that file by hand, and never write colors or font names in feature styles.

### Selectors

All DOM selectors live in one module, `apps/extension/lib/site/selectors.ts`, nowhere else. Each is checked against a saved page fixture in a test. Prefer `data-*` attributes, ARIA roles and heading text over class names, which the site generates. `pnpm recon` runs `scripts/recon.ts` to record how the site loads its data; the findings go in `docs/site-recon.md`.

### Layout and CI

`apps/extension` (WXT, React, SCSS), `apps/server` (Hono), `packages/shared` (types and zod schemas used by both). CI, releases and deployment are described in [docs/ci.md](docs/ci.md).

## Roadmap

Follows `docs/build-spec.md`, in this order: site recon and design tokens, data layer, navigation memory and card chips, grid tools and round header, submission page, server and AI dock, owner mode, release.

After launch, only if people use it: comment views, bring-your-own-key, a Firefox build.

## License

MIT. See `LICENSE`.
