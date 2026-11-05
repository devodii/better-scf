# Privacy

better-scf has no analytics, no telemetry and no accounts. This page lists exactly what leaves your device and what stays on it.

## What leaves your device

### To our server and the model (only when you send a chat message)

- Your question and the earlier messages of that chat (at most 20).
- The text of the page you are viewing, as the context for the answer (at most 24,000 characters). On a round or list page this is a list of titles, authors, budgets and tracks.
- The results of the tools you asked the assistant to run. When a question needs it, the assistant reads your own data from the Community Fund site (for example your own projects or submissions) through the site's backend, and the result of that read is sent along with the conversation so the model can answer. At most 12,000 characters per result; nothing is read unless a question needs it.
- The submission id, a hash of the page content, which kind of page you are on, a random client id generated once on your device, and the extension version.
- Your IP address, as every web request carries one. Our server code uses it only for rate limiting and keeps it in memory. The hosting platform and its network may log IP addresses too.

The server passes the question, the page text and the tool results to Anthropic's model to generate the answer. It logs only: timestamp, client id, submission id, which quick prompt was used (or "free"), token counts and whether the answer came from cache. It never logs question text, page text or tool results. Answers to the built-in quick prompts may be cached on the server, keyed by a hash of submission id, page content and prompt id, not by user.

### To the Stellar Community Fund site

The extension reads the pages you open and, with your own signed-in session, the site's backend (`communityfund.stellar.org`), so it can show facts next to the pages you browse and answer questions about your own data. Your session token is sent only to the site's own backend, as the site itself does. It is never sent to our server, the model or any other service, and it is never stored.

### To other services, for data the page shows

- `horizon.stellar.org`: account summary for a Stellar address, only when you hover its pill. The request contains the address.
- `github.com` and `unavatar.io`: avatar images for the GitHub and X handles listed in a submission's Team section. The request contains the handle.

These requests also carry your IP address. They contain no identifier from us.

### Nothing else

Your stance, shortlist, notes, read state, navigation state and settings never leave your device. Nothing is sent to our server unless you send a chat message. There is no analytics and no telemetry.

## What is stored on your device

In the extension's own storage:

- IndexedDB database `better-scf`: parsed submissions, projects and rounds; your review state (stance, shortlist, note, last opened, open count); navigation state; your chat history per submission; cached Horizon summaries; and resolved avatar URLs.
- `chrome.storage.local`: feature settings and the random client id.

On the Community Fund tab, `sessionStorage` keeps the scroll position and the last opened card of a page for 30 minutes, so you can return to where you were. It is cleared when the tab closes.

Cached data expires after its time to live. The popup has a "clear cache" action, and removing the extension deletes all of it.

## Permissions

The extension asks for `storage` and access to `communityfund.stellar.org`, `horizon.stellar.org`, `unavatar.io` and our server. No `tabs`, no `cookies`, no access to other sites.

## Contact

Open an issue on the repository.
