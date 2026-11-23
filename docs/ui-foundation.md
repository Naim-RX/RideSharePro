# UI foundation

## Scope

This phase adds reusable UI, a centralized design system, and Splash/Login/Registration navigation. These are local forms only: there are no Supabase requests, stored credentials, session state, or account creation. RideCard and BidCard are presentation components without ride or bidding operations.

## Theme

`mobile/src/theme/index.js` owns colors, typography, spacing, dimensions, radii, and border styles. System fonts are used without custom font downloads. Colors follow the requested blue/white palette. Screen padding is 16px, controls have a 48px minimum touch height, and input height is 52px before font scaling. Form width is limited to 480px on larger displays.

## Component API

Import the requested components from `mobile/src/components/index.js`, or import their files directly.

| Component | Main props / behavior |
| --- | --- |
| PrimaryButton | `title`, `onPress`, `disabled`, `loading`; blocks presses while loading and exposes disabled/busy accessibility state. |
| SecondaryButton | Same contract with bordered styling. |
| TextField | Standard TextInput props and forwarded ref, plus `label`, `error`, `helperText`, optional `trailing`; focus/error borders and accessible labels. |
| PasswordField | TextField props with independent show/hide state; defaults to masked, preserves the input value. |
| ScreenHeader | `title`, `subtitle`, `onBack`, `backLabel`. |
| StatusBadge | `status`, optional `label`, optional `tone`: neutral, info, success, warning, or error. Text always carries the status; color is not the only indicator. |
| LoadingIndicator | Optional accessible `label`. |
| EmptyState | `title`, `message`, optional `actionLabel` and `onAction`. |
| ErrorMessage | `message`, optional `onRetry`; absent message renders nothing. |
| RideCard | Required `ride` object; optional `onPress`, `actionLabel`, and `disabled`. Object labels: `pickupLabel`, `destinationLabel`, `fareLabel`, `distanceLabel`, `durationLabel`, `status`. |
| BidCard | Required `bid` object; optional `onSelect`, `disabled`, `loading`. Object labels: `bikerName`, `motorcycleLabel`, `ratingLabel`, `fareLabel`, `status`. |
| ConfirmDialog | Controlled `visible` (defaults false), `title`, `message`, `onConfirm`, `onCancel`, button labels, `loading`, `disabled`. Busy state blocks actions and Android-back dismissal. |

`OptionSelector` provides labelled radio choices for gender and role. `Screen` supplies safe areas, a scrolling content container, and KeyboardAvoidingView with padding behavior on both platforms. Buttons, links, and selector options have accessible roles and labels.

Ride and bid labels are formatted by their callers; the cards do not assume a currency, retrieve records, or perform business operations. Optional action controls are shown only when callbacks are provided.

## Screens and navigation

- Splash has a plain white background, RideShare Pro wordmark, and Motorcycle Ride Sharing subtitle. It replaces itself with Login after 1.5 seconds. There are no animated transitions.
- Login has email, password visibility, local errors, Login, and Register navigation.
- Registration includes full name, email, mobile number, gender, password, confirmation, Customer/Biker role selection, Create Account, and return-to-Login controls. Customer is initially selected. Gender has no default selection and includes Prefer not to say.
- Native stack navigation supports Android Back. Password and form state remain in screen memory only.

React Navigation's native stack uses the Expo-compatible react-native-screens package. No tab navigator, keyboard-controller package, form library, or global state dependency is needed.

## Local validation

- Email is required, checked for a basic address shape, and limited to 254 characters after trimming.
- Login requires a nonblank password, up to 128 characters. It does not impose new-account minimum-length rules on existing credentials.
- Full name must contain 2–100 characters after trimming; non-Latin names are allowed.
- Mobile accepts 10–15 digits with an optional leading plus; spaces, hyphens, and parentheses are ignored for checking.
- Gender and role must match their offered values. Public roles are only Customer and Biker.
- Registration password is 8–128 characters and cannot consist only of whitespace. Confirmation must match exactly. Password values are never trimmed or logged.
- Errors appear after blur or submission and update as touched fields change. Invalid submissions focus the first invalid text input in screen order.
- Valid submission dismisses the keyboard and shows an explicit local-check notice. It never reports a successful login or created account. The loading lifecycle yields once; there is no simulated network delay.

Client validation is a UI aid, not a future authorization boundary. Backend validation, RLS, and trusted role assignment remain separate work.

## Verification

See [UI verification](ui-foundation-verification.md) for executed automated checks and Android evidence, and [manual testing](manual-testing.md) to repeat the scenarios.

Primary implementation references: [Expo keyboard handling](https://docs.expo.dev/guides/keyboard-handling/), [React Navigation native stack](https://reactnavigation.org/docs/native-stack-navigator/).
