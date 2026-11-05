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
