# Site recon (logged in as a normal user, 2026-11-05)

How the data reaches the page on communityfund.stellar.org. Method: one gentle pass in a real Chrome session the human logged into (Discord login through NextAuth), recording fetch, XHR and document requests; response keys only, no values, no cookies or tokens. Public pages were checked logged out first.

## Answers to the spec's "verify" items

- **Airtable is never called from the browser.** Across the landing page, `/awards`, `/projects`, the dashboard, a round page and a submission page, every request goes to `communityfund.stellar.org`, the login provider (Discord) or analytics tools. There is no `airtable.com` host. Airtable sits behind the site's own backend (`/backend/...`), which returns `airtableUser` for the account.
- **Framework:** Next.js App Router. Navigation fetches `?_rsc=` payloads (`text/x-component`); pages are server rendered. Auth is NextAuth (`/api/auth/providers`, `/api/auth/csrf`, `/api/auth/signin/discord`); the session cookie is HttpOnly and not touched by the extension.
- **JSON endpoints seen (same origin, cookies included):**
  - `GET /backend/dashboard/user`: `{ airtableUser{id,name,companyName,type,country,email,discord{...},siteUrls{github,x,linkedIn},votingPowers,latestRoundVotingPower}, sanityUser{...} }`
  - `GET /backend/dashboard/user/email_status`: `{ emailStatus }`
  - `GET /backend/dashboard/form_items/essential`: `{ rounds[{key,value,type,phase,roundNumber}], interestFormProjects[{key,value,buildTrack,category,hasInterestForm,teamDescription}], assignedProjects[{key,value,eligible,category,hasInterestForm,teamDescription}] }`. This is the user's own projects: an explicit `buildTrack` and `category` exist here, which is the ownership source for owner mode (§6.7).
