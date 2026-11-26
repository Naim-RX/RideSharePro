# Customer dashboard and ride posting

## Flow

Home → Continue → Route preview → Confirm Route → Post ride → Home. Bottom tabs provide Home, History and the existing account Profile/Logout screen. Home shows the active ride and three recent completed/cancelled rides. History pages through completed/cancelled rides in groups of 20. Reads refresh on focus or manually, with loading, empty and retry states; Realtime is outside this phase.

`CustomerNavigator` uses React Navigation bottom-tabs 7 with the existing native dependencies. Screens live in `mobile/src/screens/customer/`. `RouteMap` and `RouteSummary` reuse map/estimate presentation, and `rideService` contains database access and pending-request recovery. The former standalone route planner has been replaced by this flow. Authentication screens and the protected Google Maps Edge Function remain unchanged.

Continue requires two different selected places and creates a UUIDv4 request key. Preview calls the existing Routes proxy, decodes/draws its road polyline, fits the map camera and shows km/min, actual routing mode, warnings and attribution. An unavailable route cannot be confirmed. Confirmation replaces the preview with the fare form.

Expected fare is BDT 0.01–999999.99 with at most two decimal places. Zero, negatives, scientific notation, separators and excess decimals are rejected. The button shows loading and is disabled during processing; a ref guard also rejects repeated presses. Once attempted, a retry preserves the same fare and payload. Success resets navigation to Home and reads the persisted active ride. An existing active ride prevents another booking in the UI and database.

## Storage and Google content

Google-backed rides retain place IDs, customer-entered search labels, routing mode, fare, owner, request key, status and database timestamps. `LocationField` captures the original typed text separately from Google's selected formatted address. The form explains that this original text becomes the ride label.

Google addresses, provider attributions, coordinates, route geometry, distance and duration stay in memory for preview. They are not persisted in the database or pending-request store. Place IDs are exempt from Google caching restrictions; this design avoids retaining other Google content instead of depending on an expiry job. Historical rides show customer-entered labels and business data, without replaying a stored Google route. Existing manual records retain their independently supplied coordinates and metrics.

