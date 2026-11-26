# Fare-bidding QA review — 26 November 2026

## Outcome and scope

Functional regression and authorization checks pass after three minimal fixes. **The dependency audit remains FAIL:** npm reports 22 moderate package vulnerability entries in the Expo/Jest dependency chains, with no high/critical entries. This is not an unconditional security sign-off.

No features, dependencies, migrations or hosted policies were added/changed during this review. The SQL test suite gained one regression assertion; business SQL and deployed schema remain unchanged. Hosted verification used the previously authorized test accounts; only verification-created rides were closed and the biker's original motorcycle/availability were restored.

The working tree contains accumulated edits from several phases. [The 73-file inventory](fare-bidding-inventory.md) records all changed/untracked files captured at audit start. All received inventory/credential scanning; detailed correctness review covered every fare-bidding-created/modified source/test/document and its affected shared navigation, components, fare service, RLS, constraints and transaction functions. Earlier-phase files were inspected as supporting/regression scope; generated package-lock content was checked through JSON/npm/compatibility tooling rather than treated as handwritten code. Ignored credential files and native artifacts were not printed or committed.

## Confirmed defects and fixes

| Defect | Reproduced result before fix | Minimal fix | Rerun |
| --- | --- | --- | --- |
| Customer comparison retains pagination after request failure | FAIL: 20-row page followed by a rejected request cleared records but left Load more bids enabled, without a valid last-row cursor | Clear `more` in the existing error branch | PASS |
| Biker archive has the same stale pagination state | FAIL: failed next page cleared records but retained Load more bids | Same single-state reset | PASS |
| Non-editable bid rejection gives unrelated advice | FAIL: SQLSTATE 23514 from `submit_bid` displayed Add your motorcycle model and plate | Add a bid-specific error mapping: This bid can no longer be changed. Refresh the ride status | PASS |

Affected files: `CustomerBidsScreen.js`, `BikerBidsScreen.js`, `bikerService.js` and their regression tests. The SQL regression places an offer into a non-pending state inside a rolled-back test transaction and confirms the real database produces the constraint error; no hosted test data was altered for that assertion. Targeted tests first failed in all three paths, then passed: 7 tests across 3 suites.

## Code, design and security review

- No new fare-bidding package was installed. Existing React Navigation, Supabase SDK, shared BidCard, Screen, theme and validators are appropriate. Package-lock v3 parses, and Expo's compatibility check passes.
- The two list screens and Realtime services contain some similar lifecycle/pagination code. This is a maintainability observation, not a correctness failure. A broad extraction would exceed the minimal defect fixes, so no refactor was introduced.
- BidCards use system fonts, the centralized blue/white palette, 8px spacing tokens, 8px borders and shared 48px-minimum buttons. Emulator screenshots were inspected for readable labels, rating/fare/status cards and scrolling. No gradients, decorative assets, shadows or animations were introduced. Customer comparison has no Select biker button.
- Fares are validated locally and again in PostgreSQL. NUMERIC, foreign keys, NOT NULL/CHECK and UNIQUE(ride_id,biker_id) remain in force. Duplicate pending offers update one caller-owned row.
- Checked RPCs derive user identity from Auth, enforce active database roles and ownership, and use empty pinned search paths. The customer comparison exposes actual bidder names/model/rating aggregate and fares, not email/mobile/plate. The biker archive filters to the caller. Direct bid writes remain denied.
- Bid creation/revision and closure lock the ride first. Live concurrent update/close and first-insert/close tests both left zero pending bids on the closed ride; later bids were rejected. No assignment action was exercised or added.
- Realtime is session-bound and filtered by ride/biker. Join/reconnect refetches authoritative data, debounced events do not become trusted UI records, and cleanup removes channels/timers. The disconnected UI clearly marks a snapshot; it offers no assignment action based on stale bids.
- The changed-file credential scan found no hardcoded Google key, Supabase secret/service-role JWT or private-key block. `mobile/.env` and `.env.auth-test` are Git-ignored. Server credential references are environment lookups in Edge code, not values in mobile source. The Android Maps SDK key is intentionally public inside the binary and must remain package/certificate/API restricted; Cloud Console restrictions were not independently audited here.

## Executed test report

These are results from this QA run, not copied claims from the feature milestone.

