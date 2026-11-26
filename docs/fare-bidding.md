# Fare bidding — 26 November 2026

For the subsequent QA audit, minimal fixes, updated test counts and exact emulator instructions, see [fare-bidding QA review](qa/fare-bidding-review.md). The milestone results below record the feature implementation run.

## Customer and biker flows

Customer Home's active-ride card now opens **View bids**. **Incoming bids** shows the ride, status and compact BidCards with bidder name, motorcycle model when supplied, genuine average rating/count (or Not yet rated), bid status and proposed BDT fare. Offers are ordered by fare, lowest first, then UUID. Reads use 20-row keyset pagination. A live update or reconnect resets to the newest comparison page so revised amounts are reordered correctly. The page shows empty, loading, readable error, disconnected and closed-ride states. It has no biker-selection/assignment action.

Bikers continue entering fares and submitting/revising pending offers through Ride Details. **My bids**, available from biker Home, now shows submitted fares and status across open and closed rides, including while offline. It pages 20 records at a time, newest first, and refreshes when statuses change. Pending offers are explicitly described as unconfirmed bookings. Ride Details keeps its existing success notice and inline positive-fare validation.

Main files: `bidService.js`, `CustomerBidsScreen.js`, `BikerBidsScreen.js`, navigation registrations and Home entry buttons. The existing BidCard, state components, theme and fare validator are reused. No package or native dependency was added.

## Database rules

Existing `bids` rows have UUID/FK ownership, NUMERIC(10,2) amounts, positive bounded fare checks, timestamps, status checks and UNIQUE `(ride_id,biker_id)`. No client may directly INSERT/UPDATE/DELETE bids. `submit_bid` derives the biker from `auth.uid()`, requires an active available biker and an open ride with an active customer, rejects invalid precision before NUMERIC rounding, then inserts or revises only that biker's pending record. Repeating the same submission returns the same bid ID. It never accepts a caller-selected biker ID.

The existing `submit_bid` and ride-close functions lock the ride row first. If bidding commits first, closing subsequently withdraws that pending bid. If closing commits first, bidding reads the closed status after acquiring the lock and fails. A closed ride cannot acquire a new pending bid. This phase adds no assignment operation or assignment UI.

Migration `20261126000300_fare_bidding.sql` adds:

- `list_customer_bids(ride_id, after_amount, after_id)`: pinned-search-path SECURITY DEFINER, active-customer check and explicit ownership check, with a bounded comparison projection. It joins only actual bidders' stored names/motorcycles and aggregates real completed-ride ratings; it returns no email/mobile/plate or competing ride information.
- `list_my_bids(before, before_id)`: active-biker check and caller-owned bid filter, including permitted customer-entered route labels and current ride status. Offline bikers may read their own status; suspended accounts may not.
- A customer policy permitting the minimal availability notification for that customer's own ride. This lets a comparison screen refresh after ride closure without publishing private full ride rows.
- Addition of `bids` to `supabase_realtime`. Existing bid RLS still restricts events/reads to the owning biker, owning ride customer, and existing authorized administrator access.

Other bikers' offers cannot be modified through a direct write or the checked RPC. Customers cannot read bids from another customer's rides or call the biker archive RPC. Anonymous callers have no bid access. RLS remains enabled on all eight exposed application tables. Prior applied migrations are unchanged.

## Realtime lifecycle

`subscribeBids` obtains the SDK session, checks that its user ID matches the screen, authenticates Realtime, then subscribes to either `ride_id=eq.<ride>` or `biker_id=eq.<user>`. It also watches the caller's own profile for access/status changes; the customer comparison watches its own ride's minimal availability event.

Events invalidate state rather than being trusted as display data. Refreshes debounce for 250ms and query the checked projections. Every SUBSCRIBED event, including reconnect, refetches authoritative data; foreground return and screen focus also refresh. Connection errors leave a clearly marked snapshot and offer manual refresh. Authorization/read failures clear displayed records. Timers and channels are removed on blur/unmount/logout, and disposed callbacks cannot write state.

