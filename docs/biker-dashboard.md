# Biker dashboard — 26 November 2026

## Implemented flow

Biker login opens **Available rides**, with a persisted Online/Offline switch, a limited ride-request list and View Ride buttons. Home, History and Profile use the existing React Navigation bottom tabs. Profile shows only the biker's own account and motorcycle fields. A model and unique plate must be saved before going online; the existing database constraint enforces this too.

Ride Details shows pickup/destination labels, the expected BDT fare, a route-preview action, distance/duration when available, the biker's existing offer and a proposed-fare form. Submit Bid validates BDT 0.01–999999.99 with at most two decimal places. Loading disables submission and a ref guard prevents double presses. The database's unique ride/biker pair updates a pending offer instead of creating duplicate bids. Confirmation says the offer is pending; it does not assign a biker or change the ride's status. History reads only the biker's previously assigned completed/cancelled rides, including while offline. This phase does not create assignments, so new test accounts have an empty history.

Files: `mobile/src/navigation/BikerNavigator.js`, `mobile/src/screens/biker/`, and `mobile/src/services/bikerService.js`. Shared Screen, headers, buttons, fields, state components, RideCard, RouteMap and RouteSummary are reused. No dependency or device location permission was added.

## Privacy and authorization

Migration `20261126000200_biker_dashboard.sql` removes direct open-ride access from the generic `rides` read policy. Customers still read their own records, administrators retain existing authorized access, and bikers retain their assigned records. Open discovery uses checked SECURITY DEFINER RPCs with empty search paths:

- `list_biker_rides(history, before, before_id)` requires an active biker and availability for open discovery. It returns at most 20 rows with a descending `(created_at, id)` cursor. Historical reads filter by authenticated biker ID.
- `get_biker_ride(ride_id)` returns one currently open ride and that caller's own bid. Both functions exclude customer UUID, request key, place IDs, contact details and competing bids. Suspended customers' requests are excluded.
- `get_biker_route_points(user_id, ride_id)` is executable only by the server role. It checks the verified biker's status, online flag, absence of another assigned/in-progress ride, and the requested ride's availability.
- `submit_bid` derives biker identity from Auth and rechecks availability and customer status inside the database transaction. It rejects excessive precision before NUMERIC could round it. Offline, suspended, customer and anonymous callers cannot bid.

`set_biker_availability` and `update_my_motorcycle` remain the existing checked RPCs. Profile role/account status cannot be changed by the form. RLS remains enabled; ordinary clients have no direct INSERT/UPDATE/DELETE grants for ride/bid business tables.

## Realtime

`ride_availability_events` contains only a ride UUID, availability flag and database timestamp. Ride inserts/updates and customer-status changes invalidate this small record. There is at most one event row per ride; the FK cascades on deletion. Online/available bikers can SELECT it under RLS. The fare-bidding phase also allows customers to read their own ride events for closure updates; anonymous users cannot read it. Public ride rows are not added to the publication.

The migration publishes that event table plus `profiles` and `biker_profiles` to `supabase_realtime`. The latter two retain their private existing RLS; the app filters them to its own biker ID. Those events let another session going offline or suspension invalidate visible data.

`subscribeBiker` obtains the current SDK session, verifies its user ID matches the screen, explicitly sets Realtime Auth, then joins. Messages are invalidations rather than displayed data. Refreshes debounce for 350ms and re-query authorized RPCs. Initial join, reconnect, screen focus and Home foreground activation refresh the list. A live refresh resets pagination to the newest page. Channel failures clear the list/disable stale detail bidding and show a readable refresh message. On blur/unmount/logout, timers are cleared and channels removed; late callbacks are ignored. There is no GPS or location tracking.

Official reference: [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). No RLS or authentication was disabled to get events working.

## Route measurements and Google limits

Independently supplied manual rides can show stored distance/duration immediately. Google-backed rides retain place IDs rather than cached Google route measurements. Their list card says **Distance: view route estimate** until a fresh estimate is requested in Ride Details. The app does not invent distances or bulk-fetch 20 paid Google routes when opening a page. This is a deliberate limitation of list-only evaluation for Google-backed rides.

The protected Google Edge Function now accepts `biker_route` with only a ride UUID. A customer cannot use this operation, and a biker cannot use unrestricted autocomplete/details/customer-coordinate route actions. The server resolves permitted place IDs/manual coordinates after verifying the caller. Routes API accepts place-ID waypoints and returns the road geometry and leg endpoints for markers. Both coordinates and measurements remain transient screen state and are discarded when the screen closes or the ride becomes unavailable. No Google content is written back to PostgreSQL.

