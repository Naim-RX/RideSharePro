# Supabase authentication

## Implemented flow

Email/password Login and Registration now call Supabase Auth. Registration supports Customer and Biker, collects the existing name/email/mobile/gender/password fields, and submits only email/password as credentials. Mobile is profile metadata, not an Auth phone credential; there is no SMS authentication.

With Confirm email enabled, signup returns no session. The app displays a confirmation message and a resend action. Open the email confirmation link, then return to Login manually. This phase does not consume email-link access tokens, perform automatic deep-link login, or implement password recovery. With Confirm email disabled in a development project, an immediate session is handled automatically.

The app intentionally uses a neutral message for an obfuscated duplicate-signup response; it does not falsely claim that a new account was created. Explicit duplicate-account errors, invalid credentials, unconfirmed email, rate limits, network failures, and profile setup errors have controlled user messages.

## Session and authorization boundaries

`AuthProvider` starts a tested authentication controller. It subscribes to SDK auth changes, restores the saved session, verifies identity using server `getUser()`, then reads the caller's own protected profile. Customer, Biker, and Administrator navigation comes only from `profiles.role`. Editable `user_metadata` is never an authorization source.

The trusted `private.handle_new_user` trigger in `20261120000100_schema.sql` creates the profile in the same transaction as the Auth user, links the UUID, initializes active status, and permits only customer/biker roles. Unknown signup roles become Customer, never Administrator. The client separately rejects any registration role other than Customer/Biker before making an Auth request. Biker creation also initializes biker_profiles. No client-side profile INSERT/UPSERT is used.

The UI does not silently repair a missing profile or infer its role from metadata. Missing rows, missing biker details, invalid roles, or incomplete contact data block protected navigation and offer retry/logout. The deployed RLS and restricted RPCs remain the backend authorization boundary.

Profiles are checked at login, session restoration, token/auth updates, and foreground return. Suspended accounts see a dedicated blocked screen. An administrator suspending an account while it is already foregrounded may leave its existing account screen visible until recheck, but protected database operations are denied immediately by the database role/status checks.

Late profile or restore responses cannot override logout: the controller versions pending work and clears the protected stack. Auth event callbacks do not await SDK operations, avoiding reentrant refresh hazards. Requests have a 30-second abort timeout and preserve caller cancellation. Users can log out while a profile check is pending.

## Persistence, refresh, and logout

The SDK persists sessions in React Native AsyncStorage and refreshes tokens while active. AsyncStorage is app-private but unencrypted; no encrypted/keychain-backed token storage is claimed. Passwords are sent only to Auth and are not saved by application code. No server secret/service-role credential is used.

SDK 2.119.2 or newer within v2 is required. The deprecated custom processLock option was removed in favor of the SDK's current default refresh/logout coordination. AppState subscriptions stop background refresh and recheck account access on return. The SDK client remains a singleton.

Logout uses `{ scope: 'local' }`, clears the device session, and checks that storage no longer yields a session. Server refresh-token revocation is best effort if offline; a notice explains that limitation. A local storage failure keeps protected navigation blocked with retry/logout instead of claiming success. Existing access JWTs on other holders remain valid until expiry; local logout does not sign out every other device.

