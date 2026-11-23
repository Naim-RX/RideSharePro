# RideShare Pro

A JavaScript React Native application using Expo SDK 58, with a UI foundation and a versioned Supabase/PostgreSQL backend foundation. Splash, Login, and Registration still validate locally. The hosted Supabase project has not been created or deployed yet.

## Install and run

Use Node.js 22.22.2+ within 22.x, 24.15+ within 24.x, or 26+, and npm. From the repository root:

```sh
npm ci
npm start
```

Start a virtual device in Android Studio **Tools > Device Manager**, then run `npm run android`, or press `a` in Expo. Use Expo Go compatible with SDK 58. See [Android setup](docs/android-emulator.md).

Dependencies and the installation lockfile are managed from the root npm workspace. Do not create a second lockfile in `mobile/`.

## Structure

```text
mobile/
  App.js
  app.config.js
  index.js
  src/
    screens/auth/
    components/
    navigation/
    hooks/
    services/
    context/
    theme/
    utils/
admin/                  # Reserved
supabase/migrations/    # Schema, RLS, and restricted business RPCs
supabase/functions/     # Reserved
supabase/tests/         # SQL authorization/constraint tests
scripts/                # Database tests and connectivity probe
docs/
```

`mobile/src/theme/index.js` defines colors, system typography, spacing, borders, and dimensions. `AuthNavigator` connects Splash, Login, and Registration. The component barrel exports all twelve requested reusable primitives. Details and prop contracts: [UI foundation](docs/ui-foundation.md).

## Checks

```sh
npm run lint
npm test
npm run check:dependencies
npm run export:android
npm run db:test
npm run db:connectivity
```

`npm test` runs mobile tests and isolated PostgreSQL tests. `npm run check` runs lint, those tests, Expo compatibility, and Android export. `db:connectivity` is separate because it needs the new project and public environment values; missing values report NOT RUN. Android export validates bundling rather than an APK build.

Start with [Supabase setup](docs/supabase-setup.md), [database relationships and RLS](docs/database.md), and [backend verification](docs/backend-verification.md). [UI verification](docs/ui-foundation-verification.md), [manual UI testing](docs/manual-testing.md), and the [initialization report](docs/phase-1-verification.md) record the earlier UI milestones.

## Environment and Git

`mobile/.env.example` and `admin/.env.example` contain public placeholders. The UI needs no values; the lazy Supabase client and connectivity probe require the Project URL and publishable key. Do not place Supabase secret/service-role keys or Google server keys in client environment files. Local env files, dependencies, build output, logs, and signing keys are ignored. Git is initialized; no commit is created automatically.

## Scope

Forms validate locally and explicitly state that Login and account creation are unavailable. The reusable Supabase client is ready for a future Auth integration and will persist sessions in app-private AsyncStorage when used; the current screens send no credentials. RideCard and BidCard remain presentation components. Database operations are implemented as restricted RPCs, with no ride, bidding, or admin UI integration yet. Maps, protected Google APIs, and Realtime subscriptions/publication setup remain later work.