- **Round page** `/dashboard/award-rounds/<recId>`: a server-rendered document (about 920 KB). The submissions (101 "View" buttons for SCF #46) are in the HTML as cards ("By <team> | <title> | SCF #46 | $150.0K | Build | Submitted"), not in a JSON call. The page makes no data request of its own. The cards have no anchors: each is a `div.group` with a `View` button that navigates client side.
- **Round list** `/dashboard/award-rounds`: a Swiper carousel; each slide is a round card with a `View` button (no link) showing the round name, "Deadline to submit for award", and two counts.
- **Submission page** `/dashboard/submissions/<recId>`: opened by the card's `View` button; data arrives as an RSC payload during client navigation. Sections in the DOM as uppercase headings: title block (title, round, budget), PRODUCTS & SERVICES, REQUESTED BUDGET, TRACTION EVIDENCE, TRANCHE 1 (DELIVERABLE ROADMAP) - MVP, TRANCHE 2 ... - TESTNET, TRANCHE 3 ... - MAINNET, TRANCHE 3 ONCHAIN METRIC INFORMATION, TEAM, PROJECT STATS, OTHER SUBMISSIONS.
- **Round header** on a round page: phase table (Build Submission, Panel Review, Community Vote, Notification and Award Distribution) with dates, AWARDED SUBMISSIONS, RECEIVED SUBMISSIONS with a "See All" button that expands the grid in place (URL unchanged).
- **Sidebar routes:** `/dashboard/award-rounds`, `/dashboard/projects` (My Projects), `/dashboard/tasks`, `/dashboard/tiers`, `/dashboard/delegate-trust`, `/dashboard/vote`, `/dashboard/voting-history`, `/dashboard/analytics`, `/dashboard/account`.

## The data model (what each page really carries)

- **Round page payload (inline scripts, `self.__next_f.push`):** one record per submission, 52 for SCF #46: `{ id, title, status, project, projectName[], roundName, budget (number, can be non-integer), awardType, isCvvc, isOwnedByUser, thumbnail{url} }`. Cards in the DOM are the same records plus the rendered chips. `isOwnedByUser` gives ownership directly, so owner mode does not need to scan My Projects. `awardType` was `Build` for all 52.
- **Submission page payload:** the project object `{ id, category, totalAwarded, totalPaid, team{description,count}, submissions[summary records] }`, which is the source of Project Stats and Other Submissions (its shape varies by page, so parse defensively). The DOM carries the proposal text under uppercase headings.
- **Project Stats in the DOM:** `Team Size`, `Category`, `Total awarded` (shown as `$0*`), `Awarded Submissions`, `Other Submissions` ("No other submissions." when none), and a `View Project` link.
- **Track:** the heading `TRANCHE 3 ONCHAIN METRIC INFORMATION` exists on every submission, so its presence says nothing. The heuristic is that the section has body text (an on-chain metric is stated) versus an empty section. Treat it as `trackSource: "heuristic"` and never show it as fact on a card.
- **Never touch the session.** The page payload also contains the logged-in `session` object with an `accessToken`. The extension must not read, copy, store or send it; parsers pick named fields from the records above and ignore everything else, and fixtures are scrubbed of it.
- **Fixtures** (scrubbed, in `tests/fixtures/scf/`): `round-46-records.json`, `round-card.html`, and `submission-<id>.html` with `.project.json` for five submissions (lowest budget, mid, highest, one-person team, a filled and an empty on-chain section).

## Consequences for the build

1. **Data strategy: read what the page already delivered.** Round page: the inline payload plus the card DOM. Submission page: the project object plus its DOM. The extension never requests submission data itself. The only same-origin JSON the extension may call is `/backend/dashboard/form_items/essential`, once per session, for owner mode.
2. **No per-card prefetching.** Card features (track, awarded-before, comments) may use only what the card itself shows or what the user has already opened and the extension stored. Anything that would need one request per card is dropped or deferred until the user opens that submission.
3. **Track:** the card does not show it; see the heuristic above. Cards show a track chip only for submissions the user has opened (cached), labeled as derived from the on-chain metric section.
4. **Navigation memory:** cards navigate client side without anchors, so the route watcher must observe URL changes (History API) and the round page's grid state ("See All" expanded or the Swiper position).
5. **Selectors:** class names are Tailwind utility classes (`flex h-full flex-col`, `group`, `swiper-slide-active`); use the `View` button text, the uppercase section headings, and the card text pattern, never the classes.

## Open from the spec §12

1. Track field: not on cards; `buildTrack` exists for the user's own projects only.
2. Comments: no comments seen on the submission page.
3. Carousel: Swiper (button driven, `swiper-slide-active`); the grid is the in-place "See All".
4. Chrome's `Origin` on content script fetches to our server: unverified, test with the first server call.
5. Model and cap: defaults stay.

## Dashboard map (logged in, 2026-11-05)

| Path | Page | Carousels and grids | Data it carries |
|---|---|---|---|
| `/dashboard/award-rounds` | Award Rounds | Open Rounds (1 slide), Completed Rounds (45 slides, "See All") | round list payload with per-round stats (below) |
| `/dashboard/award-rounds/<recId>` | one round | Received submissions carousel and the in-place "See All" grid | submission records (see the data model above) |
| `/dashboard/submissions/<recId>` | one submission | none | project object and the proposal DOM |
| `/dashboard/projects` | My Projects | 2 carousels (2 and 3 slides), 2 "See All" | the user's projects and submissions |
| `/dashboard/tasks` | Tasks | none | |
| `/dashboard/tiers` | Verified Members | 2 carousels (4 slides each) | `GET /backend/dashboard/tier/request`, `tier_nomination` |
| `/dashboard/delegate-trust` | Delegates and Trust | none | `GET /backend/dashboard/vote/trust`, `tier/request`, `tier_nomination` |
| `/dashboard/vote` | Community Vote | none | `GET /backend/dashboard/vote_history/nqg_graph`, `vote/delegate` |
| `/dashboard/voting-history` | Community Vote History | none | `GET /backend/dashboard/vote_history/your_voting_statistics/<round>`, `nqg_graph` |
| `/dashboard/analytics` | Analytics | one horizontally scrolling region | `GET /backend/dashboard/analytics/insights`, `analytics/all-rounds`; subpage `/dashboard/analytics/how-nqg-works` |
| `/dashboard/account` | Account | none | the account form (`/backend/dashboard/user`) |
| `/projects` (public) | Funded projects | 6 category carousels (134, 99, 23, 112, 104, 59 slides), "See All" each, a Search field and a select | all 528 projects in the inline payload |
| `/project/<slug>` | a project | | |
| `/awards`, `/governance`, `/` | public marketing pages | | |

Dashboard pages without a carousel need only scroll restoration. Carousels are Swiper instances (`.swiper`, `.swiper-slide`, `.swiper-slide-active`) driven by a pair of yellow round buttons; there is no anchor on a slide.

## Auth for the backend

- `GET /api/auth/session` returns `{ user, expires, accessToken }` for the logged-in user. `accessToken` is opaque.
- Every `/backend/...` call needs `Authorization: Bearer <accessToken>`; cookies alone get `401 Missing Authorization header token`. The site's own frontend does exactly this.
- The extension's data tool does the same, in the content script only: the token is read at call time, used only against `https://communityfund.stellar.org/backend/...`, never stored, logged, put in a message, or sent to our server, to the model or to any other host. Only GET, only allow-listed paths.

## Backend endpoints seen (all GET, same origin, bearer token)

- `/backend/dashboard/user`: `airtableUser{...}`, `sanityUser{...}` (account details; personal)
- `/backend/dashboard/user/email_status`: `{ emailStatus }`
- `/backend/dashboard/form_items/essential`: `{ rounds[{key,value,type,phase,roundNumber}], interestFormProjects[...], assignedProjects[...] }`
- `/backend/dashboard/tier/request`: `{ buttonLabel, disabled, blockingReasons[], votingPowerThreshold, requestType, targetTier }`
- `/backend/dashboard/tier_nomination`: `{ tierNominations[], selfTierNominations[], threshold{navigator,pilot,round} }`
- `/backend/dashboard/vote/trust`, `/backend/dashboard/vote/delegate`: arrays
- `/backend/dashboard/vote_history/nqg_graph`: `{ nqgOverTime[[round, ...]] }`
- `/backend/dashboard/vote_history/your_voting_statistics/<round>`: neuron scores and `totalNQGScore`
- `/backend/dashboard/analytics/insights`: `{ generatedAt, global{headline, trends[], anomalies[], alerts[]}, perRound[{round, summary, highlights[], concerns[], tags[]}], roundsIncluded[] }`
- `/backend/dashboard/analytics/all-rounds`: `{ computedAt, roundsIncluded[32..45], series{ categoryMix, delegationHealth, fundingTrends[{round, avgBudget, medianBudget, totalAwardedUSD}], neuronBreakdown, participation, powerConcentration, projectFunnel[{round, submissionsCount, awardedCount}], repeatSubmitters, reputationTrend, trustGraphTrend, trustLossTrend, voteQualityTrend, voterCohort, votingHistoryTrend } }`

## Round stats (already in the round list page payload, no request)

Each round record: `{ id, name ("SCF #45"), type, phase ("Submission" | "Ended"), roundNumber, description, dates{...}, imageUrl, stats{ appliedSubmissions, awardedSubmissions, totalAwardedUSD, totalPaidUSD, totalPaidXLM, submissionsCount, usersCount }, scfVersion, submissions[] }`. The two numbers on a Completed Rounds card are `submissionsCount` (box icon) and `usersCount` (person icon). Example SCF #45: 218 submissions, 366 users, 40 awarded, $4,043,616 awarded.

## Tracks

Tracks began with SCF #41. No data source exposes them: `awardType` is `Build` on every record, rounds have no track field, the analytics series have none. The only signal is per submission (the on-chain metric section, see the heuristic above). So track counts per round cannot be computed without opening every submission. Do not show track counts on round cards; a track chip is shown only on a submission the user has opened, labeled as derived.

## Projects index (public `/projects` payload, no auth)

The page embeds all 528 projects in an inline script: `{ id, slug, title, category, thumbnail{url}, lastAwardedRound }`, about 177 KB. `/project/<slug>` is the project page. Categories: Applications, Developer Tooling, Education and Community, End-User Application, Financial Protocols, Infrastructure and Services. The dashboard search reads this once (one document request, cached for 6 hours in IndexedDB, started by the first keystroke) and searches it locally.
