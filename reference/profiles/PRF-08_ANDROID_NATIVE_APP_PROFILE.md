# PRF-08 Android Native App Profile

## Purpose
Use this optional profile when the product application is an Android native app or Android-first mobile app.

Android work has release, signing, device, permission, local-storage, and app-store/MDM boundaries that are not covered by generic web-app profiles.

## Approval Rule
- Activate when implementation includes Android native code, Gradle/Android Gradle Plugin configuration, APK/AAB delivery, emulator/device testing, Android permissions, signing, or Play/MDM/sideload release channels.
- If the Android app is only a client for a larger business workflow, combine this profile with the relevant workflow, legacy replacement, or API/backend profile.
- Do not place project-specific package names, signing secrets, keystore paths, or store account details in this reusable profile; keep them in project packets or secured project artifacts.
- `PRF-08` is active only when it is declared in `.agents/artifacts/ACTIVE_PROFILES.md` and cited by the active packet.

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- Android package namespace:
- Kotlin / Java policy:
- Gradle / AGP version:
- minSdk / targetSdk:
- Signing policy:
- Build variants / flavors:
- Permissions policy:
- Local storage policy:
- Network security / API boundary:
- Navigation structure:
- Offline / sync policy:
- Notification policy:
- Privacy / data policy:
- Device / emulator test plan:
- Release channel:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active packets cite `reference/profiles/PRF-08_ANDROID_NATIVE_APP_PROFILE.md`.
- Product-specific namespace, variant naming, signing material, release track, API host, storage schema, and device support matrix stay in the project packet or secured project artifacts.
- `Ready For Code` is blocked when signing, permission, storage, network, test-device, or release-channel evidence is unknown for an Android release-impacting packet.
