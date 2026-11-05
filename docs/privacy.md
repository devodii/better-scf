# Privacy

better-scf has no analytics and no accounts. This page lists what leaves your device and what stays on it.

## What leaves your device

### To our server (only when you send a chat message)

- Your question and the earlier messages in that chat (at most 20).
- The proposal text on screen, as the context for the answer (at most 24,000 characters). On a round page, a list of titles, authors, budgets and tracks.
- The submission id, a hash of the proposal content, which page type you are on, a random client id generated once on your device, and the extension version.
- Your IP address, as every web request carries one. Our server code uses it only for rate limiting and keeps it in memory. The hosting platform and its network may log IP addresses too.

The server passes the question and context to Anthropic to generate the answer. It logs only: timestamp, client id, submission id, which quick prompt was used (or "free"), token counts and whether the answer came from cache. It never logs question text or proposal context. Answers to the built-in quick prompts may be cached on the server, keyed by a hash of submission id, content hash and prompt id, not by user.

### To the Stellar Community Fund site

The extension reads data from `communityfund.stellar.org` with your own session, so it can show facts next to the pages you browse. Those requests go to the site, not to us.

### To other services, for data the page shows

- `horizon.stellar.org`: account summary for a Stellar address, only when you hover its pill.
- `api.github.com`: repository info for a submission's GitHub link, for cards you can see, at most once a day per repository.
- `github.com` and `unavatar.io`: avatar images for the GitHub and X handles listed in a submission's Team section.

These requests contain the address or handle being looked up, and your IP address. They contain no identifier from us.

### Not sent anywhere

Your stance, shortlist, notes, read state, navigation state and settings. Nothing is sent to our server unless you send a chat message. Nothing is sent to any other service, and there is no analytics or telemetry.

## What is stored on your device

In the extension's own storage (not the site's `localStorage`):

- IndexedDB database `better-scf`: parsed submissions, projects and rounds; your review state (stance, shortlist, note, last opened, open count); navigation state; your chat history per submission; cached Horizon summaries; and resolved avatar URLs.
- `chrome.storage.local`: feature settings, the random client id, the schema version and last-sync times.

Cached data expires after its time to live (hours for submissions, minutes for Horizon, days for avatars). The popup has a "clear cache" action, and removing the extension deletes all of it.

## Permissions

The extension asks for `storage` and access to `communityfund.stellar.org`, `horizon.stellar.org`, `api.github.com`, `unavatar.io` and our server. No `tabs`, no `cookies`, no access to other sites.

## Contact

Open an issue on the repository.