| Test name / command | Expected result | Actual result | Status |
| --- | --- | --- | --- |
| Initial lint | No source errors | Exit 0 | PASS |
| Initial regression baseline | Existing tests remain green | 58 mobile tests, 155 SQL assertions, 6 proxy tests passed before adding QA cases | PASS |
| Three new defect reproductions | Correct error/pagination behavior | Three assertions failed against original code, confirming defects | FAIL → FIXED |
| Targeted affected-test rerun | New and existing affected tests pass | 7 tests / 3 suites passed | PASS |
| Final `npm run lint` | No ESLint errors/warnings | Exit 0 | PASS |
| Final `npm test` | Full mobile and SQL/proxy regressions pass | 61 mobile tests / 22 suites; seven migrations and 156 SQL assertions; 6 proxy tests; exit 0 | PASS |
| Loading/empty/error states | Loading does not flash empty; failed pages show error/retry without stale pagination | Controlled pending/rejected-promise UI tests passed; empty→live cards and cleanup passed | PASS |
| Valid/invalid fares | Positive bounded BDT accepted; zero/negative/excess precision rejected | Local validators/component tests and hosted RPC rejection passed | PASS |
| Duplicate bids | One row/ID per biker and ride | Concurrent repeated RPCs returned one ID | PASS |
| Closed rides and transaction race | No pending offer survives closure; later writes denied | Live update/close and first-create/close invariants passed | PASS |
| Unauthorized operations / RLS | Other customers/competitors/anonymous users cannot access or change protected data | Real restricted SQL roles passed; hosted anonymous/biker comparison/direct-write denial passed | PASS |
| Ratings and data minimization | Genuine average/count or Not yet rated; no private contact fields | Formatting/SQL tests and actual unrated test-biker comparison passed | PASS |
| Realtime and reconnect | Customer receives changes; missed changes recovered on reconnect | Actual hosted INSERT/withdrawal events and reconnect/refetch passed | PASS |
| Subscription cleanup | No active callback after disposal | Unit cleanup/debounce tests and live channel removal passed | PASS |
| `npm run db:connectivity` | Healthy backend; anonymous access denied | Health probe and all eight application tables denied anonymous reads | PASS |
| `npm run check:dependencies` | Expo-compatible native versions | Dependencies up to date for SDK 58 | PASS |
| `npm run export:android` | Production JS/Hermes export succeeds | Exit 0, Android bundle exported after fixes | PASS |
| Native `:app:assembleDebug` | x86_64 APK compiles | BUILD SUCCESSFUL; 398 tasks, 9 executed and 389 up to date | PASS |
| Edge `deno check` | Handler/imports type-check | Exit 0 | PASS |
| Maps regression | Existing authorized Places/details/Routes remain usable | Actual customer autocomplete, session-linked details, TWO_WHEELER road route and SDK invocation passed | PASS |
| Auth regression | Login/roles/logout preserved; provider configuration reachable | Full unit suite, actual emulator customer/biker login/logout passed; email provider/confirmation enabled, phone disabled | PASS |
| Android customer comparison | Empty state → live bid → withdrawn/closed state, with usable layout | Rerun on existing custom development APK passed; screenshots inspected | PASS |
| Android My bids | Stored fare/status available online and offline; logout clears protected screens | Rerun passed | PASS |
| Git/credential/lockfile checks | Ignored secrets; no privileged literals; valid lockfile/whitespace | No credential candidates in inventoried files; ignored paths confirmed; lockfile parses; diff check exit 0 | PASS |
| `npm audit --json` | No unresolved package vulnerabilities | 22 moderate entries, 0 high/critical; command exits 1 | FAIL |
| Docker local Supabase stack | Complete local PostgreSQL 17/Supabase run | Docker executable unavailable; PGlite 18.7 and hosted Supabase used instead | NOT RUN |
| Native pagination with 20+ distinct bidders | Device-level next-page/network-failure validation | No 20-biker hosted fixture created; automated 20-row regression cases executed | NOT RUN |
| Native interactive network outage during bid submission | Verify interruption on real device network | Hosted reconnect and mocked UI failure tests executed, but no physical network-interruption scenario in this QA run | NOT RUN |
| Hosted cross-customer/competitor/suspension matrix | Exercise every role combination against hosted Auth users | Covered by restricted SQL roles; no extra controlled hosted accounts/admin credentials created | NOT RUN |
| iOS, physical devices, release signing, load/penetration testing | Platform/security qualification | Outside available test configuration/scope | NOT RUN |

