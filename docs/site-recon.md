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

## Consequences for the build

1. **Data strategy: read the DOM the page already rendered.** There is no JSON feed for submissions to call, so the extension does not request submission data. Cards on the round page are parsed from the DOM that is already there; the submission page is parsed from its DOM when the user opens it. The only same-origin JSON the extension may call is `/backend/dashboard/form_items/essential`, once per session, for owner mode.
2. **No per-card prefetching.** Card features (track, awarded-before, comments) may use only what the card itself shows or what the user has already opened and the extension stored. Anything that would need one request per card is dropped or deferred until the user opens that submission.
3. **Track:** the card does not show it. It appears on the submission page (presence of the TRANCHE 3 ONCHAIN METRIC INFORMATION section) and in `buildTrack` for the user's own projects. Cards show the track chip only for submissions the user has opened (cached) until a free source is found.
4. **Navigation memory:** cards navigate client side without anchors, so the route watcher must observe URL changes (History API) and the round page's grid state ("See All" expanded or the Swiper position).
5. **Selectors:** class names are Tailwind utility classes (`flex h-full flex-col`, `group`, `swiper-slide-active`); use the `View` button text, the uppercase section headings, and the card text pattern, never the classes.

## Open from the spec §12

1. Track field: not on cards; `buildTrack` exists for the user's own projects only.
2. Comments: no comments seen on the submission page.
3. Carousel: Swiper (button driven, `swiper-slide-active`); the grid is the in-place "See All".
4. Chrome's `Origin` on content script fetches to our server: unverified, test with the first server call.
5. Model and cap: defaults stay.
