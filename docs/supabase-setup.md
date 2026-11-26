# Supabase setup

## Current status

The repository is configured and RLS remains enabled. A hosted project is now configured through `mobile/.env`, and authentication is connected. See [authentication configuration and verification](authentication.md) for the current flow. This guide remains the procedure for setting up a fresh project; earlier backend verification reports record their original test state.

## Create a completely new project

1. Sign in to [Supabase Dashboard](https://supabase.com/dashboard) and choose New project in your organization.
2. Name it RideShare Pro. Choose a region close to the intended users and an appropriate plan. Generate a strong database password and keep it in your password manager, outside application configuration and Git.
3. Wait for provisioning. Use the Connect panel to obtain the Project URL and **publishable** key beginning `sb_publishable_`.
4. In Auth configuration, keep email confirmation enabled for the hosted project. Configure application redirect URLs and email delivery when actual sign-in is implemented.
5. In Data API settings, expose only the application `public` schema. Never expose the `private` or `auth` schemas. If automatic grants for new public objects are configurable, disable them; these migrations explicitly grant permitted access.

Reference: [official Supabase React Native setup](https://supabase.com/docs/guides/auth/quickstarts/react-native).

## Install dependencies

The root workspace lockfile already includes the required packages:

```powershell
npm.cmd ci
```

Commands used to add this phase's dependencies were:

```powershell
npm.cmd exec --workspace=@rideshare/mobile -- expo install '@supabase/supabase-js@^2' @react-native-async-storage/async-storage react-native-url-polyfill
npm.cmd install --save-dev supabase @electric-sql/pglite
```

Versions at verification: supabase-js 2.119.2, Expo-compatible AsyncStorage 2.2.0, URL polyfill 4.x, Supabase CLI 3.2.0, and development-only PGlite 0.5.17. Use `npm run check:dependencies` rather than manually upgrading native dependencies.

## Configure the mobile environment

Copy the template:

```powershell
Copy-Item mobile/.env.example mobile/.env
```

Populate only these public client values:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

These are placeholders, not working credentials. Expo bundles `EXPO_PUBLIC_` values into the application. Do not use a Supabase secret key, service-role key, database password, or CLI access token here. The configuration validator deliberately rejects secret-key and legacy JWT-key formats, so a service-role JWT cannot accidentally become the client key. New hosted projects should use a publishable key.

The local UI continues to work without a `.env`. Restart Expo after editing public environment values.

## Reusable mobile client

`mobile/src/services/supabase.js` exports `getSupabase()`. It lazily creates one SDK instance, so importing the module does not require configuration or contact the backend.

```js
import { getSupabase } from '../services/supabase';

const supabase = getSupabase();
const { data, error } = await supabase.rpc('backend_health');
```

Sessions use AsyncStorage, persistence, current SDK refresh coordination, and foreground-only auto-refresh. The deprecated processLock option is not used. One refresh listener is registered per SDK client; `disposeSupabase()` removes it for application teardown. The authentication provider separately rechecks profiles on foreground return. The client does not detect sessions in URLs automatically; confirm email in the browser and return to Login manually.

AsyncStorage follows the official React Native setup and handles sessions larger than a small keychain entry. It is app-private storage, **not encrypted storage**. This phase does not claim keychain-backed token encryption. Never log stored sessions or expose device backups containing them.

References: [SDK initialization](https://supabase.com/docs/reference/javascript/initializing), [React Native session handling](https://supabase.com/docs/guides/auth/quickstarts/react-native).

## Apply the versioned migrations to the new hosted project

The CLI is installed locally in the workspace. Run from the root, using your own account and project reference:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
npx.cmd supabase db push --dry-run --remote
npx.cmd supabase db push --remote
```

Use the CLI's interactive credential handling. Do not put passwords in command arguments, source files, or chat. A fresh project should list these seven migrations in order; an existing linked project lists only pending migrations:

1. `20261120000100_schema.sql`: tables, constraints, indexes, triggers, RLS enablement, and explicit table grants.
2. `20261120000200_authorization.sql`: private caller-role helpers and row-read policies.
3. `20261120000300_operations.sql`: restricted business RPCs and the nonsensitive health probe.
4. `20261124000100_maps_rate_limits.sql`: private, RLS-enabled map request counters and a service-only atomic budget RPC. See [Google Maps deployment and secrets](google-maps.md).
5. `20261126000100_customer_posting.sql`: permitted Google place-ID storage and customer-only idempotent posting. See [customer posting](customer-posting.md).
6. `20261126000200_biker_dashboard.sql`: private discovery projections, minimal Realtime publication, protected biker route inputs, and checked bids. See [biker dashboard](biker-dashboard.md).
7. `20261126000300_fare_bidding.sql`: checked bid comparison/archive projections and bid Realtime publication. See [fare bidding](fare-bidding.md).

Do not include development seed data in a hosted push. Seed execution is disabled in `config.toml`; do not add `--include-seed`. Future schema changes should use a new migration rather than editing a migration already applied to a project.

Reference: [Supabase migration workflow](https://supabase.com/docs/guides/local-development/cli-workflows).

## Verify hosted connectivity after deployment

```powershell
npm.cmd run db:connectivity
```

The script loads `mobile/.env`, checks the health RPC and schema version, then checks that an anonymous client with only the publishable key is denied SELECT on all seven application tables. It prints no key or session. Missing configuration reports NOT RUN (nonzero exit); network, migration, key, or permission failures report FAIL. A connectivity PASS is not a complete authenticated security test.

After Auth integration is implemented, create separate customer, biker, and administrator test accounts in a throwaway project and repeat the [RLS test matrix](database.md). Never test RLS using only the Dashboard SQL editor: its privileged database role bypasses ordinary client policies.

## Local Supabase stack with Docker

Install Docker Desktop or another CLI-supported container runtime and start it. The official CLI needs containers to run PostgreSQL, Auth, the Data API, and Studio together.

```powershell
npm.cmd run db:start
```

The local project config uses PostgreSQL 17, public-schema-only API access, explicit object grants, and seed data disabled by default. Match the PostgreSQL major version to the hosted project if the Dashboard reports a different version.

To initialize a throwaway local test database **and erase its current local data**, run:

```powershell
npm.cmd run db:reset:dev
npm.cmd run db:test:local
npm.cmd run db:lint:local
```

The reset script targets the local stack by default and explicitly enables `seed.sql` using the installed CLI's `--sql-paths` flag. Do not append a remote target to this development reset. The SQL test file requires that fresh fixture and rolls back all its own changes. Tests emit TAP assertions and can run with the CLI's test runner.

`seed.sql` contains synthetic `.invalid` email addresses, five users, two open rides, two bids, and a complaint. Users have no password/identity credentials and are not sign-in accounts. No rating is seeded for an open ride; the tests complete a ride before creating one. Seed replay on a fresh fixture is idempotent.

For a client in Android Emulator, a host-local API normally uses `http://10.0.2.2:54321`; a Node script on Windows uses `http://127.0.0.1:54321`. Retrieve the local publishable key from the local API configuration. Do not substitute a secret/service-role key. Hosted HTTPS URLs work for both environments.

References: [local development](https://supabase.com/docs/guides/local-development), [seeding](https://supabase.com/docs/guides/local-development/seeding-your-database).

## Database tests without Docker

```powershell
npm.cmd run db:test
```

This runs the migrations and seed twice in ephemeral PostgreSQL via PGlite, then executes the shared SQL tests. The test-only bootstrap supplies the Supabase database roles, a minimal `auth.users` table, and an `auth.uid()` shim. It is never deployed as a migration.

These are actual PostgreSQL constraint/function/RLS tests, not mocked policy predicates. They do not run GoTrue, verify signed JWTs, expose PostgREST, test Realtime delivery, or simulate simultaneous independent connections. Run the full local/hosted checks before claiming end-to-end backend readiness.

## Provision the first administrator

Use a dedicated, verified administrator identity created through Supabase Auth. Public signup can never select Administrator. After confirming its exact UUID and purpose, an authorized project operator can run this in the trusted SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = 'REPLACE_WITH_DEDICATED_ADMIN_AUTH_USER_UUID'
  and role = 'customer'
  and not exists (select 1 from public.rides where customer_id = profiles.id);
```

The placeholder must be replaced with an actual reviewed UUID. Do not repurpose a customer/biker identity with historical business records. Role assignment is intentionally absent from public RPCs; trusted operator access is the provisioning boundary. Administrator account suspension and role changes likewise remain trusted-operator operations. Admin users can manage customer/biker account status and complaints through the checked admin RPCs.

## Verification record

See the historical [backend verification](backend-verification.md), current [authentication verification](authentication-verification.md), and [database design](database.md) for relationships, policies, and RPC contracts.
