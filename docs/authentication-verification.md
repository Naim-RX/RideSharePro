# Authentication verification

Date: 2026-11-23 (Asia/Dhaka).

## Delivered scope

The existing email/password forms are connected to Supabase Auth. Customer/Biker registration includes full name, email, mobile, gender, and account role. The existing trusted database trigger initializes UUID-linked profiles and biker details. Mobile is profile data only; no SMS authentication was added.

Authentication now has session restoration, foreground token refresh, local-device logout, trusted-profile role navigation, suspended/incomplete account gates, safe error messages, email-confirmation notices/resend, submission guards, bounded requests, and stale-response protection. The blue/white form layout and existing fields are preserved. Account landing screens provide only profile/role information and Logout; no ride or admin business UI was added.

## Executed automated checks

Host: Windows PowerShell, Node.js 26.13.0, npm 11.20.0. Mobile SDK remains Expo 58 / React Native 0.88.1. Supabase SDK is locked at 2.119.2 with a compatible v2 minimum range.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | PASS | No errors or warnings. |
| `npm test` | PASS | 36 mobile/authentication tests in 11 suites, plus PostgreSQL tests. |
| Database security regression suite | PASS | All three migrations and 101 SQL assertions passed in PostgreSQL 18.7 WASM/PGlite. RLS stayed enabled. |
| `npm run check:dependencies` | PASS | Expo reported Dependencies are up to date. |
| `npm run export:android` | PASS | Connected app bundled/exported successfully: 923 production modules and navigation assets. |
| Node script syntax and dependency lock consistency | PASS | Authentication scripts parse; mobile dependency metadata matches lockfile. |
| `git diff --check` | PASS | No whitespace errors; normal Windows line-ending notices only. |
| Credential/artifact ignore rules | PASS | mobile/.env, mobile/.env.auth-test, and private emulator evidence are ignored. |

Automated cases cover both signup confirmation modes, public admin-role rejection, metadata normalization, email-only credentials, explicit/obfuscated duplicates, invalid credentials, unconfirmed email, resend limits, setup failures, network failures/cancellation, missing profiles, suspension, role-based navigation, persisted-session startup, token-refresh profile rechecks, logout, and late-response/session races. The SDK/storage boundaries are mocked in unit tests; the live/device checks below provide separate evidence.

## Live hosted tests

The user supplied two controlled test accounts in ignored mobile/.env.auth-test and confirmed their emails. Credentials and tokens were never printed or committed. The test scripts use the actual app service/controller and official SDK against the configured hosted project.

| Scenario | Customer | Biker |
| --- | --- | --- |
| Email/password registration submission | PASS | PASS |
| Confirmation-required response: no immediate session | PASS | PASS |
| Email confirmed, then successful login | PASS | PASS |
| Server identity and protected profile load | PASS | PASS |
| Correct protected database role | PASS | PASS |
| Mobile profile initialized; biker detail row where required | PASS | PASS |
| Session restored by a new SDK client from the storage adapter | PASS | PASS |
| Refresh-token rotation | PASS | PASS |
| Direct role/account-status UPDATE denied with 42501 | PASS | PASS |
| Editable metadata role=admin does not change database authorization | PASS | PASS |
| Original editable metadata restored after test | PASS | PASS |
| Duplicate-account response handled | PASS | PASS |
| Local logout clears current and restored storage session | PASS | PASS |

Additional live checks:

- Incorrect/nonexistent credentials returned invalid_credentials: PASS.
- Auth settings were read successfully: email/password enabled, signup allowed, confirmation required, phone provider disabled: PASS.
- Health RPC and anonymous denial on all seven application tables: PASS.
- The first biker verification returned email_not_confirmed. After the account confirmation completed, a targeted rerun passed all biker checks. Confirmation was not disabled or bypassed.

The live SDK storage-adapter test uses process-local persisted data shared between SDK instances. It alone is not an Android storage test; the process-restart checks below exercised native AsyncStorage separately.

## Android Emulator checks

Runtime: Medium_Phone, Android API 37 x86_64, Expo Go 58.0.5. The app used the configured hosted backend. Test values were injected without printing passwords, and UI hierarchy assertions checked expected screens.

| Scenario | Result |
| --- | --- |
| Customer login -> Customer account | PASS |
| Customer session restored after force-stop/reopen | PASS |
| Customer Logout -> Login, remaining signed out after reopen | PASS |
| Biker login -> Biker account | PASS |
| Biker session restored after force-stop/reopen | PASS |
| Biker Logout -> Login, remaining signed out after reopen | PASS |
| Invalid credentials -> inline error, no protected route | PASS |

Screenshots and raw UI hierarchies containing test-account information remain local and ignored under `.expo/verification/auth-private/`. They are not copied into public documentation. Signup was exercised live through the shared app service; the signup field bindings/validation were exercised by component tests. Fresh account creation was not repeated through emulator taps to avoid duplicate emails and extra accounts.

## Fixes made during verification

- A configuration-error state update was scheduled through a cancellable callback to satisfy the React effects lint rule and avoid stale updates after teardown.
- Removed the SDK's deprecated custom processLock option after its native deprecation/zero-timeout warning. Current SDK refresh/logout coordination is used instead; device session restoration/logout passed afterward.
- Added real request abort deadlines, caller cancellation propagation, a logout action during profile checks, and generation guards for late responses.
- The device driver had to foreground/reopen Expo Go before Logout when the runtime was at the Android launcher. The existing API 37/Expo Go deep-link startup quirk can require retrying the intent; final checks passed after foregrounding the app.

## Limitations / not run

- Suspended-account and missing/incomplete-profile behavior: PASS in controller/UI unit tests and SQL authorization tests. A hosted account was not deliberately suspended or damaged during this phase.
- Confirmation disabled / immediate-session signup: PASS in automated tests; NOT RUN against a second hosted configuration. The real project retains confirmation enabled.
- Offline logout and refresh/logout races: PASS in automated tests; NOT RUN with a physical network-disconnection campaign. Requests are bounded by actual AbortController cancellation.
- iOS, physical devices, native APK/AAB builds, TalkBack, and production SMTP deliverability: NOT RUN.
- AsyncStorage is app-private but unencrypted. Passwords are not persisted by application code. Email-link automatic deep login, password recovery, OAuth, and SMS are outside this phase.
- The PostgreSQL WASM suite does not replace version-matched native database/concurrency tests. Existing dependency advisory findings from prior phases were not independently re-audited here.

## Follow-up and handoff

Required Dashboard settings and manual steps are in [authentication.md](authentication.md). Start the emulator and use `npm run android`. Keep the existing backend migrations/RLS in place; no new migration or grant relaxation was needed for authentication.

The two test Auth users remain available in the project. Their protected roles/status were not altered, and temporary metadata changes were restored. Test credentials remain only in the ignored file supplied by the user. No Git commit was created.

Suggested commit: `feat: connect Supabase authentication with persistent role-based sessions`

Work stops after this authentication phase. Ride, bidding, maps, and full administrator flows are unchanged.
