# extension

## 0.1.6 - 2026-11-10

### Patch Changes

- 206b086: Tracks and teams are now remembered for 2 hours for each round, so coming back to a round rarely needs to read the proposals again. The reload button still refetches everything whenever you want fresh data.
- ea7a967: The Awarded Submissions section now has the same search, filters and sorting as Received Submissions.
- shared@0.1.6

## 0.1.5 - 2026-11-09

### Patch Changes

- 40eb38f: Tracks and teams are now remembered for 25 minutes for each round, so reloading a round or coming back to it no longer loads everything again. Only newly added proposals are fetched, a tab left open refreshes itself when you return after that time, and the reload button still refetches everything.
- 3420fb6: Builders with a Stellarlight profile now come first in a proposal's team avatars.
- shared@0.1.5

## 0.1.4 - 2026-11-09

### Patch Changes

- Fixed the search box dropping letters when you start typing right after a round page opens.
- shared@0.1.4

## 0.1.3 - 2026-11-09

### Patch Changes

- Search on a round page now also finds proposals by project name, team name, builder name, GitHub username, track and your own private notes. The search box reads "Search proposals, teams or builders".
- Team members now appear before the organisation's GitHub account on proposal cards, so a large team is never hidden behind the +N.
- The assistant can use all of Stellarlight for any Stellar question, not only builders: projects, repos and source code, standards, audits, hackathons, funding, partners, stablecoins and prices. It links builders to their Stellarlight profile and sticks to what Stellarlight returns.
- The assistant has no limit on how fast you can ask, only a daily question limit. When you reach it, it tells you when it resets.
- When you uninstall the extension, Chrome opens a short form asking why.
- shared@0.1.3

## 0.1.2 - 2026-11-08

### Patch Changes

- Fixed tracks and teams sometimes stopping part way on a round that is still taking submissions, while the page said everything was up to date. Every proposal now loads, and if some cannot be loaded it tells you how many.
- shared@0.1.2

## 0.1.1 - 2026-11-08

### Patch Changes

- 4a405ae: Tracks and teams now reload by themselves when the number of proposals in a round changes, and the reload button re-reads everything.
- 4a405ae: Team avatars on proposal cards now open the builder's Stellarlight profile when they have one, and their GitHub profile when they do not.
- The assistant can now look up builders and the wider Stellar ecosystem on Stellarlight, and tells you each time it does.
- Fixed the search box losing focus after the first letter when you start typing on a round page.
- Fixed awards and totals missing on completed round cards when you open Award Rounds from a link inside the site.
- The assistant panel can now be resized by dragging its inner edge (or with the arrow keys), never narrower than before, and it remembers your width. Double-click the edge to reset it.
- The steps the assistant took (pages it read, builders it looked up) now stay in the chat when you close and reopen it or come back later, and the assistant remembers where its answers came from.
- Updating the extension no longer risks your notes, stances and chats: future updates keep them and only add what is new.
- shared@0.1.1

## 0.1.0 - 2026-11-06

### Initial release

- First release: tracks, teams and awards on every proposal card, search and filters, a private shortlist with notes, an AI assistant that asks before it acts, and easier proposal pages.