References: [Places retention/attribution](https://developers.google.com/maps/documentation/places/web-service/policies), [applicable service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms), and [Google setup/billing/privacy prerequisites](google-maps.md). EEA billing accounts require reviewing their separate terms before publication.

## Database and ownership

Migration `20261126000100_customer_posting.sql` adds `location_source`, pickup/destination place IDs and `routing_mode`. Its storage constraint requires different place IDs and a mode for Google-backed rides, with null Google coordinates/distance/duration. Existing manual rows retain required coordinates/metrics, and the legacy checked `post_ride` RPC remains compatible.

`post_customer_ride` accepts a request key, place IDs, customer-entered labels, mode and fare. It has no owner/status argument. The pinned-search-path SECURITY DEFINER function requires an active customer profile, derives ownership from `auth.uid()`, locks the profile to serialize requests, and inserts status `open`. A matching replay returns the existing ID; the same key with different data raises SQLSTATE 22023. Fare precision is checked before NUMERIC(10,2) could round it. Existing unique `(customer_id, request_key)` and one-active-ride constraints remain enforced.

RLS remains enabled and unchanged. Customers read only their own rides and cannot directly INSERT/UPDATE records or forge ownership. Anonymous callers lack RPC execution; biker/admin/suspended callers fail the active-customer role check. Existing authorized biker/admin read policies remain intact. Place ID syntax is validated; this RPC does not certify physical presence or independently recalculate Google routes. The app obtains fresh Google results before confirmation; estimates do not set a protected fixed fare.

## Interrupted requests

Before the RPC, `rideService` saves an immutable pending payload under a user-specific AsyncStorage key. It contains only the permitted data above. Failure to save prevents network submission. Ambiguous network failures retain the exact key/payload. Definitive validation, authorization and active-ride rejection clear it; confirmed creation clears it too.

Home reconciles that key against the authenticated customer's records. A committed response lost in transit becomes the existing active ride. An uncommitted request offers Resume posting, which retries the same payload. A separate/different request cannot overwrite an unresolved request. Pending data remains available when the same account signs in again, is isolated by account key, and never authorizes a database operation. Corrupt local data fails closed instead of silently risking duplicates. AsyncStorage is app-private and unencrypted, as in the existing session implementation.

## Deploy and run

The migration was applied to the linked RideShare Pro project after explicit approval. No new secret or Edge Function deployment is required. On another development project apply all migrations in order, without hosted development seed data:

```powershell
npm ci
npx supabase db push --remote --dry-run
npx supabase db push --remote --yes
npm run android
```

Use the existing [Google Maps environment and Android development-build setup](google-maps.md). Subsequent JavaScript sessions can use `npx expo start --dev-client` from `mobile`. Bottom-tabs adds no new native module.

```powershell
npm run lint
npm test
npm run check:dependencies
npm run export:android
npm run rides:test:live
```

Live tests use the existing owned accounts in ignored `mobile/.env.auth-test`, print no credentials/private ride data, and create a synthetic development ride only if the customer has no active ride. Concurrent replay and persisted ownership are checked, then only the verification-created ride is cancelled. An existing active ride is left unchanged and creation reports NOT RUN.

## Manual emulator tests

1. Customer login: verify Book a ride, fields, Continue, active/recent sections and Home/History/Profile tabs. Missing locations disable Continue; choosing the same place shows a validation error.
2. Select pickup/destination with the keyboard open. Continue and verify Google tiles, both markers, road polyline, camera fit, km/min, mode warning and attribution. A route error must prevent confirmation and offer retry.
3. Confirm Route. Try empty, zero, negative, excessive and over-precision fares. Enter valid BDT and rapidly press Post Ride: verify loading/disabled state and one active record.
4. Restart the app. The same active ride/fare remains visible and another active booking is blocked. Check History, Profile and Logout; protected screens must disappear.
5. In a disposable project, interrupt the network after submitting, then retry or restart. A committed request reconciles to the same ID; an uncommitted one resumes using the same key. Local storage failure must prevent submission.
6. Verify another customer cannot read/update the ride, and anonymous/biker/suspended callers cannot post. SQL tests exercise these roles without disabling RLS.

## Results — 26 November 2026

| Check | Result | Scope |
| --- | --- | --- |
| Mobile tests | PASS | 49 tests, 16 suites: auth/UI regression, route confirmation/error, fare validation, immutable retry, pending-store restart and reconciliation |
| PostgreSQL | PASS | Five migrations; 124 SQL assertions, including 14 new posting/authorization assertions; PGlite PostgreSQL 18.7 |
| Google proxy unit tests | PASS | Five existing tests |
| Lint / Expo compatibility / Android JS export | PASS | Commands executed; existing Expo SDK 58 compatibility retained |
| Hosted RPC | PASS | Invalid/missing input, anonymous/biker denial, concurrent duplicate requests → one ride, open status/derived owner, ownership-edit denial, changed-payload rejection |
| Android development APK UI | PASS | Real autocomplete → route → confirmation → invalid fare → posting → active ride; persisted after process restart; History/Profile/Logout |
| Test cleanup | PASS | API-created and uniquely identified emulator-created test rides cancelled; no pre-existing ride cancelled |
| Native kill during in-flight RPC | NOT RUN | Retry/restart logic tested with persistent storage fixtures; actual native restart tested after successful creation |
| Full Docker stack / iOS / release APK | NOT RUN | Hosted Supabase and PGlite used; installed x86_64 Android development APK reused for JavaScript changes |

Limits: focus/manual refresh; no customer cancellation UI, bidding/assignment UI, Realtime, ratings, complaints, profile editing, payments or tracking. Active rides stay on Home; completed/cancelled records appear in History. Suggested commit: `feat(customer): add dashboard and idempotent ride posting`.
