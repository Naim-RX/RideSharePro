# Google Maps integration

The customer booking flow uses location autocomplete and route confirmation; see [customer posting](customer-posting.md). Available bikers have a separate ride-ID-only preview operation described in [biker dashboard](biker-dashboard.md). Administrators have no mobile route-planning endpoint access. No device location permission, live tracking, or background GPS is added.

## Dependencies and structure

Expo SDK 58 resolves `react-native-maps` 1.29.11, `expo-crypto` ~58.0.8, and `expo-dev-client` ~58.0.21. Use Expo’s installer, rather than selecting native versions independently:

```powershell
npm ci
cd mobile
npx expo install react-native-maps expo-crypto expo-dev-client expo-constants
npx expo install --check
```

Customer Home and Route Preview own transient selections and preview state. `LocationField` debounces requests for 350ms, waits for three characters, creates independent UUIDv4 sessions, passes the token into place details, then discards it. Sessions older than three minutes are rotated before another autocomplete request. Aborted/stale results cannot replace newer selections. Google addresses, coordinates and geometry are not persisted; the posting phase retains exempt place IDs and customer-entered text. An Expo config flag prevents mounting a native map without Android key configuration.

`mapsService` uses the existing session-aware Supabase client. The `google-maps` Edge Function verifies the bearer token through Supabase Auth, checks the database profile, validates inputs, consumes an atomic database budget, and calls only fixed Google endpoints. It never accepts caller-selected URLs, Google keys, user IDs, or travel modes. No requests, tokens, addresses, or Google errors are logged. Responses use `Cache-Control: no-store`.

The private rate-limit table enables RLS and grants no client access. Its definer RPC pins an empty search path and is executable only by `service_role`. Customers receive 30 autocomplete, 12 details and 6 route previews per UTC minute; active available bikers receive only the 6 ride-specific previews. A fallback may make two upstream calls. Counters occupy at most three rows per user and cascade on user deletion. Fixed windows permit boundary bursts; configure project quotas and monitor costs. Failure to check a budget fails closed.

## Google Cloud setup

1. Select a new/dedicated Google Cloud project, attach an active billing account, and enable **Maps SDK for Android**, **Places API (New)**, and **Routes API**. Legacy Places is not used.
2. Create an **Android-only key**. Application restriction: Android apps. Add package `com.ridesharepro.app` and the SHA-1 fingerprint of the signing certificate. API restriction: **Maps SDK for Android only**. Add separate debug, EAS, and Play App Signing certificate fingerprints as appropriate; upload-key and Play signing fingerprints differ.
3. Save that Android key as `GOOGLE_MAPS_ANDROID_API_KEY` in ignored `mobile/.env`. `app.config.js` passes it to the maps config plugin. It is embedded in the APK and is public by design; package/certificate/API restrictions are essential. Rebuild after changing it. Never put the server key here.
4. Create a separate **server key** in the same Google project for Places and Routes. API-restrict it to **Places API (New)** and **Routes API**. Keep it only in Supabase secrets. Android/referrer restrictions do not work for server calls. If using IP restrictions, you need controlled, static outbound egress; ordinary Edge Function outbound IPs are not a stable allowlist. Do not invent an IP restriction that blocks the deployment.
5. Set conservative Google Cloud request quotas for each API and billing budgets/alerts. Alerts do not enforce a spending cap. TWO_WHEELER and requested place fields affect billed SKUs; review current pricing before increasing quotas. App throttling alone cannot impose a global spending cap.

Inspect local signing fingerprints after native generation:

```powershell
cd mobile/android
.\gradlew.bat signingReport
```

The server key must belong to the same Cloud project for autocomplete and details in a session. A session ends with details selection; abandoned sessions still incur billing. No API keys should be pasted into source, chat, screenshots, or Git.

## Supabase deployment

