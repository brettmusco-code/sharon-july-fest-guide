# Sharon Independence Day — Mobile App

Hybrid Capacitor app (Vite + React) shipped to the App Store and Google Play.

- Bundle ID / Application ID: `com.sharonma.july4th`
- Display name: **Sharon Independence Day**
- Web app: `src/` → built to `dist/` → synced into `ios/` and `android/` by Capacitor.

## Daily development (web)

```bash
npm install
npm run dev        # http://localhost:8080
npm test
```

## Opening the native projects

After ANY change to web code or `capacitor.config.ts`:

```bash
npm run cap:sync           # builds web + syncs to ios & android
npm run cap:open:ios       # opens Xcode
npm run cap:open:android   # opens Android Studio
```

---

## iOS — App Store submission

### First-time setup
1. Apple Developer account enrolled ($99/yr).
2. In App Store Connect, create an app with bundle ID `com.sharonma.july4th`.
3. Open the project:
   ```bash
   npm run cap:open:ios
   ```
4. In Xcode, select the **App** target → **Signing & Capabilities**:
   - Set **Team** to your Apple Developer team.
   - **Automatically manage signing** ON.
5. Bump `MARKETING_VERSION` (user-facing, e.g. `1.0.0`) and `CURRENT_PROJECT_VERSION` (build number, must increase each upload) on every release.

### Release build
```bash
npm run ios:archive
```
Or from Xcode: **Product → Archive**, then **Distribute App → App Store Connect**.

### Store listing requirements
- Screenshots: iPhone 6.7" (1290×2796) and iPad 13" (2064×2752) if supporting iPad.
- Privacy policy URL (required — even if we collect nothing, Apple requires a URL that says so).
- Data-collection disclosure: the app itself is static content + Supabase queries; declare what Supabase writes (email, free-text) on the **App Privacy** screen.
- Encryption: `Info.plist` already sets `ITSAppUsesNonExemptEncryption = false` (only HTTPS is used).

---

## Android — Google Play submission

### First-time setup
1. Google Play Console account ($25 one-time).
2. Create an app with package name `com.sharonma.july4th`.
3. Create an upload keystore (DO THIS ONCE, BACK IT UP FOREVER):
   ```bash
   keytool -genkey -v \
     -keystore android/release.keystore \
     -alias sharon-july4th \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
4. Create `android/keystore.properties` (copy `android/keystore.properties.example`) with the passwords you just set. This file is git-ignored.

### Release build (Android App Bundle)
```bash
npm run android:release
```
Output: `android/app/build/outputs/bundle/release/app-release.aab` — upload this to Play Console.

### Store listing requirements
- High-res icon: `store-assets/play-store-icon-512.png` (already generated).
- Feature graphic: 1024×500 PNG (you need to create this).
- Phone screenshots: at least 2, 1080×1920 or 1080×2400 is fine.
- Privacy policy URL (required).
- Data safety form: declare what Supabase collects.

---

## What changed to make this store-ready

| Concern | Before | After |
| --- | --- | --- |
| Bundle / Application ID | `app.lovable.…` (placeholder) | `com.sharonma.july4th` |
| App display name | `sma-july4th` | **Sharon Independence Day** |
| iOS App Icon | 512×512 JPEG renamed `.png` (rejected by App Store) | True 1024×1024 PNG, no alpha |
| Android launcher icons | Lime-green placeholder vector | Real launcher + adaptive icon at all 5 densities |
| Android release build | Unsigned, no minification | Signed via `keystore.properties`, minify + resource shrinking, bundle splits |
| iOS encryption declaration | Missing | `ITSAppUsesNonExemptEncryption = false` set |
| iOS Info.plist | Required obsolete `armv7` capability | Removed |
| Vite build | Absolute `/` paths, sourcemaps on | `base: "./"`, sourcemaps off in prod |
| Android theme colors | White on white | App navy `#1e3a5f` / gold `#c8a24a` |

## Known follow-ups before going live

- **Source icon is 512×512** and was upscaled to 1024×1024. For a crisp App Store icon, supply a true 1024×1024 master PNG (place at `store-assets/app-icon-1024.png`) and re-run the icon generation step in this README's git history.
- Add a hosted **Privacy Policy** URL — both stores require it.
- Configure the iOS **Status Bar** style if it clashes with the app header (currently `black-translucent`).
- Consider tightening `UISupportedInterfaceOrientations` to portrait-only if landscape layouts aren't polished.
- Before the first Play upload, generate & **back up** `android/release.keystore` in a password manager — losing it means you can never update the app.
