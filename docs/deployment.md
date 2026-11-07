# 🚀 Running & Deploying

[← Back to README](../README.md)

| Part | Local | Production | Deploys when |
|---|---|---|---|
| ☕ Backend | `mvn spring-boot:run` → `:8080` | 🟣 Render (Docker) | Push to `main` touching `backend/` |
| 🌐 Website | `npm run dev` → `:3000` | ▲ Vercel | Push to `main` |
| 📱 App | `npx expo run:android` | 📦 GitHub Release APK | Push to `main` touching `app/` |

```mermaid
flowchart LR
    DEV["👩‍💻 git push main"] --> GH["GitHub"]
    GH --> R["🟣 Render<br/>builds backend/Dockerfile"]
    GH --> V["▲ Vercel<br/>builds web/"]
    GH --> GA["⚙️ GitHub Actions<br/>eas build --local"]
    GA --> REL["📦 Release: android-latest<br/>ArthOS.apk"]
    R --> DB[("🍃 MongoDB Atlas")]
```

---

## 🧑‍💻 Local development

### Prerequisites

| Tool | Version |
|---|---|
| ☕ JDK | 21 |
| 🧱 Maven | 3.9+ |
| 🟢 Node.js | 22 |
| 🍃 MongoDB | Local, Docker (`docker run -p 27017:27017 mongo`), or a free Atlas cluster |
| 🤖 Android | Android Studio + SDK (only to build the app locally) |

### 1️⃣ Backend

```bash
cd backend
export MONGODB_URI="mongodb://localhost:27017/arthos"   # default if unset
mvn spring-boot:run          # → http://localhost:8080/api/health
mvn test                     # calculator + web-layer tests (no database needed)
```

### 2️⃣ Website

```bash
cd web
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev                  # → http://localhost:3000
npm run lint                 # ESLint (React Compiler rules)
```

### 3️⃣ App

```bash
cd app
cp .env.example .env         # EXPO_PUBLIC_API_URL
npm install
npx expo run:android         # builds and installs a dev build, starts Metro
# later, just the bundler:
npx expo start --dev-client --clear
```

| Where the app runs | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:8080` |
| Phone on the same Wi-Fi | `http://<your-PC-LAN-IP>:8080` |
| Against production | `https://arthos-9tro.onrender.com` |

> ⚠️ **Expo Go won't work.** The app has native modules (ML Kit OCR, Google sign-in, sharing), so it needs a dev build or the APK.

---

## 🔑 Environment variables

### ☕ Backend

| Variable | Required | Example / default |
|---|---|---|
| `MONGODB_URI` | ✅ | `mongodb+srv://user:pass@cluster.mongodb.net/arthos` |
| `MONGODB_DATABASE` | | `arthos` |
| `JWT_SECRET` | ✅ | 32+ random chars (`openssl rand -base64 48`). Render generates one. |
| `JWT_EXPIRY_HOURS` | | `168` (7 days) |
| `CORS_ALLOWED_ORIGINS` | ✅ | `https://os-arth.vercel.app,https://*.vercel.app` |
| `GOOGLE_CLIENT_ID` | for Google sign-in | Web OAuth client ID (served to clients via `/api/auth/providers`) |
| `GOOGLE_EXTRA_CLIENT_IDS` | | Other accepted audiences (e.g. the Android client) |
| `PORT` | | Set by the host; defaults to `8080` |

### 🌐 Website

| Variable | Example |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://arthos-9tro.onrender.com` |

### 📱 App

| Variable | Where |
|---|---|
| `EXPO_PUBLIC_API_URL` | `.env` locally; set in [`eas.json`](../app/eas.json) for builds |

> 🔒 `.env` files are gitignored. Never commit secrets; set them in the Render, Vercel or GitHub settings.

---

## ☁️ Production

### 🟣 Backend → Render

Vercel has no Java runtime, so the backend ships as a **Docker** image.

1. Render → **New → Blueprint** → select this repo. It reads [`render.yaml`](../render.yaml), which builds only `backend/`.
2. Set `MONGODB_URI`, `CORS_ALLOWED_ORIGINS` and `GOOGLE_CLIENT_ID`. `JWT_SECRET` is generated.
3. The health check is `/api/health`, and auto-deploy is on.

> 💤 On Render's free plan the service sleeps when idle, so the first request after a while takes a few seconds.
> Railway, Fly.io or Cloud Run work too: point them at `backend/Dockerfile` and make the service listen on `$PORT`.

### ▲ Website → Vercel

1. **Add New Project** → import the repo → **Root Directory = `web`**.
2. Add `NEXT_PUBLIC_API_URL`.
3. Add the Vercel domain to the backend's `CORS_ALLOWED_ORIGINS`.

### 📦 Android → GitHub Actions + EAS

[`.github/workflows/android-apk.yml`](../.github/workflows/android-apk.yml) runs on every push to `main` that touches `app/`:

| Step | Detail |
|---|---|
| 1 | Ubuntu runner, Node 22, JDK 17, `npm ci` |
| 2 | `eas build --platform android --profile preview --local`: a full EAS build **on the GitHub runner**, so no EAS cloud minutes are used |
| 3 | Signed with the EAS-managed keystore (its SHA-1 is registered for Google sign-in) |
| 4 | **arm64-v8a only**, which covers practically every phone from the last ~8 years and halves the size and build time |
| 5 | Publishes `ArthOS.apk` to the [**android-latest**](https://github.com/SamP231004/ArthOS/releases/tag/android-latest) release |

| Secret | Purpose |
|---|---|
| `EXPO_TOKEN` | expo.dev → Account settings → Access tokens |

**Install on a phone:** open the release page on the phone → tap **ArthOS.apk** → allow *"Install unknown apps"* for your browser the first time.

#### 📏 Why the APK is small (~40 MB)

| Technique | Effect |
|---|---|
| arm64 only | No x86/armv7 native libraries |
| R8 minification + resource shrinking (Expo default) | Removes unused code and resources |
| Keep rules for ML Kit ([`consumer-rules.pro`](../app/modules/arthos-ocr/android/consumer-rules.pro)) | ML Kit loads parts of itself by name at runtime, so those classes aren't renamed or stripped |

---

## ✅ Checks before pushing

| Part | Command |
|---|---|
| ☕ Backend | `mvn test` |
| 🌐 Web | `npm run lint` · `npx tsc --noEmit` |
| 📱 App | `npx tsc --noEmit` · `npx eslint src` · `npx expo-doctor` · `npx expo export --platform android` |
