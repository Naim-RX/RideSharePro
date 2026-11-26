# RideShare Pro

A JavaScript React Native application using Expo SDK 58, Supabase Auth, and a versioned PostgreSQL backend. Customer and biker authentication is connected. Customers can preview Google Maps routes using authenticated Places (New) and Routes requests through Supabase Edge Functions.

## Install and run

Use Node.js 22.22.2+ within 22.x, 24.15+ within 24.x, or 26+, and npm. From the repository root:

```sh
npm ci
npm run android
```

Configure the environment and [Google Maps prerequisites](docs/google-maps.md), then start a virtual device in Android Studio **Tools > Device Manager**. `npm run android` builds and installs the custom development client and starts Metro. For subsequent JavaScript sessions, use `npm start`. A development build is required to verify your own restricted Maps SDK key; Expo Go does not establish that the key works.

Dependencies and the installation lockfile are managed from the root npm workspace. Do not create a second lockfile in `mobile/`.

## Structure

```text
mobile/
  App.js
  app.config.js
  index.js
  src/
    screens/auth/
    screens/account/
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

`mobile/src/theme/index.js` defines colors, system typography, spacing, borders, and dimensions. `AuthProvider` restores sessions and verifies the server profile before `RootNavigator` opens a role-specific account screen. Login/Registration retain the simple UI foundation. Details: [authentication](docs/authentication.md) and [UI components](docs/ui-foundation.md).

## Checks

```sh
npm run lint
npm test
npm run check:dependencies
npm run export:android
npm run db:test
npm run db:connectivity
npm run auth:settings
```

`npm test` runs mobile tests, isolated PostgreSQL tests, and Google proxy unit tests. `npm run check` runs lint, those tests, Expo compatibility, and Android export. Live connectivity and `maps:test:live` are separate because they require hosted credentials/configuration and may incur Google charges. Android export validates bundling rather than an APK build.

Start with [authentication and Dashboard configuration](docs/authentication.md) and [authentication verification](docs/authentication-verification.md). [Supabase setup](docs/supabase-setup.md) and [database relationships/RLS](docs/database.md) describe prerequisites. Earlier UI/backend verification reports are historical milestone records.

## Environment and Git

`mobile/.env.example` and `admin/.env.example` contain public placeholders. Mobile account access requires the Project URL and publishable key in ignored `mobile/.env`. Missing configuration shows a controlled access error. Never put secret/service-role keys or passwords in public Expo environment variables. Test-account credentials belong only in ignored `mobile/.env.auth-test`, as described in the authentication guide. Dependencies, build output, logs, and signing keys are ignored; no commit is created automatically.

## Scope

Registration sends email/password to Supabase Auth, with mobile/name/gender/Customer-or-Biker metadata initialized by trusted database logic. Profile role and account status—not editable metadata—control navigation. Session tokens persist in app-private, unencrypted AsyncStorage; passwords are not saved by application code. Mobile numbers do not enable SMS authentication.

Customers can book rides and compare incoming biker names, ratings and fares in real time. Bikers can manage availability, browse authorized requests, preview routes, submit fares and view their bid status. See [customer posting](docs/customer-posting.md), [biker dashboard](docs/biker-dashboard.md), [fare bidding and verification](docs/fare-bidding.md), and [Google Maps setup](docs/google-maps.md). Biker assignment UI and full administrator UI remain later work.
