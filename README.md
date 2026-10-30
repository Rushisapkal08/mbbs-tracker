# MBBS Tracker – website + Android app from one GitHub repo

`public/` is the whole app. Every push to `main`:
- publishes the **website / installable web app** (GitHub Pages), and
- builds the **Android APK** and attaches it to the repo's **Releases** page.

Both use your Firebase project (`lecture-tracker-9a250`), so signing in with the same
email + password on web and phone syncs everything.

## One-time setup (about 10 minutes)

1. **Create the repo** on github.com → New repository → name it e.g. `mbbs-tracker`.
   Make it **Public** (free Pages; the Firebase web config is public by design — your data
   is protected by Firebase sign-in + the rules in step 4).
2. **Upload this folder** (needs Git; or use GitHub Desktop):

       cd mbbs-tracker-pwa
       git init -b main
       git add .
       git commit -m "MBBS Tracker"
       git remote add origin https://github.com/YOUR-USERNAME/mbbs-tracker.git
       git push -u origin main

3. **Turn on Pages:** repo → Settings → Pages → Source: **GitHub Actions**.
   Then repo → Actions → run "Deploy website" (or just push again).
   Your site: `https://YOUR-USERNAME.github.io/mbbs-tracker/`
4. **Allow the site in Firebase:** Firebase Console → Authentication → Settings →
   Authorized domains → Add `YOUR-USERNAME.github.io`.
   Also check Firestore → Rules (recommended):

       rules_version = '2';
       service cloud.firestore {
         match /databases/{db}/documents {
           match /users/{uid} {
             allow read, write: if request.auth != null && request.auth.uid == uid;
           }
         }
       }

5. **Get the APK:** repo → Actions → "Build Android APK" finishes in ~5–8 min →
   repo → **Releases → latest → MBBS-Tracker.apk**. Open that page on your phone,
   download, install (allow "install unknown apps" when asked).

## Install the web app
- **Chrome:** tap the in-app **Install** banner, or the install icon in the address bar.
- **Safari iPhone/iPad:** Share → **Add to Home Screen**.
- **Safari Mac:** File → **Add to Dock**.

## Updating
Edit anything in `public/`, commit, push. The website updates in a minute or two and a
new APK appears under Releases. All APKs share one signing key (`signing/debug.keystore`),
so a new APK installs over the old one and keeps your login. (If the very first one
refuses to install over your old APK, uninstall the old one once — your data is in the cloud.)

## Sync notes
- Same email/password everywhere. Installed iPhone web apps have separate storage: sign in once.
- Sync is "latest save wins" for the whole account; avoid editing offline on two devices at once.

## Troubleshooting
- Sign-in error mentioning "referer … blocked": Google Cloud Console → APIs & Services →
  Credentials → Browser API key → add `https://YOUR-USERNAME.github.io/*`.
- Build failed: repo → Actions → click the red run → send me the error text.
- Optional: `firebase.json` is still here if you'd rather host on Firebase Hosting
  (`firebase deploy --only hosting`).
