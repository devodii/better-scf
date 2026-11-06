# Chrome Web Store listing

Everything to paste into the developer dashboard. Images are in `docs/store/`.

## Store listing tab

- **Name:** better-scf
- **Category:** Productivity
- **Language:** English
- **Summary (max 132 characters):** Smarter tools for the Stellar Community Fund site: tracks and teams on every card, private shortlists and an AI assistant.
- **Icon:** `apps/extension/public/icon/128.png`
- **Screenshots (1280x800):** `screenshot-1-ai.png` to `screenshot-5-permission.png`
- **Small promo tile (440x280):** `promo-small-440x280.png`
- **Marquee (1400x560, optional):** `promo-marquee-1400x560.png`
- **Website:** https://devodii.github.io/better-scf/
- **Support / privacy policy URL:** https://github.com/devodii/better-scf/blob/main/docs/privacy.md

### Description

better-scf adds smarter tools to the Stellar Community Fund site (communityfund.stellar.org). It is made for reviewers, delegates, voters and anyone following the fund.

What you get:

- Tracks, teams and awards on every proposal card, so you can compare a whole round at a glance.
- Search a round and filter by track or by your own marks.
- Your own shortlist: mark a stance, star proposals and keep private notes. They stay on your device.
- An AI assistant that answers questions about rounds and proposals in plain words, with the numbers and where they come from. It asks before it opens a page or reads anything personal.
- Easier proposal pages: a contents list, tranche totals at a glance, one-click sharing and tidy wallet addresses.
- Four switches in the popup. Turn anything off.

Private by design: no analytics, no telemetry, no accounts. Nothing leaves your device unless you send a chat message to the assistant. Full details: https://github.com/devodii/better-scf/blob/main/docs/privacy.md

better-scf is independent and is not affiliated with the Stellar Development Foundation.

## Privacy practices tab

- **Single purpose:** Make the Stellar Community Fund website (communityfund.stellar.org) easier to explore, with proposal badges, search and filters, private notes and an AI assistant.
- **Permission justifications**
  - `storage`: saves the user's settings, shortlist, notes and a random client id on their device.
  - `scripting`: adds the extension's interface to Community Fund tabs that were already open when the extension was installed or updated.
  - Host permission `https://communityfund.stellar.org/*`: the site the extension improves. It reads the pages the user opens and, with the user's own session, the site's own pages and backend.
  - Host permission `https://better-scf-server-production.up.railway.app/*`: our server, used only to send the user's chat messages to the AI model.
- **Remote code:** No. All code is in the package. The assistant can run small scripts written by the model to analyse data, but they are run by a bundled JavaScript interpreter inside a sandbox with no access to the page, the network or extension APIs. No code is fetched or evaluated with eval.
- **Data usage:** tick **Website content** (the page text and the user's questions are sent when the user uses the AI assistant). Leave every other box unticked.
- **Certifications:** the data is not sold, not used for anything unrelated to the single purpose, and not used for credit or lending decisions.

## Notes for the reviewers

The extension only acts on communityfund.stellar.org. Most of that site needs a sign-in with Discord. A page you can open without signing in is https://communityfund.stellar.org/submissions/recHSeQoGLyvnP4B0, where the share button and the AI assistant (button at the bottom right, or Alt+A) appear. The assistant needs the server to be reachable and replies within a few seconds.

## Publishing steps

1. Pay the one-time developer fee and turn on 2-step verification for the Google account.
2. Build the first upload with `pnpm zip:store` (no manifest key, so the store assigns the ID) and upload `apps/extension/output/extension-<version>-chrome.zip` as a new item.
3. In the dashboard open the **Package** tab, view the public key, and put it in `packages/shared/src/extension-key.ts`. Rebuild, and deploy the server so it allows the store's ID. From then on `pnpm zip` includes the matching key.
4. Fill in the tabs above, submit for review, and choose **Publish** manually or automatically after approval.
5. Later releases: tag a version and the release workflow can upload it once the four `CWS_*` secrets are set (see `docs/ci.md`).
