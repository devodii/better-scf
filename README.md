# better-scf

A Chrome extension that adds a reviewer-focused layer to [communityfund.stellar.org](https://communityfund.stellar.org), plus a small server behind its in-page AI chat.

## What it is

It reads the pages you already have open on the Stellar Community Fund site and adds facts next to them:

- Chips on every submission card: track, previously awarded, comment count.
- Team avatars resolved from the GitHub and X handles listed in the Team section.
- Read and unread state, navigation memory (return to where you were), and private stance, shortlist and notes.
- Grid filters, sorting, search and keyboard navigation; round header totals and phase countdown.
- On a submission page: a table of contents, a tranche summary, Stellar address pills with a Horizon hover, an image lightbox and a reviewer bar.
- A markdown or CSV export of your own review notes.
- An AI dock that answers questions about the page on screen and can read your own Community Fund data when you ask.

## Install from a GitHub Release

1. Download `better-scf-<version>.zip` from the latest [GitHub Release](../../releases) and unzip it into a folder you keep.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the unzipped folder.

To update, repeat steps 1 and 4 with the new release (or click the reload icon on the extension card after replacing the folder's contents).

## What leaves your device

- Chat: the question you type, the text of the page you are viewing and the results of tools you asked the assistant to run (your own data read from the site's backend) are sent to our server, which sends them to Anthropic to produce the answer. Along with them go a random client id and the extension version.
- Your session token goes only to the site's own backend, never to our server.
- Data the page shows: requests to Horizon (`horizon.stellar.org`, on address hover), `github.com` (avatars) and `unavatar.io` (X avatars).
- Nothing else. No analytics, no telemetry, no tracking.

Your stance, shortlist, notes, read state and settings stay in the extension's own storage on your machine. Details: [docs/privacy.md](docs/privacy.md).

## What it will never do

- Score, rank or recommend submissions.
- Flag mismatches, audit or judge the quality of any proposal.
- Click, scroll or type on the site for you, or write anything to the site. It only reads the pages and data you are browsing, using your own session.

## Development

Requirements: Node 22 or newer and pnpm (the version is pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

`pnpm dev` runs the extension (WXT, with hot reload in a managed Chrome) and the server in parallel. Copy `apps/extension/.env.example` and `apps/server/.env.example` to `.env` in each app first; the server needs an Anthropic key for local chat.

| Command                       | What it does                         |
| ----------------------------- | ------------------------------------ |
| `pnpm dev`                    | Extension and server in watch mode.  |
| `pnpm build`                  | Builds the extension and the server. |
| `pnpm lint`                   | Biome check across the repository.   |
| `pnpm format`                 | Biome check with fixes applied.      |
| `pnpm typecheck`              | TypeScript check of every package.   |
| `pnpm storybook`              | Storybook on port 6006.              |
| `pnpm build-storybook`        | Static Storybook build.              |
| `pnpm --filter extension zip` | The release zip.                     |

### Building with a server URL

The assistant talks to the server at `WXT_SERVER_URL`, a public value baked into the build (never put a secret in a `WXT_` variable). The manifest gets a host permission for that host and no other server:

```sh
WXT_SERVER_URL=https://your-server.example.com pnpm --filter extension build
WXT_SERVER_URL=https://your-server.example.com pnpm --filter extension zip
```

You can also put the line in `apps/extension/.env`.

- `pnpm dev` (development mode): the host permission is `http://localhost/*` when no URL is set, otherwise the host of `WXT_SERVER_URL`.
- Production build with a URL: only that host. A `localhost`, `127.0.0.1` or `[::1]` URL gets no permission in a production build.
- Production build without a URL: no server permission; the assistant says the assistant server is not configured.

The other host permission is `https://communityfund.stellar.org/*`. Horizon is fetched from the page's origin and `unavatar.io` is only an image, so neither needs a permission.

### Storybook

Every UI component in `apps/extension/components/<Name>/` ships with its SCSS module and a story. Storybook is the design reference: run `pnpm storybook` to see each component and its states.

### Layout

- `apps/extension`: WXT, React and SCSS. Page features live in `entrypoints/scf.content/features/`, shared logic in `lib/`, presentational components in `components/`. All DOM selectors live in `lib/site/selectors/`; they prefer `data-*` attributes, ARIA roles and heading text over the site's generated class names.
- `apps/server`: Hono server behind the chat.
- `packages/shared`: types and zod schemas used by both.

CI, releases and deployment are described in [docs/ci.md](docs/ci.md).

## License

MIT. See `LICENSE`.
