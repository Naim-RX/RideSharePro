# Manual UI testing

## Setup

1. Run `npm ci` at the repository root.
2. Start an Android virtual device in Android Studio Device Manager.
3. Run `npm run android`. See [Android setup](android-emulator.md) for SDK and connection troubleshooting.
4. No environment values, credentials, or backend accounts are required. Use synthetic data only.

## Splash and navigation

1. On a fresh app start, verify the plain white Splash screen shows RideShare Pro and Motorcycle Ride Sharing.
2. It should move to Login after 1.5 seconds without animation.
3. Choose Register. Verify Create account and all requested fields appear, including Gender.
4. Use the Back control, footer Login link, and Android Back to return to Login. The initial Splash screen should not reappear through Back navigation.

## Login

1. Submit empty inputs. Email and password must show required-field messages.
2. Enter `invalid@` for email. Blur or submit and verify the email-format message.
3. Enter `rider@example.com` and `Secure123`. Toggle Show and Hide. The value must remain intact and the control label must change appropriately.
4. Verify the keyboard is visible while editing and the inputs can be reached without overlap. Use the Next IME action to move from email to password.
5. Submit valid details. The keyboard should dismiss and a notice must explicitly state Login is not available yet. No authenticated screen or account session should appear.
6. Edit a value. The prior notice should clear, and touched-field validation should update.

## Registration

1. Submit empty fields. Errors must cover name, email, mobile, gender, password, and confirmation. Customer is selected by default.
2. Enter `Campus Rider`, `rider@example.com`, and `01712345678`. Select Prefer not to say and Biker.
3. Check malformed email, a short phone number, a password shorter than eight characters, whitespace-only passwords, and unequal confirmation values.
4. Verify each password field has its own visibility control. Showing one must not reveal the other or clear either value.
5. With the software keyboard open, scroll between upper fields and Confirm password. Verify focused fields and controls are reachable and input is not blocked by the keyboard.
6. Set both passwords to `Secure123`. Submit. The notice must state that the local checks passed and account creation is not available yet.
7. Confirm the selected gender/role remain selected and no account is created.

## Reusable components and accessibility

- PrimaryButton and SecondaryButton accept disabled/loading states. Loading buttons must block repeated presses.
- ConfirmDialog blocks confirm, cancel, and Android-back dismissal while loading. When idle, its callbacks control the visible state.
- RideCard and BidCard only render caller-provided data and callbacks. Do not infer any server operation from a card press.
- Check field labels, password-toggle labels, selected radio states, heading announcements, and validation alerts with TalkBack.
- Repeat layouts with larger font settings and a smaller emulator when available. Controls should wrap rather than clip.

## Automated checks

```sh
npm run lint
npm test
npm run check:dependencies
npm run export:android
```

See [UI verification](ui-foundation-verification.md) for executed results and screenshots. Instructions here are not assertions that every accessibility/device variant was tested.
