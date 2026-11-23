# Initialization verification

Date: 2026-11-20 (Asia/Dhaka).

## Delivered scope

A JavaScript Expo mobile app in `mobile/`, with a basic RideShare Pro entry screen. The screen uses the requested colors, system typography, 16px padding, and safe-area handling. Screens, components, navigation, services, context, theme, and utilities have separate directories.

`admin/` is reserved for a later application. Supabase migrations, functions, tests, and documentation have separate directories. Runtime dependencies are limited to Expo, React, React Native, expo-status-bar, and react-native-safe-area-context. No authentication, maps, ride logic, or backend integration is implemented.

Root npm workspace scripts, an installation lockfile, Expo ESLint configuration, Jest configuration, Git ignore rules, source-formatting rules, and public environment templates are included. Git was already initialized; no commit was created.

## Executed checks

Host: Windows PowerShell, Node.js 26.13.0, npm 11.20.0.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm install --offline --no-audit --no-fund` | PASS | Refreshed the installed tree and lockfile for the mobile workspace. |
| `npm run lint` | PASS | ESLint exited 0 with warnings treated as errors. |
| `npm test` | PASS | Two suites, three tests passed. |
| `npm run check:dependencies` | PASS | Expo reported Dependencies are up to date. |
| `npm run export:android` | PASS | Metro exported Android Hermes bytecode and metadata to `mobile/dist`. |
| Expo development server startup | PASS | Metro served the app on local port 8082 and bundled 739 development modules. |
| Android emulator app launch | PASS | Medium_Phone, Android API 37 x86_64, Expo Go 58.0.5. |
| Native entry-screen rendering | PASS | UI hierarchy contained both the title and subtitle; screenshot visually inspected. |
| `git diff --check` | PASS | No whitespace errors; Git noted normal Windows line-ending normalization. |
| Physical device testing | NOT RUN | Emulator verification only. |
| TalkBack / large-font / multiple-device checks | NOT RUN | Manual follow-up instructions are documented. |
| Native APK/AAB build | NOT RUN | Expo Go and JavaScript export were used. |
| Dependency security audit | NOT RUN | Not repeated for this simplified workspace; no claim of a clean audit. Existing Expo/Jest transitive advisory findings remain unresolved. |

## Rendering evidence

[Android entry-screen screenshot](entry-screen.png).

The visible heading is RideShare Pro, with Motorcycle rides for your university commute. beneath it. The floating blue settings control belongs to the Expo Go development runtime.

Ignored local evidence is also available in `.expo/verification/entry-screen.xml` and `.expo/verification/entry-screen.png`. The UI assertion failed unless both expected strings were present.

## Issues resolved during verification

- Added the safe-area library's provided Jest mock after the initial rendering test lacked native measurements; the rerun passed.
- Updated the emulator from Expo Go 56.0.4 to the SDK-compatible Expo Go 58.0.5.
- Retried startup with user-cache access after a sandbox restriction affected the React Native DevTools download.
- Restarted Expo Go after its first load was interrupted during runtime installation. The final development bundle loaded and the actual entry screen rendered.

## Run and manual checks

From the repository root, install with `npm ci`, start a virtual device in Android Studio Device Manager, and run `npm run android`. See [Android setup](android-emulator.md) and [manual testing](manual-testing.md).

Suggested commit: `chore: initialize Expo JavaScript mobile app and project structure`

Phase 2 has not started.
