# Architecture

## Current repository

One Expo/React Native JavaScript mobile application, a reserved admin directory, versioned Supabase migrations, and separate database/authentication tests. The mobile authentication screens are connected to the hosted project configured in ignored mobile/.env.

## Mobile boundaries

- `App.js`: Expo root, safe-area provider, status bar, AuthProvider, and RootNavigator.
- `src/context/AuthContext.js`: subscribes to the authentication controller and foreground events; exposes account actions to screens.
- `src/services/authController.js`: session/profile state machine, deferred Auth event work, restoration, versioned race guards, and logout.
- `src/services/authService.js`: normalized email/password registration/login, confirmation resend, server identity verification, and private profile reads.
- `src/services/authErrors.js`: safe error categories and messages.
- `src/services/supabase.js`: one validated SDK client, persisted AsyncStorage sessions, foreground refresh, current SDK coordination, bounded network fetches, and teardown.
- `src/services/fetchWithTimeout.js`: 30-second request cancellation preserving caller signals.
- `src/navigation`: signed-out authentication stack and role-specific account destinations; stacks are replaced on logout.
- `src/screens/auth`: Splash, Login, Registration, and shared form styles.
- `src/screens/account`: minimal authenticated role landing and blocked-account states; no ride/dashboard features.
- `src/hooks`: local field validation and asynchronous submit/loading/error lifecycle with duplicate-press guard.
- `src/components`, `src/theme`, and `src/utils`: shared UI, system design tokens, and pure validation.

## Identity and roles

Supabase verifies email/password. A trigger creates profiles linked to auth.users atomically, maps only Customer/Biker signup roles, and initializes biker details. Client code never inserts or upserts a profile or authorizes with editable user_metadata.

A stored session alone does not grant protected navigation. The controller verifies getUser(), loads the protected database profile, checks active status and required profile data, and routes using profiles.role. Suspended/missing/invalid profiles fail closed. Database RLS/RPC checks independently enforce authorization for every protected operation.

Email-confirmation settings are respected: a null signup session prompts confirmation and manual return to Login; an immediate session is handled automatically when the server allows it. No SMS, OAuth, automatic confirmation deep links, or password-reset feature is implemented.

## Persistence and concurrency

SDK sessions persist in app-private unencrypted AsyncStorage; application code does not store passwords. Auth events, token refresh, and foreground return trigger profile rechecks. Deferred callbacks avoid reentrant SDK work, and generation checks prevent old profile/restore results from resurrecting a logged-out account.

Local-scope logout removes this device's SDK session, verifies persisted state is empty, and does not claim server revocation succeeded if offline. A failed local cleanup remains blocked. Current SDK refresh coordination replaces the deprecated custom process lock. Network requests are bounded and cancelled rather than merely raced against a timeout.

## Database and verification

The three existing migrations define schema, constraints, indexes, RLS/read policies, trusted signup initialization, and checked RPCs. No RLS policy was weakened for authentication. SQL tests run in isolated PostgreSQL; live authentication tests require owned test accounts and a configured hosted project. Live tests print no credentials and restore test metadata after escalation checks.

See [authentication](authentication.md), [authentication verification](authentication-verification.md), [database design](database.md), and [Supabase setup](supabase-setup.md). Assignment UI and full admin functionality remain later approved work.

## Biker dashboard

`BikerNavigator` supplies Home/History/Profile and the root stack supplies Ride Details. `bikerService` owns checked availability, vehicle, discovery, detail and bid operations. Open-ride data comes from limited projection RPCs, not raw ride SELECT. A session-bound, focused Realtime subscription consumes minimal availability notifications and the caller's own profile changes, debounces invalidations, re-queries authorized data and removes channels on blur. The server resolves ride-specific Google route inputs for active available bikers. No assignment or tracking operation is added. See [biker dashboard](biker-dashboard.md).

## Bid comparison and status

`bidService` reads checked customer comparison and biker archive projections and owns ride-/biker-filtered bid subscriptions. Customer Home opens `CustomerBidsScreen`; biker Home opens `BikerBidsScreen`. Realtime invalidations, join/reconnect and foreground return refetch authorized data. Shared BidCards display real ratings and fare/status without a selection action. Database uniqueness and ride-first transaction locks serialize bid creation/revision against closure. See [fare bidding](fare-bidding.md).

## Maps preview boundary

Customer navigation includes Home/History/Profile tabs and a preview/posting stack. `LocationField` owns autocomplete sessions; `mapsService` invokes the protected Google Edge Function. `RouteMap`/`RouteSummary` share map presentation. Google addresses, coordinates, geometry and estimates stay in memory. `rideService` saves permitted place IDs, customer-entered labels, mode and fare via the customer-only RPC, with a per-account durable pending request. PostgreSQL derives ownership, serializes posting, rejects changed-payload replay, and enforces RLS and one active ride. See [customer posting](customer-posting.md) and [maps setup](google-maps.md).
