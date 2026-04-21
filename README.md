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

`cap sync` rewrites `android/capacitor-cordova-android-plugins/build.gradle` with a `flatDir` block that triggers Gradle warnings. The `cap:sync`, `cap:open:android`, and `android:release` scripts run `node scripts/strip-android-flatdir.mjs` after sync to remove it automatically.

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

## Finish deployment (checklist)

Use this when you are ready to ship **internal testing** (Play) or **TestFlight** / **App Store** (Apple).

### Shared (both stores)

- [ ] **Privacy policy (live URL):**  
  `https://brettmusco-code.github.io/sharon-july-fest-guide/privacy-policy.html`  
  Paste this in Play Console and App Store Connect where a privacy URL is required.
- [ ] **Build with secrets:** run `npm run build` / `npm run cap:sync` / release scripts from a machine that has a local `.env` with `VITE_SUPABASE_*` set (`.env` is not in git).
- [ ] **Supabase → Realtime:** enable replication for the `messages` table so the bell updates quickly when admins post (Database → Publications / table replication, depending on your project).

### Google Play (finish first — usually faster)

1. [ ] Play Console identity / $25 fee complete.
2. [ ] App created with package **`com.sharonma.july4th`**.
3. [ ] **`android/keystore.properties`** + **`android/release.keystore`** on the machine that builds; keystore + passwords backed up outside the repo.
4. [ ] Run: `npm run android:release` → upload **`android/app/build/outputs/bundle/release/app-release.aab`**.
5. [ ] **Internal testing:** Testing → Internal testing → Create release → add tester emails → share opt-in link.
6. [ ] **Store listing:** short + full description, screenshots (≥2), **App icon** `store-assets/play-store-icon-512.png`, **feature graphic** `store-assets/feature-graphic-1024x500.png`.
7. [ ] **Policy / forms:** Data safety, content rating, target audience, ads = No, etc. (complete all red items on the dashboard).
8. [ ] Each new upload: increase **`versionCode`** in `android/app/build.gradle` (and optionally `versionName`).

### Apple App Store

1. [ ] **Apple Developer Program** active (no “purchase your membership” banner on developer.apple.com).
2. [ ] **Identifiers:** App ID with bundle **`com.sharonma.july4th`** registered.
3. [ ] **App Store Connect:** New app with that bundle ID; fill listing, screenshots, App Privacy, review notes.
4. [ ] **Xcode:** `npm run cap:open:ios` → App target → Signing & Capabilities → Team selected → device **Any iOS Device (arm64)** → **Product → Archive** → Distribute to App Store Connect.
5. [ ] **Supabase auth (optional):** if admins use **sign-up email confirmation**, add your Capacitor / web redirect URLs under Supabase → Authentication → URL configuration.

### After each code change

```bash
npm run android:release   # Play .aab
npm run cap:open:ios      # then Archive in Xcode
```

---

## Known follow-ups before going live

- **Source icon is 512×512** and was upscaled to 1024×1024. For a crisp App Store icon, supply a true 1024×1024 master PNG (place at `store-assets/app-icon-1024.png`) and re-run the icon generation step in this README's git history.
- Confirm the **privacy policy** contact block in `public/privacy-policy.html` uses the committee’s real email (the public URL is in the checklist above).
- Configure the iOS **Status Bar** style if it clashes with the app header (currently `black-translucent`).
- Consider tightening `UISupportedInterfaceOrientations` to portrait-only if landscape layouts aren't polished.
- Before the first Play upload, generate & **back up** `android/release.keystore` in a password manager — losing it means you can never update the app.