Motorcycle routing is attempted first, with the existing explicitly labeled driving fallback and beta warning. Preview quota is six logical requests per biker per UTC minute; a fallback can make two upstream calls. Missing/unavailable routes, Google configuration/billing errors and quota errors appear without blocking an otherwise authorized fare offer. Existing Cloud API/key restrictions and attribution remain applicable. See [Google Maps setup](google-maps.md) and [Google waypoint documentation](https://developers.google.com/maps/documentation/routes/specify_location).

## Deployment and running

The migration and updated `google-maps` function have been deployed to the linked RideShare Pro project after approval. No new secret is needed. For another project apply all migrations in order and deploy the function:

```powershell
npm ci
npx supabase db push --remote --dry-run
npx supabase db push --remote --yes
npx supabase functions deploy google-maps --use-api --yes
npm run android
```

Verify Dashboard → Database → Publications → `supabase_realtime` includes `ride_availability_events`, `profiles` and `biker_profiles`. Keep RLS and their policies enabled. For JavaScript development after installing the existing Android development APK, run `npx expo start --dev-client` from `mobile`. Expo Go cannot verify the app's restricted native Maps key; existing Android SDK/development-build instructions remain in the Maps guide.

## Automated and live tests

```powershell
npm run lint
npm test
npm run db:connectivity
npm run check:dependencies
npm run export:android
npx --yes deno check supabase/functions/google-maps/index.ts
npm run biker:test:live
```

The live script uses the previously authorized accounts in ignored `mobile/.env.auth-test`. It records biker settings, temporarily supplies a synthetic motorcycle if needed, exercises offline/online queries, joins a real authenticated channel, creates a customer-owned test ride, receives its minimal event, checks private-row denial and unique bids, then removes the channel, cancels only the test-created ride and restores the original biker settings. It leaves any pre-existing active customer ride unchanged and reports creation-dependent checks NOT RUN. Google route checks may incur normal API charges. No credentials or private payloads are printed.

| Check | Result | Evidence |
| --- | --- | --- |
| Mobile unit/UI tests | PASS | 54 tests / 19 suites, including availability, pagination arguments, empty states, inline bid validation, refresh invalidation, session-bound subscription, debounce and cleanup |
| PostgreSQL | PASS | Six migrations, 141 assertions including 17 new biker privacy/availability/history/authorization checks; PGlite PostgreSQL 18.7 |
| Google proxy unit tests | PASS | Six tests, including biker UUID validation and server-provided place waypoints |
| Lint / SDK compatibility / Android JS export / Deno check | PASS | Commands executed with existing Expo SDK 58 native dependencies |
| Hosted authorization | PASS | Offline/customer/anonymous discovery denial, persisted availability, bounded projection, private raw open-row denial, unique bids, invalid precision and offline bid rejection |
| Hosted Realtime | PASS | Actual authenticated ride notification received with no customer fields; channel removed; first test timeout was resolved before final verification |
| Android development APK | PASS | Profile motorcycle setup, online switch, new ride arriving without manual refresh, real motorcycle road route/markers, inline invalid fare, bid success, cancellation removing the row through Realtime, offline/empty history/tabs/logout |
| Customer Maps regression | PASS | Real customer autocomplete/details/route and authenticated SDK invocation still work |
| Anonymous reads | PASS | Denied on all eight exposed application tables |
| Cleanup | PASS | Only verification-created rides cancelled; original test motorcycle/availability restored |
| Hosted administrator suspension / load testing / iOS / release APK | NOT RUN | Suspension covered by actual SQL authorization tests; no live administrator account was used |

## Manual emulator checklist

1. Sign in as a biker. Confirm Available rides and Home/History/Profile tabs. Add motorcycle model and plate in Profile. A missing vehicle must prevent going online with a helpful message.
2. Toggle online/offline. Check the persisted value after reopening the app; offline Home must show no open requests. Refresh should handle network failures without exposing stale usable data.
3. While online, post a ride from a customer session. It must appear without manual refresh. Cancel that customer-owned ride; it must disappear. Repeat after leaving/reopening Home to exercise subscription cleanup and reconnect.
4. Open View Ride. Check only location labels, expected fare and evaluation data are shown. Preview a route and verify markers, road polyline, fit, km/min, mode warning and attribution. Test unavailable-route/network/quota errors.
5. Try zero, negative, excessive and over-precision proposed fares. Enter valid BDT and rapidly press Submit Bid; only one pending bid may exist for this biker/ride. Revising a pending offer updates that record. No assignment or ride-status transition should occur.
6. Switch offline from another session while Details is open, or suspend a disposable test account through trusted administration. New bids must fail and stale details must clear. Another customer/biker cannot read private customer/competing-bid information.
7. Page through more than 20 requests using Load more, then introduce a new event; the newest page should refresh. Check empty History and Logout. Confirm focused channels are removed when leaving screens.

Limits: Google-backed list distances require an explicit fresh preview; History contains assigned past rides, not a complete offer archive. No assignment/start/complete UI, customer selection, live tracking, chat, payment or background location was added. Suggested commit: `feat(biker): add realtime dashboard and protected bidding`.
