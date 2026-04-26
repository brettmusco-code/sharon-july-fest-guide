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

### Use your own Supabase (cut over from Lovable)

1. In the [Supabase dashboard](https://supabase.com/dashboard) → **Settings → API**, copy **Project URL**, the **project ref** (the subdomain before `.supabase.co`), and the **anon public** key (long `eyJ…` string — not `service_role`).
2. In the project root, copy **`.env.example`** to **`.env`** and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, and `VITE_SUPABASE_PUBLISHABLE_KEY`. Trailing spaces will break the client.
3. In Lovable, **Connectors → Lovable Cloud → Disable Cloud** if you use it, so the repo is not overwritten. (This is one-way; test your new project first.)
4. **Optional:** In **`vite.config.ts`**, set the `FALLBACK_SUPABASE_*` strings to the same public URL, anon key, and ref as step 1 so `vite build` works in CI or environments without a `.env`. If you leave them empty, you must always build with a real `.env`.
5. In the new project, run **all** SQL migrations in order (SQL Editor, or `supabase link` + `db push` if you use the CLI and own the project). Then **link the CLI** if you deploy functions: `supabase link --project-ref <ref>` and update `supabase/config.toml` or let `link` do it.
6. **Server push (Postgres `net.http_post` trigger):** After migration `20260501000000_push_url_from_app_config.sql` is applied, insert **`app_config`** rows (see **`.env.example`**): `push_edge_function_url` = full `https://<ref>.supabase.co/functions/v1/broadcast-push`, and `push_webhook_secret` = same string as Edge Function secret **`PUSH_WEBHOOK_SECRET`**. Deploy **`broadcast-push`** to the new project and set Edge secrets (`FIREBASE_SERVICE_ACCOUNT_JSON`, `PUSH_WEBHOOK_SECRET`). The `messages` insert trigger calls the function over HTTP; you do not need a separate Dashboard “Database Webhook” if this path is configured.
7. Run `npm run dev` and test admin + public flows; then `npm run cap:sync` and new store builds (bump **Android `versionCode`** and **iOS build number** each upload).

### Photo submissions (`submit-photo` Edge Function)

Public photo uploads go through the **`submit-photo`** Edge Function, which authenticates as a Google Cloud service account and uploads the file to **Google Drive** via the standard Drive API (no Lovable connector required).

1. In **Google Cloud Console** → **APIs & Services** → enable the **Google Drive API** for a project you own.
2. **IAM & Admin → Service Accounts →** create a service account (e.g. `sharon-july4-photos`). Under **Keys**, **Add key → JSON**, and download the JSON file. This is your `GOOGLE_SERVICE_ACCOUNT_JSON` secret.
3. In **Google Drive**, create the destination folder (or use a Shared Drive). **Share** the folder with the service account's `client_email` (the one in the JSON, like `sharon-july4-photos@your-gcp-project.iam.gserviceaccount.com`) with the **Editor** role (or **Content manager** on a Shared Drive).
4. Copy the folder ID from its Drive URL (`.../folders/<FOLDER_ID>`).
5. In Supabase **SQL Editor**, set the folder ID:
   ```sql
   insert into public.app_config (key, value) values ('photo_drive_folder_id', '<FOLDER_ID>')
   on conflict (key) do update set value = excluded.value, updated_at = now();
   ```
6. Set the Edge secret and deploy:
   ```bash
   npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)" --project-ref <ref>
   npx supabase functions deploy submit-photo --no-verify-jwt --project-ref <ref>
   ```
7. Try a photo upload in the app and check **`public.photo_submissions`** (admin UI at `/admin/photos` or SQL).

Common errors the function maps to friendly toast messages:
- **403** → Drive folder not shared with the service account.
- **404** → `photo_drive_folder_id` points at a folder the service account can't see.
- **401** → service account key revoked or JSON is wrong / stale.

### Copy old Supabase data into your new project

After migrations run on the **new** project, use **`scripts/migrate-supabase-data.mjs`**: set `MIGRATE_OLD_URL`, `MIGRATE_OLD_ANON_KEY`, `MIGRATE_NEW_URL`, and `MIGRATE_NEW_SERVICE_ROLE_KEY`, then run `node scripts/migrate-supabase-data.mjs`. It does **not** copy `auth.users` or `user_roles` — recreate admin accounts in the new project’s **Authentication** UI first if needed.

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

## Push notifications (Android + iOS)

The app registers for push on **native** builds and saves an **FCM device token** in Supabase via `register_push_token()`. When an admin inserts a row into **`messages`**, a **Database Webhook** can call the **`broadcast-push`** Edge Function to fan out FCM notifications.

### 1. Firebase (one project for both platforms)

1. [Firebase Console](https://console.firebase.google.com) → Create project (or use existing).
2. **Add Android app** — package name **`com.sharonma.july4th`**. Download **`google-services.json`** → place at **`android/app/google-services.json`** (gitignored).
3. **Add iOS app** — bundle **`com.sharonma.july4th`**. Download **`GoogleService-Info.plist`** → place in **`ios/App/App/`** (gitignored).
4. **iOS only:** Firebase → Project settings → Cloud Messaging → upload your **APNs Authentication Key (.p8)** (create in Apple Developer → Keys).
5. **Service account:** Firebase → Project settings → Service accounts → **Generate new private key** JSON. You will paste this JSON (as a single-line secret) into Supabase for the Edge Function.

### 2. Apple Xcode capability (one-time, required)

Open **`npm run cap:open:ios`**, select the **App** target → **Signing & Capabilities** →

1. **+ Capability → Push Notifications** (this picks up `ios/App/App/App.entitlements`).
2. **+ Capability → Background Modes** → tick **Remote notifications**.
3. Drag **`ios/App/App/GoogleService-Info.plist`** into the **App** group in Xcode's left sidebar (check "Copy items if needed" + add to the App target). Without this file, `FirebaseApp.configure()` crashes on launch.
4. If the linker can't find Firebase, in **App target → General → Frameworks, Libraries, and Embedded Content**, add **FirebaseCore** and **FirebaseMessaging** from the SPM package.

iOS now goes through Firebase the same way Android does: APNs delivers the device token → Firebase Messaging mints an FCM token → the JS layer saves the FCM token in `device_push_tokens` (platform = `ios`). The existing `broadcast-push` Edge Function works for both platforms unchanged.

### 3. Supabase database

Apply the migration (or run SQL from repo):

- `supabase/migrations/20260421190000_device_push_tokens.sql` — creates **`device_push_tokens`** and **`register_push_token(text, text)`**.

### 4. Supabase Edge Function `broadcast-push`

Deploy the function folder **`supabase/functions/broadcast-push/`**, then set **secrets**:

| Secret | Value |
|--------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Entire Firebase service account JSON (paste as one secret string). |
| `PUSH_WEBHOOK_SECRET` | Long random string you invent (e.g. 32+ chars). |

### 5. Database webhook

Supabase Dashboard → **Database → Webhooks** → create webhook:

- **Table:** `public.messages`
- **Events:** Insert
- **HTTP Request:** POST to `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/broadcast-push`
- **HTTP Headers:** `x-webhook-secret: <same PUSH_WEBHOOK_SECRET>`

### 6. Rebuild native apps

```bash
npm run cap:sync
```

Then rebuild Android/iOS store binaries so Firebase config and the push plugin ship with the app.

---

## Known follow-ups before going live

- **Source icon is 512×512** and was upscaled to 1024×1024. For a crisp App Store icon, supply a true 1024×1024 master PNG (place at `store-assets/app-icon-1024.png`) and re-run the icon generation step in this README's git history.
- The **privacy policy** in `public/privacy-policy.html` is updated for push, Firebase, and admin accounts; confirm the **contact email** in that file is the one you want on the stores.
- Configure the iOS **Status Bar** style if it clashes with the app header (currently `black-translucent`).
- Consider tightening `UISupportedInterfaceOrientations` to portrait-only if landscape layouts aren't polished.
- Before the first Play upload, generate & **back up** `android/release.keystore` in a password manager — losing it means you can never update the app.