Commands executed for native build from `mobile/android`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\USER\AppData\Local\Android\Sdk'
$env:ANDROID_USER_HOME = 'C:\Users\USER\.android'
$env:NODE_ENV = 'development'
.\gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=4 --console=plain
```

The debug APK uses Metro for JavaScript; the separate production JS export verified the final changed modules. This is not a release-signed APK qualification.

## Remaining problems

1. **Dependency audit is unresolved.** npm reports the glob cancellation and minimatch amplification advisories through 22 Expo/Jest package entries. Its automatic recommendations include Expo 52 and Jest 29 downgrades/major changes, conflicting with this project's Expo 58 integration. No `audit fix --force`, overrides or unverified upgrade was applied. A separate SDK-compatible dependency investigation is required; exploitability was not certified.
2. Some Realtime/pagination orchestration is duplicated. It is small and tested; consolidation can be considered separately rather than bundled with QA fixes.
3. Coverage gaps marked NOT RUN remain. This report is not an independent security audit. Google-backed list distance remains an explicit on-demand preview limitation documented in the biker phase; it was not changed during QA.

## Exact Android Studio Emulator instructions

### Prepare and launch

1. Open Android Studio → SDK Manager. Use the existing SDK at `C:\Users\USER\AppData\Local\Android\Sdk`, API 37 platform/build tools, NDK 27.1.12297006 and CMake 3.31.6. The Windows config plugin selects this CMake/Ninja version; Windows long paths must be enabled. Android Studio's bundled JBR is the JDK used above.
2. Tools → Device Manager: start **Medium_Phone** and **Pixel_10_Pro**, both with Google APIs/Play services. `adb devices` must show two ready devices. The commands below assume `emulator-5554` and `emulator-5556`; replace serials with the exact values printed locally.
3. In PowerShell, from this repository, run:

```powershell
Set-Location 'D:\RideShare Pro\RideSharePro'
npm ci
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\USER\AppData\Local\Android\Sdk'
$env:ANDROID_USER_HOME = 'C:\Users\USER\.android'
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
Set-Location mobile
npx expo run:android --device emulator-5554 --port 8084
```

4. Keep that terminal/Metro running. In a second terminal at the repository root, use the same SDK PATH or the absolute adb path:

```powershell
$adb = 'C:\Users\USER\AppData\Local\Android\Sdk\platform-tools\adb.exe'
& $adb devices
& $adb -s emulator-5556 install -r 'mobile/android/app/build/outputs/apk/debug/app-debug.apk'
& $adb -s emulator-5554 reverse tcp:8084 tcp:8084
& $adb -s emulator-5556 reverse tcp:8084 tcp:8084
& $adb -s emulator-5556 shell am start -W -a android.intent.action.VIEW -d 'exp+rideshare-pro://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8084' com.ridesharepro.app
```

5. If the development-client introduction appears, press Continue and close its developer menu. Sign in as the owned customer on Medium_Phone and owned biker on Pixel_10_Pro. Use existing credentials locally; do not paste passwords/keys into chat. Confirm `mobile/.env` points to the new RideShare Pro Supabase project with publishable values. Maps-dependent posting also requires the configured Android key, server key and Google billing. If unavailable, mark that posting/route step NOT RUN instead of claiming success.

### Functional checks and expected results

1. Biker → Profile: enter valid motorcycle details if absent; Save motorcycle. Home → Online. Expect the switch to persist and open requests to load. Keep a record of original test settings for restoration.
2. Customer → Home: select two different Places suggestions, Continue, Confirm Route, enter expected BDT fare and Post Ride. Use only a disposable test ride created by you. Customer Home → its View bids button. Expect Incoming bids and No bids yet.
3. Biker → that request → View Ride. Enter `0`, `-5`, `1.234`, or `1000000`: expect local validation and no new bid. Enter `150`: expect a pending offer/success message. Rapidly repeat or retry: expect one bid row for this biker/ride. Customer screen must show the bidder's name, truthful rating/unrated label and `BDT 150.00` without manual refresh.
4. Revise the pending offer to `145`. Expect the same bid ID/row, changed amount on the customer screen, and fare ordering. Biker Home → My bids must show its own submitted amount and status.
5. Reconnect check: disconnect/reconnect the customer's test emulator network while a separate biker session updates an offer. Reopen View bids if the protected navigator resets during session restoration. Expect the authoritative latest fare after reconnect/refresh. If network controls or a second session are unavailable, mark this manual scenario NOT RUN; use the executed hosted reconnect test as separate evidence, not a substitute claim.
6. Close the **specific QA-created ride only**. There is no cancellation UI in this phase. In a disposable project's Supabase SQL Editor, substitute the known QA customer UUID and QA ride UUID and execute the existing checked operation as the authenticated role:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'YOUR_QA_CUSTOMER_UUID', true);
select public.transition_ride('YOUR_QA_RIDE_UUID'::uuid, 'cancelled');
commit;
```

This is a controlled development test, not a replacement for real Auth verification. Do not use other users' IDs or disable RLS. Expect the customer screen to say the ride is cancelled and show Withdrawn; My bids must update too. A later submit to that ride must fail.

7. Biker Home → Offline → My bids. Expect status records still readable, while new bidding is prohibited. Check Profile → Logout on both emulators; protected screens must disappear.
8. With a controlled 20+ offer/archive fixture, press Load more bids, introduce a request failure and expect an error/retry with no stale Load more action after records are cleared. If that fixture is unavailable, mark the native scenario NOT RUN. The exact automated reproduction is:

```powershell
npm run test --workspace=@rideshare/mobile -- --runTestsByPath src/services/bikerService.test.js src/screens/customer/CustomerBidsScreen.test.js src/screens/biker/BikerBidsScreen.test.js
```

9. Restore original test motorcycle/availability and close only QA-created open rides. Never clear shared project data to make tests pass. No assignment, payment, tracking or new feature should be introduced during these checks.

Suggested commit: `fix(bids): correct pagination recovery and bid rejection messages`.
