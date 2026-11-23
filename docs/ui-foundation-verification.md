# UI foundation verification

Date: 2026-11-20 (Asia/Dhaka).

## Implemented

All twelve requested reusable components are present and exported from `mobile/src/components/index.js`. The theme centralizes colors, system typography, spacing, dimensions, radii, and borders. Splash, Login, and Registration use React Navigation native stack with no animated transitions. Registration includes Gender and Customer/Biker selection.

Forms validate locally, support independent password visibility, keyboard avoidance, scrolling, disabled/busy controls, and explicit local-only submission notices. No Supabase authentication, requests, sessions, credential logging/persistence, or account creation are implemented. RideCard and BidCard are presentation primitives only.

## Automated checks executed

Host: Windows PowerShell, Node.js 26.13.0, npm 11.20.0.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | PASS | Exited 0; warnings treated as errors. |
| `npm test` | PASS | Six suites, twelve tests passed. |
| `npm run check:dependencies` | PASS | Expo reported Dependencies are up to date. |
| `npm run export:android` | PASS | Final source exported successfully; 858 production modules plus navigation assets. |
| Development server | PASS | Metro served the final UI at localhost port 8082. |
| Component inventory and lockfile consistency | PASS | All twelve component files exist; package dependencies match the workspace lockfile. |
| `git diff --check` | PASS | No whitespace errors; normal Windows line-ending normalization notice only. |

Test coverage includes Splash replacement and authentication navigation, empty/invalid login, local-only valid login, independent password masking/value preservation, registration gender/confirmation validation and biker selection, email/phone/password/role validation, loading buttons, pending bid selection, and pending confirmation/cancellation safeguards. The tests use the safe-area library's provided Jest mock for native measurements.

## Android emulator checks executed

Runtime: Medium_Phone, Android API 37 x86_64, Expo Go 58.0.5. Tests used synthetic data (`rider@example.com`, a test mobile number, and test passwords). ADB UI hierarchy assertions and screenshots were used; relevant screenshots were visually inspected.

| Scenario | Result | Evidence |
| --- | --- | --- |
| Splash layout and transition | PASS | White background, blue wordmark, exact subtitle, then Login. Captured during launch; 1.5-second replacement also covered by the navigation test. |
| Login layout | PASS | Title, welcome text, email, password, Login, and Register render with consistent spacing. |
| Empty Login | PASS | Required email and password messages shown. |
| Login password visibility | PASS | Native password attribute changed on Show/Hide; value preserved. |
| Login keyboard | PASS | Software keyboard confirmed open; inputs/action remain reachable above it. |
| Valid local Login | PASS | Keyboard dismissed and explicit Login-is-unavailable notice shown. |
| Login to Registration | PASS | Register opens Create account. |
| Registration layout and scrolling | PASS | All fields, gender, both password controls, role choices, and submit action reachable. |
| Empty Registration | PASS | Required-field errors shown; top/bottom captured after scrolling. |
| Gender and biker choice | PASS | Prefer not to say and Biker selected with checked native radio states. |
| Registration keyboard | PASS | Scrolled to Confirm password while keyboard was open; input remained visible. |
| Password mismatch | PASS | Unequal passwords produced Passwords do not match. |
| Valid local Registration | PASS | Correcting confirmation showed explicit account-creation-is-unavailable notice. |
| Android Back | PASS | Returned from Registration to Login. |

## Screenshots

- [Splash](ui-foundation/splash.png)
- [Login](ui-foundation/login.png)
- [Login errors](ui-foundation/login-validation.png)
- [Login keyboard](ui-foundation/login-keyboard.png)
- [Login local result](ui-foundation/login-local-check.png)
- [Registration](ui-foundation/registration.png)
- [Registration required fields, top](ui-foundation/registration-validation-top.png)
- [Registration required fields, bottom](ui-foundation/registration-validation-bottom.png)
- [Registration keyboard](ui-foundation/registration-keyboard.png)
- [Password mismatch](ui-foundation/registration-password-mismatch.png)
- [Registration local result](ui-foundation/registration-local-check.png)
- [Return to Login](ui-foundation/login-return.png)

The blue floating Tools control in some captures belongs to Expo Go, not application UI. Local verification scripts, raw UI hierarchies, and intermediate frames remain ignored under `.expo/verification/`.

## Issues resolved and runtime limits

- React's ref lint rule rejected a helper that returned callback refs inside spread props. Ref callbacks were moved to the actual inputs; final lint passed.
- A test used an API removed from the installed React Native Testing Library. The test was corrected to use its supported interaction APIs; final tests passed.
- The first emulator launch ran before Android's package service was ready. Launch succeeded after boot completion.
- The emulator driver initially accepted off-screen/inverted UI bounds and exceeded its default diagnostic buffer. It was corrected to scroll to visible controls and allow the keyboard diagnostic output. Registration checks then passed.
- Expo Go on this API 37 emulator sometimes returned to the Android launcher on the first deep link after force-stop. Reopening the initialized client loaded the final app successfully. Standalone native startup has not been verified.

## Not run / limitations

- Physical-device, iOS, TalkBack, large-font, multiple screen-size, and native APK/AAB testing: NOT RUN.
- RideCard, BidCard, and ConfirmDialog have no production route in this phase. They are reusable components, not implemented ride or bid flows. Their layout was not separately exercised on the emulator; busy action behavior is covered by automated tests.
- Independent dependency security audit: NOT RUN in this phase. Installation reported 22 moderate Expo/Jest transitive advisories; those findings are not claimed resolved. No forced SDK downgrade was applied.
- Local validation is not a security boundary and must be repeated by future backend operations. No real account access is available.

See [manual testing](manual-testing.md) to repeat the scenarios and [component contracts](ui-foundation.md) for reuse. No Git commit or deployment was performed.

Suggested commit: `feat: add reusable UI foundation and local authentication screens`

Work stops after this UI phase and testing.
