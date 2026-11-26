# Google Maps verification — 24 November 2026

Results refer to this new RideShare Pro repository and its linked Supabase project. Credentials and Google response content are excluded from source control.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Mobile tests | PASS | 42 tests, 14 Jest suites; debounce, terminated sessions, stale-response protection, missing configuration, polyline decoding, route summary/fallback, existing authentication/UI regression tests |
| PostgreSQL migrations and authorization | PASS | All four migrations applied in PGlite; 101 existing + 9 maps assertions, including private/RLS budget table, RPC grants, active-customer enforcement, limit and window reset |
| Google proxy unit tests | PASS | Five Node tests: validation, session forwarding, motorcycle fallback, quota/permission errors, unavailable road routes |
| ESLint | PASS | No warnings/errors |
| Edge Function type-check | PASS | Deno check of deployed handler and SDK imports |
| Expo compatibility | PASS | SDK 58 installer/compatibility check; maps 1.29.11, crypto ~58.0.8, development client ~58.0.21; constants ~58.0.16 is the Expo-provided version |
| Android JavaScript export | PASS | Production Hermes bundle exported after functional changes; does not prove native SDK rendering |
| Hosted migration | PASS | `20261124000100_maps_rate_limits.sql` applied to the linked RideShare Pro project without development seeds |
| Edge Function deployment | PASS | `google-maps` deployed after explicit user approval; server key present in hosted secrets |
| Live authorization | PASS | Missing bearer/invalid JWT → 401; biker → 403; malformed authenticated customer request → 400 |
| Live Google web services | PASS | Actual autocomplete → session-linked details → positive-distance/duration road route; Google returned TWO_WHEELER |
| Live SDK invocation | PASS | Existing session-aware Supabase JS client invoked deployed route endpoint successfully |
| Android Expo Go UI | PASS | Customer navigation, keyboard-open suggestion selection, both markers, real tiles, route polyline, camera fit, km/min, motorcycle warning and attribution visually inspected |
| Restricted-key custom Android build | PASS | x86_64 debug APK compiled, installed and launched as `com.ridesharepro.app`; customer login, keyboard-open autocomplete/details selection, real tiles, both markers, road polyline, fitted camera, km/min, motorcycle beta warning and attribution visually verified using the app’s configured Android key |
| Preview cleanup and logout | PASS | Leaving and reopening the custom APK planner cleared both locations and route; customer logout returned to Login |
| Live driving fallback / hosted suspension / hosted quota exhaustion | NOT RUN | Fallback/errors covered by proxy tests; suspension and rate limits covered by actual PostgreSQL tests. No claim of live coverage for these branches |
| iOS / physical device / release signing | NOT RUN | Android emulator phase only |

Native build initially failed because NDK 27.1.12297006 contained only a partial installer. That directory was preserved as `27.1.12297006.incomplete-20261124` and Gradle successfully installed a complete NDK, build tools 37, and CMake 3.22.1. The next failure was Ninja 1.10.2’s Windows 260-character path limit. The final Windows-only config plugin selects CMake 3.31.6 with Ninja 1.12.1 following Expo’s guidance. The official Android SDK CMake archive was downloaded, its published SHA-1 checksum verified, and installed. Windows `LongPathsEnabled` was already 1. The final `:app:assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=4` completed successfully. Linux/EAS builds use their default toolchain. Other architectures and release signing were not built in this phase.

The user confirmed that the Android key is restricted to Maps SDK for Android, package `com.ridesharepro.app`, and the generated debug certificate SHA-1. Those Cloud Console restrictions are user-confirmed; no independent Cloud Console configuration audit was performed. Production/EAS/Play signing certificates require their own allowed fingerprints.

PGlite is PostgreSQL 18.7 rather than the full Docker-based Supabase PostgreSQL 17 stack. Docker is not available here. The hosted live checks demonstrate the deployed function, authentication and rate-limit RPC work together, but do not replace a full security audit or load test. Existing dependency installation reports 22 moderate advisories; no forced dependency upgrades were applied during this feature.

See [setup, deployment, Android build commands and manual test checklist](google-maps.md).
