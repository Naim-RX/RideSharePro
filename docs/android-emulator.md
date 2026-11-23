# Android Studio Emulator

## Prerequisites

1. Install Node.js matching the root `package.json` engine range and npm.
2. Install Android Studio. In **Tools > SDK Manager**, install Android SDK Platform-Tools, Android Emulator, and a current Android system image. Android API 36 or newer is a suitable choice for this setup.
3. In **Tools > Device Manager**, create a virtual phone with the installed image and start it. Hardware virtualization must be enabled for emulator acceleration.
4. Set the user environment variable `ANDROID_HOME` to the SDK directory shown in SDK Manager. The normal Windows location is `%LOCALAPPDATA%\Android\Sdk`.
5. Add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to the user Path. Restart your terminal after changing environment variables.

To configure just the current PowerShell session with the default SDK location:

```powershell
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
adb devices
```

The running emulator should appear as a device, for example `emulator-5554`.

## Install and launch

From the repository root:

```powershell
npm.cmd ci
npm.cmd run android
```

`npm run android` launches Expo's development server and opens the app in Expo Go on the emulator. Allow installation of the SDK-compatible Expo Go runtime if prompted. Expo Go SDK 58 is required for this app; an SDK 56 runtime cannot load it.

Alternatively, run `npm start` and press `a`. To run directly inside the mobile folder:

```powershell
cd mobile
npm.cmd start -- --android
```

You should see the white **RideShare Pro** Splash screen with **Motorcycle Ride Sharing**, followed by Login. Choose Register to open the local registration form. Account services and location permissions are not connected.

## Connection troubleshooting

- If no device appears, start the virtual device in Device Manager and wait for Android to finish booting.
- If port 8081 is occupied, use `npm.cmd run start --workspace=@rideshare/mobile -- --android --port 8082` from the root.
- For an emulator that cannot reach Metro, use `adb reverse tcp:8082 tcp:8082` with the port you selected and launch with Expo's `--localhost` option.
- If dependencies are cached and network access is unavailable, `npm.cmd run start --workspace=@rideshare/mobile -- --offline --android` can start Metro; installing a missing Expo Go runtime still needs network access.
- If Metro serves stale code, stop it and run `npm.cmd run start --workspace=@rideshare/mobile -- --clear`.
- React Native DevTools download/cache errors relate to local tooling permissions. Use a terminal with access to your own user cache; do not change application code to hide them.

## What this does not require

You do not need to open a generated Android Gradle project or build an APK for this entry-screen check. `expo run:android` and EAS/native builds are separate workflows and are not part of this initialization.

Official references: [Expo Android Studio Emulator](https://docs.expo.dev/workflow/android-studio-emulator/) and [Start developing](https://docs.expo.dev/get-started/start-developing/).
