# Architecture

## Current repository

One Expo/React Native JavaScript mobile app, a reserved admin directory, versioned Supabase migrations, development seed data, SQL authorization tests, and setup documentation. The hosted Supabase project has not been created or linked. Existing Login/Registration screens remain local UI previews.

## Mobile boundaries

- `App.js` and `index.js`: Expo root, safe-area provider, status bar, and navigator.
- `src/screens/auth`: Splash, Login, Registration, and form styles.
- `src/components`: reusable fields, buttons, cards, status/feedback, and confirmation dialog.
- `src/navigation`: authentication screen navigation.
- `src/hooks`: local form state and validation lifecycle.
- `src/utils`: pure local validation and offered gender/role values.
- `src/theme`: centralized colors, system typography, spacing, dimensions, and borders.
- `src/services`: reusable lazy Supabase client and public configuration validation.
- `src/context`: reserved for a future authenticated session provider.

The SDK client uses AsyncStorage, process locking, and AppState-driven refresh. It is not initialized automatically by the current screens; missing credentials do not break the UI. AsyncStorage is app-private but unencrypted. No secret/service-role credential is included in the client.

## Database boundaries

- `supabase/migrations`: schema/constraints/indexes, RLS/read policies, and checked RPCs in order.
- `supabase/seed.sql`: explicitly enabled local-development fixture; disabled by default.
- `supabase/tests/database`: SQL constraints, relationship, permission, and role-isolation tests, rolled back after execution.
- `scripts/database`: isolated PostgreSQL test runner and test-only Supabase Auth schema/role shim.
- `scripts/check-supabase.mjs`: explicit hosted/public-key health and anonymous-denial probe.

The backend has profiles, biker_profiles, rides, bids, ratings, complaints, and admin_audit_logs. RLS is enabled on every exposed table. Client table access is read-only and role-filtered. Business writes go through RPCs that derive the authenticated owner, verify active account/role, and enforce state transitions. Trigger-created profiles allow Customer/Biker signup only; Administrator is trusted-operator provisioned.

## Scope limits

No hosted resource is created or modified by the repository tests. PGlite executes real PostgreSQL migrations, constraints, and role policies; it does not run Supabase Auth, PostgREST, or Realtime. Docker is needed for the full official local stack. Auth UI integration, maps/Google Edge Functions, Realtime publication/subscriptions, ride screens, and administrator screens remain later approved work.

See [database design](database.md), [Supabase setup](supabase-setup.md), [backend verification](backend-verification.md), and [UI contracts](ui-foundation.md).