Use the existing **new RideShare Pro** project. Verify the linked target before any hosted mutation. CLI 3.2 defaults database commands to local; `--remote` is intentional below.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_NEW_PROJECT_REF
npx supabase db push --remote --dry-run
npx supabase db push --remote --yes
npx supabase functions deploy google-maps --use-api --yes
```

Apply `20261124000100_maps_rate_limits.sql`; do not edit already applied migrations or include development seeds. Save `GOOGLE_MAPS_SERVER_API_KEY` in **Dashboard → Edge Functions → Secrets**. Alternatively copy `supabase/functions/.env.example` to ignored `supabase/functions/.env`, fill it locally, then:

```powershell
npx supabase secrets set --env-file supabase/functions/.env --yes
```

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically inside the runtime. Do not copy that privileged key into the mobile app. `verify_jwt = false` only disables the gateway’s legacy verification; the handler explicitly verifies every bearer token with `auth.getUser` before any Google request. Keep that check. There is no anonymous mode and no browser CORS support in this mobile-only phase.

For local functions, start Docker, run Supabase locally, use local Auth users and URLs, and run `npx supabase functions serve google-maps --env-file supabase/functions/.env`. Local and hosted credentials/users are separate.

## Android development build

Install Android Studio, an Android SDK/platform and build tools required by Expo 58, an emulator image with Google Play services, and a compatible JDK (Android Studio’s bundled JBR is suitable). Set `JAVA_HOME`, `ANDROID_HOME`, and put platform-tools on PATH. Accept SDK licenses. On this workstation SDK is `C:\Users\USER\AppData\Local\Android\Sdk` and JBR is `C:\Program Files\Android\Android Studio\jbr`.

```powershell
cd mobile
npx expo prebuild --platform android --no-install
# Register the debug SHA-1 from signingReport in Google Cloud before map testing.
npx expo run:android --device
```

Select a running Android Studio emulator. This builds/installs the custom development client and starts Metro. For later JavaScript changes:

The project includes `withWindowsCMake`, a config plugin that selects CMake 3.31.6 only on Windows. Its bundled Ninja supports long paths, unlike the default CMake 3.22.1 package. Install CMake 3.31.6 through Android Studio’s SDK Manager (SDK Tools → Show Package Details), and enable Windows long paths if disabled. Linux/EAS builds retain Expo’s default version. Follow [Expo’s Windows long-path instructions](https://docs.expo.dev/troubleshooting/windows-long-paths/). If Gradle reports an incomplete NDK (`source.properties` missing), reinstall the required NDK in SDK Manager. Let Gradle install required build tools after SDK licenses have been accepted.

```powershell
cd mobile
npx expo start --dev-client
```

Use a custom development build to test your own restricted Android key. Expo Go cannot verify the key embedded in your app. Generated native directories and signing files are ignored. `npm run export:android` verifies the JS bundle; it does not compile an APK or prove Google tiles work. iOS Google Maps configuration is outside this Android phase; the screen explains that limitation.

## Routing and content rules

The proxy first requests `TWO_WHEELER`. If Google explicitly rejects that mode as unsupported, or returns no route, it tries `DRIVE`. Permission, billing, quota and unrelated validation failures do not trigger a fallback. The response includes the actual mode; the UI explicitly labels driving estimates. Motorcycle previews always show the required beta warning. Estimates do not provide navigation or guaranteed arrival times.

Google’s native map attribution stays visible; the map occupies its own 320px container without overlays. Compact suggestion lists and route summaries include Google Maps text attribution. Provider attributions returned by details are displayed with their HTTPS links. No photos, reviews, business details, persistent Google route cache, or saved place index are added. Before a public release, publish accessible Terms of Use and Privacy Policy incorporating the applicable Google terms and explaining that entered places/coordinates are sent to Supabase and Google. Review EEA billing-account-specific rules if relevant. A later ride-history phase needs a separate retention design; do not persist these preview payloads by default.

## Verification

```powershell
npm run lint
npm test
npm run check:dependencies
npm run export:android
npx --yes deno check supabase/functions/google-maps/index.ts
npm run maps:test:live
```

Live verification uses the previously authorized accounts in ignored `mobile/.env.auth-test`, does not create users, and logs no credentials or Google content. It verifies missing/invalid JWT denial, biker denial, customer validation, and, when configured, real autocomplete → session-linked details → route. Google requests may incur charges. A `NOT RUN` result for missing server configuration is not a successful Google integration test.

Manual emulator checklist:

1. Login as customer, open Plan a route, verify actual Google tiles and attribution. Biker navigation must have no planner.
2. Type rapidly; verify only the latest search appears. Clear, use fewer than three characters, and try an address with no matches. Search lists must remain tappable while keyboard is open; scroll on a small screen.
3. Select pickup and destination; verify both markers. Preview: verify a road-following polyline, camera fit, km/min and mode label. Test supported motorcycle routing and an unsupported area; confirm driving fallback text and motorcycle beta warning.
4. Edit either input: old marker/route and estimate must clear. Navigate back during requests and reopen: no stale results or retained Google content.
5. Disable network, deny a Google API/billing permission temporarily, and use points with no road route. Verify readable errors and retry after recovery. Restore restrictions afterward.
6. Exceed the per-user request budget in a controlled development project; expect HTTP 429 and no upstream call after the limit. Confirm another user has an independent budget. Suspend a test account via trusted administration and verify HTTP 403 with its existing JWT.

Automated unit tests mock Google. PGlite executes real PostgreSQL migrations/constraints but is not a complete Supabase stack. Record native/live results separately; do not infer them from bundle export or mocked maps.

Official references: [Expo maps configuration](https://docs.expo.dev/versions/latest/sdk/map-view/), [Places sessions](https://developers.google.com/maps/documentation/places/web-service/using-session-tokens), [Places attribution and retention](https://developers.google.com/maps/documentation/places/web-service/policies), [motorcycle routes and warning](https://developers.google.com/maps/documentation/routes/route_two_wheel), [Routes policies](https://developers.google.com/maps/documentation/routes/policies), [Supabase function authentication](https://supabase.com/docs/guides/functions/auth).