Reference: [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). Keep bid RLS enabled when enabling the publication. Do not publish customer profiles broadly or weaken RLS to fix delivery.

## Deployment and running

The migration has been applied to the linked RideShare Pro project after explicit approval. No Edge Function or environment-secret change is needed. For another configured project:

```powershell
npm ci
npx supabase db push --remote --dry-run
npx supabase db push --remote --yes
npm run android
```

Verify Dashboard → Database → Publications → `supabase_realtime` includes `bids` and the previously configured availability/profile tables. Existing Android development APKs can load these JavaScript changes with `npx expo start --dev-client` from `mobile`.

```powershell
npm run lint
npm test
npm run check:dependencies
npm run export:android
npm run bids:test:live
```

The live test uses the existing owned accounts in ignored `mobile/.env.auth-test`. It temporarily configures the test biker when necessary, creates isolated customer rides, tests actual customer bid events, duplicate RPCs, reconnect/refetch, direct-write denial and concurrent bid-versus-close operations, then closes only its created rides and restores the original biker settings. It leaves pre-existing active customer rides untouched and reports dependent creation checks NOT RUN. No credentials, private names or ride IDs are printed.

## Manual emulator checks

1. Customer: post a ride and open View bids. Verify No bids yet and no selection/assignment button. Check compact cards, real names/ratings or Not yet rated, BDT amounts and fare ordering.
2. Biker: submit a positive fare from Ride Details. Zero, negative, excessive and over-precision fares must fail. Rapid duplicate presses or retries must preserve one bid row; revising a pending bid updates that row.
3. Leave the customer screen open while the biker submits/revises an offer. The card must arrive/change without manual refresh. Disconnect the customer, update the bid, reconnect and verify authoritative refresh.
4. Close/cancel only a disposable test ride through its owning customer. New bids must be rejected. The customer screen must identify the closed ride and show withdrawn status; biker My bids must reflect that status even while offline.
5. Check another customer cannot open this ride's comparison and a biker cannot inspect/modify competitors' bids. Suspended/anonymous callers must fail protected operations. SQL authorization tests use actual restricted database roles.
6. Load more than 20 offers/archive records, refresh/reconnect and verify correct ordering and no duplicate cards. Leave/reopen screens and logout to check cleanup and safe empty/error/loading states.

## Results

| Check | Result | Scope |
| --- | --- | --- |
| Mobile unit/UI tests | PASS | 58 tests / 21 suites; comparison ratings/formatting, empty→live bid rendering, pagination parameters, authenticated reconnect/debounce/cleanup, existing fare validation and UI/auth regression |
| PostgreSQL | PASS | Seven migrations; 155 assertions including 14 new bid privacy, ownership, pagination, offline status and closed-ride checks; PGlite PostgreSQL 18.7 |
| Google proxy unit tests | PASS | Six unchanged tests |
| Lint / Expo SDK compatibility / Android JS export | PASS | Commands executed with existing Expo 58 dependencies |
| Hosted live bid/Realtime/race script | PASS | Actual customer INSERT/withdrawal events, concurrent duplicate calls, direct-write denial, reconnect/refetch, bid-update versus close and first-bid creation versus close; no pending bid remained on a closed ride; cleanup succeeded |
| Android customer comparison | PASS | Empty state, actual bid arriving without manual refresh, closure/withdrawal updates and logout |
| Android biker My bids | PASS | Submitted fare and withdrawn status displayed, available while offline, then screen cleanup/logout |
| Verification cleanup | PASS | Only created rides were closed; original biker availability and motorcycle fields restored |
| Hosted other-customer/other-biker/suspension combinations | NOT RUN | Covered with actual nonprivileged SQL test roles; only existing owned live accounts were used |
| Full Docker stack / iOS / release APK | NOT RUN | Hosted Supabase and isolated PostgreSQL used; installed Android development APK reused |

Limits: comparison is fare-ordered rather than an advanced sorting/filtering dashboard. Names/ratings are read when refreshing; no fabricated rating or new rating-entry feature is added. Assignment/selection, payments, chat and tracking remain outside this phase. Suggested commit: `feat(bids): add realtime fare comparison and bid status`.
