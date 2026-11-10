# Privacy

better-scf has no analytics, no telemetry and no accounts. This page lists exactly what leaves your device and what stays on it.

## What leaves your device

### To our server and the AI model (only when you send a chat message)

- Your question and the earlier messages of that chat (at most 20).
- The text of the page you are viewing, as the context for the answer (at most 24,000 characters). On a round or list page this is a list of titles, authors, budgets and tracks.
- The results of the tools the assistant ran for your question, so it can answer. These are pages and data from the Community Fund site that you can already see when signed in, read through your own session (at most 12,000 characters per result). Nothing personal is read until you approve it in the chat.
- The submission id, a hash of the page content, which kind of page you are on, a random client id generated once on your device, and the extension version.
- Your IP address, as every web request carries one. Our server uses it only for rate limiting and keeps it in memory. The hosting platform may log IP addresses too.

The server passes the question, the page text and the tool results to Anthropic's model to generate the answer. It logs only: timestamp, client id, submission id, which quick prompt was used (or "free") and token counts. It never logs question text, page text or tool results. It keeps a count of questions per client id for the last day in memory, to enforce the daily question limit. Nothing is stored in a database and there is no answer cache.

### To Stellarlight, through our server (only when a question needs it)

When you ask about a builder, a project, a repo or the wider Stellar ecosystem, the assistant can look the answer up on Stellarlight (stellarlight.xyz), a public community directory. Our server sends the lookup, for example a GitHub username taken from a team link or a search keyword, and receives public data. Your question, the page text and your session are not sent to Stellarlight. Answers are kept in the server's memory for a few minutes to avoid repeating requests.

### To the Stellar Community Fund site

The extension reads the pages you open and, with your own signed-in session, the site's own pages and backend (`communityfund.stellar.org`), so it can show facts next to what you browse and answer questions. Your session token is sent only to the site, as the site itself does. It is never sent to our server, the AI model or any other service, and it is never stored.

### To other services, for data the page shows

- `horizon.stellar.org`: account summary for a Stellar address, only when you hover its pill. The request contains the address.
- `github.com` and `unavatar.io`: avatar images for the GitHub and X handles listed in a submission's Team section. The request contains the handle.

These requests also carry your IP address. They contain no identifier from us.

### Nothing else

Your stance, shortlist, notes, read state, navigation state and settings never leave your device. The only thing our server receives besides chat messages is a request, at most once an hour, for a public list of GitHub usernames that have a Stellarlight profile. It carries nothing about you or the pages you read except the usual request details (the random client id and your IP address). The extension uses the list to decide whether a team avatar links to Stellarlight or to GitHub. When you uninstall the extension, Chrome opens a short feedback form in a new tab; nothing is sent to us when it opens. There is no analytics and no telemetry.

## What is stored on your device

In the extension's own storage:

- IndexedDB database `better-scf`: parsed submissions, projects and rounds; your review state (stance, shortlist, note, last opened); navigation state; your recent chats (you can open, branch and delete them from the chat panel); cached Horizon summaries; and resolved avatar URLs.
- `chrome.storage.local`: feature settings, the random client id and the downloaded list of Stellarlight usernames.
- `chrome.storage.session`: the tracks and teams read from a round's proposals during the last 2 hours, so reloading a round or coming back to it is instant. It is kept in memory only, never written to disk, and cleared when you close the browser.

On the Community Fund tab, `sessionStorage` keeps the scroll position and last opened card of a page, whether the chat panel is open and which chat is current, until the tab closes.

Removing the extension deletes all of it.

## Permissions

- `storage`: your settings and client id.
- `scripting`: to add the extension's interface to Community Fund tabs that were already open when it was installed or updated.
- Access to `communityfund.stellar.org`: the site the extension improves.
- Access to our server: to send chat messages.

No `tabs`, no `cookies`, no access to any other site.

## Contact

Open an issue on the repository: https://github.com/devodii/better-scf/issues
