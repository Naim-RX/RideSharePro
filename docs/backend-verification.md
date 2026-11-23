# Backend foundation verification

Date: 2026-11-20 (Asia/Dhaka).

## Delivered

- Official Supabase JavaScript SDK 2.119.2, Expo-compatible AsyncStorage 2.2.0, URL polyfill, and a reusable lazy mobile client with process locking and AppState-driven session refresh.
- Public Project URL/publishable-key environment template, validation that rejects secret/service-role key formats, and a health/anonymous-access connectivity script.
- Three timestamped migrations: schema/constraints/indexes/triggers, RLS/read authorization, and restricted business RPCs.
- Required profiles, rides, bids, ratings, and complaints tables; biker_profiles and admin_audit_logs support availability, vehicle details, and audited administration.
- Development-only synthetic seed data, disabled by default in local config, and database authorization tests.
- Official Supabase CLI config, PostgreSQL test runner, project-creation/deployment instructions, database relationship diagram, RLS matrix, and manual verification instructions.

## Executed checks

Host: Windows PowerShell, Node.js 26.13.0, npm 11.20.0.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | PASS | Mobile/service lint exited 0, with warnings treated as errors. |
| `npm run test:mobile` | PASS | Seven suites, sixteen tests; UI regression and new client/configuration tests. |
| `npm run db:test` | PASS | All three migrations applied, development seed replayed twice, 101 SQL assertions passed. |
| `npm test` | PASS | Combined mobile/client and PostgreSQL suites passed. |
| `npm run check:dependencies` | PASS | Expo reported Dependencies are up to date. |
| `npm run export:android` | PASS | Current application exported successfully; 858 production modules. The current screens do not initialize the lazy backend client. |
| Node script syntax, lock consistency, `git diff --check` | PASS | No syntax/lock/whitespace errors. |
| Supabase CLI version/init | PASS | CLI 3.2.0 initialized configuration; supported setup/reset/query/test flags inspected. |
| `npm run db:start` | FAIL — environment | Official CLI reported Docker not found, and Podman also not found. No local containers started. |
| Full local Supabase SQL lint/test commands | NOT RUN | Require the unavailable container stack. |
| `npm run db:connectivity` | NOT RUN | Script executed and reported missing configuration. User confirmed the new hosted project has not been created. |
| Hosted migration deployment / signed-in HTTP RLS tests | NOT RUN | No hosted project or user sessions exist. |
| Concurrent assignment from independent connections | NOT RUN | The isolated engine has one exclusive connection. |
| Native session restoration / actual Auth / physical device | NOT RUN | Client options/lifecycle are unit-tested; Login/Registration remain local previews. |

## What the SQL tests establish

The engine was PostgreSQL 18.7 via PGlite 0.5.17, running in memory. The application migrations are executed unchanged. A test-only bootstrap supplies Supabase roles, a minimal auth.users table, and an auth.uid() shim. The role policies and SQL operations themselves are real PostgreSQL, not mocked conditions.

The local Supabase configuration defaults to PostgreSQL 17. Version-matched PostgreSQL 17 execution has **not** been established in this environment. Match the CLI major version to the new hosted project and run the full-stack tests before relying on native/hosted compatibility.

The 101 SQL assertions cover:

- RLS on all exposed application tables and minimal table/function grants.
- UUID identifiers, NUMERIC monetary data, generated timestamps, NOT NULL/CHECK/UNIQUE enforcement, and rejection of negative/NaN fares and out-of-range coordinates.
- Auth/profile and bid/ride foreign keys, participant-matching rating relationships, accepted-bid/fare consistency, historical ownership integrity, and prevention of orphaned history.
- Anonymous denial on every application table and sensitive RPC; the intentional health probe exposes only application/version/time.
- Customer/private profile isolation, own rides and bids, bidder summaries, competing-bid privacy, complaint privacy, and administrator-only audit visibility.
- Signup metadata privilege escalation, later metadata edits, direct role/status/ownership/status-transition edits, wrong-role RPC calls, and self-reactivation attempts.
- Availability checks, one active customer ride, one assigned biker ride, pending bid revision without duplicates, assignment retry, competing selection rejection, ride transitions, completed-only rating, and duplicate rating rejection.
- Admin complaint review, account suspension, exception cancellation, audit records, and denial of operations by suspended accounts.
- Defense in depth: RLS still denies writes when a test transaction deliberately adds table-write grants. Those test changes roll back.

No test disables RLS. Privileged operations are used only for fixture setup, catalog/constraint assertions, and deliberately trusted administrative provisioning. Authorization assertions use the nonprivileged `anon` and `authenticated` roles with controlled caller UUIDs.

## Issues corrected during verification

- The CLI initially lacked access to its user configuration directory. A permitted retry succeeded.
- A foreign-key history test originally expected foreign_key_violation; PostgreSQL correctly emitted restrict_violation for the explicit ON DELETE RESTRICT relationship. The expected SQLSTATE was corrected.
- A test initially nested a data-modifying CTE; it was moved to the top level as PostgreSQL requires.
- The shared SQL test suppresses non-TAP setup query output and rolls its changes back. The official container test runner has not been executed here.

## Limitations

The in-memory tests do not verify GoTrue triggers under the deployed Auth service, JWT signature verification, PostgREST schema exposure, native session persistence, Realtime, network behavior, or actual concurrent transaction interleavings. SQL locking/uniqueness rules are implemented, but independent-connection races require the full database environment.

Session persistence uses app-private **unencrypted** AsyncStorage, following the official React Native setup. No keychain-backed encryption is claimed. No client secret/service-role key, database password, or CLI token is stored in application files.

Installation reported the existing 22 moderate Expo/Jest transitive dependency advisories; no forced SDK downgrade was applied. An independent security audit was not rerun in this phase.

## Manual follow-up

Follow [Supabase setup](supabase-setup.md) to create a new hosted project, apply migrations, populate only public client configuration, and run `npm run db:connectivity`. Follow [database design and test matrix](database.md) for authenticated role checks. A fresh throwaway container stack can run `db:reset:dev`, `db:test:local`, and `db:lint:local`.

No hosted project was created, linked, or modified. No Git commit was created. This phase does not connect the existing authentication screens or implement ride/admin screens.

Suggested commit: `feat: add Supabase client and secure PostgreSQL backend foundation`