References: [Supabase signup behavior](https://supabase.com/docs/reference/javascript/auth-signup), [local logout semantics](https://supabase.com/docs/reference/javascript/auth-signout), [SDK coordination migration](https://raw.githubusercontent.com/supabase/supabase-js/master/packages/core/auth-js/migrations/lockless-coordination.md).

## Required Dashboard configuration

1. Use this project's Supabase URL and **publishable** key in `mobile/.env`. Do not add database passwords, secret/service-role keys, or CLI tokens. Restart Expo after public environment changes.
2. Deploy all three existing migrations from `supabase/migrations/`. The profile trigger, RLS, table grants, and RPCs are prerequisites. No additional authentication migration is needed for this integration.
3. In Authentication configuration, enable the **Email** provider, password sign-in, and new-user signup. Keep Phone/SMS provider disabled for this scope.
4. Set **Confirm email** according to the intended environment. Hosted operation should retain confirmation. The implementation supports either setting; it does not bypass verification or force confirmation through a client flag.
5. Configure **Site URL** to a valid confirmation landing URL you control. Confirmation occurs at Supabase before redirect. The user then returns to the mobile app and logs in. A failed localhost redirect in development is not proof that verification failed; check the Auth user or attempt Login.
6. Keep the confirmation email template's `{{ .ConfirmationURL }}` link. Configure custom SMTP before sending beyond Supabase's permitted test recipients, and choose suitable rate limits. The resend action respects server errors and limits; it does not create unlimited retries.
7. Expose only intended Data API schemas. Keep private/auth unexposed and leave RLS enabled. Customers and bikers must not have direct UPDATE grants on protected role, ownership, or status fields.
8. Provision a dedicated Administrator through a trusted project operator using the [backend setup guide](supabase-setup.md). Administrator is not a public registration choice; the mobile admin landing only directs the user to the separate admin web application.

The read-only check below reports settings without printing a key or password:

```powershell
npm.cmd run auth:settings
npm.cmd run db:connectivity
```

Reference: [Supabase email/password authentication](https://supabase.com/docs/guides/auth/passwords).

## Manual tests

Start an Android Studio emulator, then run `npm run android`.

1. Register a Customer with an email you control. Verify loading, disabled inputs, name/mobile validation, and the confirmation notice when enabled.
2. Confirm the email. Return to Login and sign in. Check Customer account, name, email, mobile, and Logout.
3. Force-stop and reopen Expo Go/the app. The session should restore, be checked against the server profile, and return to Customer account without entering a password.
4. Log out and restart again. Login must remain visible; Back must not reveal the old protected screen.
5. Repeat with a Biker account. The destination must be Biker account and its biker_profiles row must exist.
6. Try an incorrect password and an unconfirmed account. Verify controlled errors, preserved email, no protected screen, and the confirmation resend control where relevant.
7. Repeat registration for a confirmed address. Accept either the server's explicit duplicate error or its neutral privacy-preserving confirmation response. There must be no second profile or client-side admin role.
8. With a trusted operator in a throwaway test project, suspend a test account in profiles. Foreground/restart the app: it must show Account suspended and allow Logout. Its protected RPCs must fail even if called outside the UI. Restore active status through trusted administration afterward.
9. In a test project, inspect a missing/incomplete profile using trusted tools. Login may create an Auth session, but the app must remain blocked. Repair profile data through trusted database operations; do not disable RLS or allow arbitrary client inserts.
10. Disconnect networking. Verify errors/retry/logout and that a cached profile is not used to authorize a fresh session check. Reconnect and retry.

## Automated and live tests

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run check:dependencies
npm.cmd run export:android
```

Live tests require two addresses you control. Put these only in ignored `mobile/.env.auth-test`:

```dotenv
AUTH_TEST_CUSTOMER_EMAIL=
AUTH_TEST_CUSTOMER_PASSWORD=
AUTH_TEST_BIKER_EMAIL=
AUTH_TEST_BIKER_PASSWORD=
```

No test password variable uses EXPO_PUBLIC_. Do not paste passwords into source or command arguments. The test file is ignored and is not an Expo environment filename. The scripts read it in Node and print only role/test/status codes.

`npm run auth:test:register` creates/submits these test registrations and can send real confirmation emails. Run only with addresses you own and intend to test. Confirm both emails, then run `npm run auth:test:live`. To retry only one account, use `node scripts/test-auth-live.mjs verify biker` or `customer`.

The live verifier calls the actual app service/controller and SDK, checks server profiles, persisted-adapter restoration, refresh, duplicate handling, direct role-edit denial, metadata-escalation resistance, and logout. It temporarily changes only each test user's editable role metadata and restores it; it never changes protected database roles or account status. Test users remain in the project for manual/device checks. Remove them via trusted Dashboard tools only if you no longer need them.

Native test screenshots containing test account information remain ignored under `.expo/verification/auth-private/`; no account credentials or screenshots are committed. See [authentication verification](authentication-verification.md) for actual results and limits.
