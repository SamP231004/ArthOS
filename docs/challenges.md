# 🧗 Challenges & Fixes

[← Back to README](../README.md)

A log of the hardest problems we hit while building ArthOS: what we saw, what was actually wrong, and how we fixed it.
Several of them looked like one problem and turned out to be another.

Each entry follows the same shape: **🐛 Symptom → 🔍 Root cause → 🛠️ Fix → 💡 Lesson**.

| # | Challenge | Area | Status |
|---|---|---|---|
| 1 | [📤 Share → ArthOS didn't work](#1--share--arthos-didnt-work) | 📱 App | ✅ Fixed |
| 2 | [👁️ "getClass() on a null object reference" when reading screenshots](#2-️-getclass-on-a-null-object-reference-when-reading-screenshots) | 📱 App | ✅ Fixed |
| 3 | [🐢 The demo sandbox took too long to load](#3--the-demo-sandbox-took-too-long-to-load) | ☕ Backend · ☁️ Infra | ✅ Fixed |
| 4 | [🏦 Savings were calculated backwards](#4--savings-were-calculated-backwards) | 🧮 Product logic | ✅ Fixed |
| 5 | [🌗 Theme switch flashed black in the app](#5--theme-switch-flashed-black-in-the-app) | 📱 App | ✅ Fixed |
| 6 | [📦 Building the APK on GitHub](#6--building-the-apk-on-github) | ⚙️ CI | ✅ Fixed |
| 7 | [📉 APK went from 110 MB to 37 MB, and what that broke](#7--apk-went-from-110-mb-to-37-mb-and-what-that-broke) | 📱 App | ✅ Fixed |
| 8 | [🧩 Expo Go showed nothing new, or crashed](#8--expo-go-showed-nothing-new-or-crashed) | 📱 App | ✅ Explained |
| 9 | [👯 The same stock showed up twice](#9--the-same-stock-showed-up-twice) | 📈 Investments | ✅ Fixed |
| 10 | [🔢 OCR read ₹450 as 3450](#10--ocr-read-450-as-3450) | 📸 Automation | ✅ Fixed |
| 11 | [🕵️ Insights blamed a category for a one-off purchase](#11-️-insights-blamed-a-category-for-a-one-off-purchase) | 💡 Insights | ✅ Fixed |
| 12 | [➖ "-₹0" on screen](#12--0-on-screen) | 🌐 Web · 📱 App | ✅ Fixed |
| 13 | [⚛️ React Compiler lint rules](#13-️-react-compiler-lint-rules) | 🌐 Web | ✅ Fixed |
| 14 | [🔐 Google sign-in on Android](#14--google-sign-in-on-android) | 📱 App | 🔄 In progress |
| 15 | [✂️ Selling more than you held, after an edit](#15-️-selling-more-than-you-held-after-an-edit) | 📈 Investments | ✅ Fixed |
| 16 | [🧵 A virtual-thread deadlock in the price cache](#16--a-virtual-thread-deadlock-in-the-price-cache) | ☕ Backend | ✅ Fixed |

---

## 1. 📤 Share → ArthOS didn't work

The goal: on a GPay or PhonePe success screen, tap **Share → ArthOS**, and a filled-in expense form opens. It took three rounds.

| Round | 🐛 What we saw | 🔍 Why |
|---|---|---|
| 1 | ArthOS **wasn't in the share list** at all | The app never told Android it can receive images. That needs an **intent filter** for `image/*` (and `text/plain` for SMS text) in the manifest. |
| 2 | ArthOS appeared, but tapping it gave **"ArthOS keeps stopping"** or did nothing | The share handler tried to **navigate before the router was ready**, which crashed. When it didn't crash, an effect's cleanup **cancelled the delayed navigation** before it ran, so nothing happened. |
| 3 | Still flaky across cold and warm starts | The third-party share library and Expo Router were both trying to handle the incoming intent URL. |

### 🛠️ Fix

We researched how apps like WhatsApp handle sharing, then rebuilt it on Expo's own **`expo-sharing`** receive API and removed the third-party library:

| Piece | What it does |
|---|---|
| `app.json` plugin, `singleShareMimeTypes: ["image/*", "text/plain"]` | Puts ArthOS in the share sheet for images and text |
| `useIncomingShare()` | Receives the item; the file is **copied into the app cache** and arrives as a `file://` URI |
| [`+native-intent.tsx`](../app/src/app/+native-intent.tsx) | Maps the share URL to `/`, so the router never tries to open a route that doesn't exist |
| [`share-intent-router.tsx`](../app/src/components/share-intent-router.tsx) | Waits until you're **signed in, onboarded and navigation is ready**, then opens `/scan` with the image or text, and clears the payload so it isn't handled twice |

💡 **Lesson:** on Android, "receiving a share" is two problems: being **discoverable** (the manifest) and handling an intent that can arrive **before your app is ready**, on both cold and warm starts.

---

## 2. 👁️ "getClass() on a null object reference" when reading screenshots

Sharing worked, but scanning failed with:

```text
NullPointerException: Attempt to invoke virtual method 'java.lang.Class java.lang.Object.getClass()'
on a null object reference @ x89.<init>:62 < h99.n0:146 < v1.u0:28
```

| Attempt | Theory | Result |
|---|---|---|
| 1 | The OCR library can't open `file://` URIs, or the Play Services text model isn't downloaded yet | Replaced it with our own Expo module, [`arthos-ocr`](../app/modules/arthos-ocr), using the **bundled** ML Kit model → ❌ same error |
| 2 | ML Kit's `InputImage.fromFilePath` fails on some URIs | Decoded the bitmap ourselves, with EXIF rotation, and used `InputImage.fromBitmap` → ❌ same error |
| 3 | 🔍 **The stack frames are scrambled** (`x89`, `h99`): this is **R8 minification** | ✅ Real cause |

### 🔍 Root cause

Expo release builds run **R8**, which shrinks and renames code (`android.enableMinifyInReleaseBuilds=true` by default). ML Kit
finds some of its internal components **by class name at runtime**. After renaming, the lookup returned `null`, and ML Kit called
`.getClass()` on it. The image was never the problem.

### 🛠️ Fix

Keep rules shipped with the OCR module ([`consumer-rules.pro`](../app/modules/arthos-ocr/android/consumer-rules.pro)) so R8 leaves ML Kit alone:

```proguard
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_common.** { *; }
-keep class com.google.firebase.components.** { *; }
-keep class * implements com.google.firebase.components.ComponentRegistrar { *; }
```

💡 **Lesson:** when a crash only happens in **release** builds and the stack trace has nonsense names like `x89`, suspect minification before touching your own code.

---

## 3. 🐢 The demo sandbox took too long to load

"Try the demo" took several seconds after the server was awake, and much longer when it wasn't.

### 🔍 Measuring first

| Call (production, server awake) | Before |
|---|---|
| `GET /api/health` | 0.49 s |
| `GET /api/users/me` (one DB query) | 0.97 s |
| `POST /api/auth/demo` | **4.68 s** |
| `GET /api/insights` | **2.52 s** |

A single-query call cost about 0.5 s more than the health check, so **every database round trip was expensive**.

### 🔍 Root causes (four of them)

| # | Cause | Evidence |
|---|---|---|
| 🌏 | **Different regions:** MongoDB Atlas is in **AWS Mumbai** (`aws-aps1` in the cluster hostname), while Render runs in **Oregon, USA** by default, so every query crosses the Pacific (~250 ms) | DNS of the Atlas shard; no `region` in `render.yaml` |
| 🔁 | **Sequential queries:** Insights ran ~8 queries one after another, and the savings account fetched incomes and holdings again | Code reading: 8 × 0.25 s ≈ the 2.5 s we measured |
| 🐌 | **Write throughput:** the free **Atlas M0** tier caps operations per second, and each demo inserted ~300 expenses (about 1.3 s even close to the DB) | Timing logs: splitting the insert didn't help; inserting fewer documents did |
| 🧊 | **Cold price histories:** the first demo after a restart loaded two years of prices for the demo portfolio (2.1 s) | Timing logs |
| 😴 | **Render free plan sleeps** after ~15 min idle; waking takes 30–60 s | Render free-tier behaviour |

### 🛠️ Fixes

| Fix | Effect |
|---|---|
| ⚡ [`Parallel`](../backend/src/main/java/com/arthos/common/Parallel.java): independent reads run **at once** on Java 21 **virtual threads** (summary, insights, savings) | Many round trips become about one |
| ♻️ Data is **shared** instead of fetched twice (incomes and holdings for the savings account) | Fewer queries |
| 🧵 Demo inserts and market histories run **concurrently** | Overlapping waits |
| ✂️ Older demo months use **fewer, larger entries** with the same totals (287 → 198 expenses) | ~30% fewer writes |
| 🎲 Each demo month has its **own random stream** | Thinning old months doesn't reshuffle the current one |
| 🔥 Demo price histories are **preloaded at startup and every 30 min** | No cold fetch for visitors |
| 🏓 A [keep-alive workflow](../.github/workflows/keep-alive.yml) pings `/api/health` every 10 min | No 30–60 s cold start |

Locally (close to the database), demo creation went from **2.0–2.7 s to 0.8–1.6 s**, and summary and insights to **~0.3 s** each.

> 🔜 **Biggest remaining win:** put the backend and database in the same region. Render can't change an existing service's region,
> so it means creating the service in **Singapore** (closest Render region to Mumbai) and updating the backend URL, or
> moving Atlas next to Render.

💡 **Lesson:** measure before optimising. The fix was a combination of four things, and the biggest one (regions) wasn't in the code at all.

---

## 4. 🏦 Savings were calculated backwards

### 🐛 Symptom

Savings were shown as *whatever was left at the end of the month*, which is how most trackers do it and the opposite of good practice.

### 🛠️ Fix: pay yourself first

| Before | After |
|---|---|
| savings = income − expenses, at month end | **saved first** = rule(income) the moment it arrives; only the rest is spendable |
| Savings vanished every month | A **savings account** that **carries forward**, with an optional starting balance |
| Investments weren't linked to savings | Each buy is paid **from savings**, **from spending money**, or **split** between them |

This touched the summary, budget, investments and demo data. Details: [money-model.md](money-model.md).

💡 **Lesson:** get the money model right before building screens on top of it. Every later feature depended on it.

---

## 5. 🌗 Theme switch flashed black in the app

| 🐛 Symptom | 🔍 Cause |
|---|---|
| On Android, switching Forest ↔ Ivory showed a **black screen** or made the **screen jump up** before the transition | Re-rendering the whole tree with new colours while animating a full-screen overlay; the JS-driven animation dropped frames during the re-render |

### 🛠️ Fix

1. Take a **snapshot** of the current screen (`react-native-view-shot`).
2. Switch the theme underneath it.
3. Reveal the new theme with a **circle that grows from the sun/moon button**, using a **native-driver** scale animation with an inverse inner scale, so it runs on the UI thread and stays smooth during the re-render.

We also tried four themes with a cycle button, then went back to the two originals with the ☀️/🌙 toggle: fewer, better themes.

---

## 6. 📦 Building the APK on GitHub

| 🐛 Problem | 🛠️ Fix |
|---|---|
| The `setup-android` action **failed** on its retired "tools" package | Removed it: `ubuntu-latest` already ships the Android SDK |
| EAS cloud builds use limited free minutes | `eas build --local` **on the GitHub runner**: same EAS signing keystore, no cloud minutes |
| Needed a stable download link for phones | Every build replaces `ArthOS.apk` in the **`android-latest`** release |
| Builds needed Expo auth | `EXPO_TOKEN` repository secret |

---

## 7. 📉 APK went from 110 MB to 37 MB, and what that broke

| Change | Saving |
|---|---|
| **arm64-v8a only** (every phone from the last ~8 years) | No x86/armv7 native libraries: roughly half the size |
| **R8 minification + resource shrinking** (Expo default for release builds) | Unused code and resources removed |

⚠️ Side effect: R8 broke ML Kit. See [challenge 2](#2-️-getclass-on-a-null-object-reference-when-reading-screenshots).

---

## 8. 🧩 Expo Go showed nothing new, or crashed

| 🐛 Symptom | 🔍 Cause | 🛠️ Fix |
|---|---|---|
| Changes didn't appear in Expo Go, or screens crashed | ArthOS uses **native modules** that Expo Go doesn't include (Google sign-in, ML Kit OCR, sharing) | Use a **dev build** (`npx expo run:android`) or the APK. The Google sign-in library is **loaded lazily** so Expo Go doesn't crash. |
| TypeScript errors for new routes (`/scan`) | Expo Router's **typed routes** were stale | Regenerate them by starting the bundler once |

---

## 9. 👯 The same stock showed up twice

| 🐛 Symptom | 🔍 Cause | 🛠️ Fix |
|---|---|---|
| Buying a stock again created a **second row** | Each purchase created a new holding | [`HoldingIdentity`](../backend/src/main/java/com/arthos/portfolio/HoldingIdentity.java): a repeat buy **joins** the existing holding; old duplicates are merged with every transaction kept |
| Search showed every company **twice** (NSE and BSE) | Yahoo lists both `X.NS` and `X.BO` | Show each company once, preferring NSE |
| `ETERNAL.NS` and `ETERNAL.BO` treated as different | Exchange suffix | Compare without the suffix, or by normalised company name ("Eternal Ltd." = "ETERNAL LIMITED") |
| Mutual fund names repeated | AMFI lists some schemes under old and new codes | De-duplicate by name |

---

## 10. 🔢 OCR read ₹450 as 3450

| 🐛 Misread | 🛠️ Parser rule ([`TransactionTextParser`](../backend/src/main/java/com/arthos/automation/TransactionTextParser.java)) |
|---|---|
| `₹` read as `%`, `Z`, `X`, `?`, `&` | Treat these as currency marks when right before digits |
| `₹450` read as `3450` / `2450` / `7450` | When readings differ by an extra leading 2/3/7, the shorter one is the real amount |
| `Avl Bal Rs.48,212` picked as the amount | Judge each amount by the words **just before it**; skip balances and cashback |
| `A/c XX4821`, phone numbers, RRNs, years, times taken as amounts | Explicitly excluded |

All of these are unit-tested against real GPay, PhonePe, Paytm, bank SMS and receipt layouts.

---

## 11. 🕵️ Insights blamed a category for a one-off purchase

| 🐛 Symptom | 🛠️ Fix |
|---|---|
| *"Shopping is up 140%"* when the cause was **one** big purchase already flagged as unusual | A category rise driven mostly by a flagged anomaly isn't reported as a trend |
| *"Most went to X"* named a merchant with a **single** payment | The top merchant needs ≥ 2 payments |

---

## 12. ➖ "-₹0" on screen

**Cause:** JavaScript's **negative zero**: `-0` prints as "-0", so tiny negative rounding showed as **-₹0**.
**Fix:** `Math.max(0, value) || 0` where the value can't be negative.

---

## 13. ⚛️ React Compiler lint rules

Next.js 16 with the React Compiler enforces strict rules:

| Rule | What we changed |
|---|---|
| No `setState` directly in an effect body | Derive the value during render, or set it in event handlers |
| No components created during render (`react-hooks/static-components`) | Hoisted inner components (e.g. `Row` → `StatementRow`) to module level |
| No mutation during render | Rewrote reassignments as pure expressions |

---

## 14. 🔐 Google sign-in on Android

| What we know | |
|---|---|
| ✅ Backend serves the web client ID (`/api/auth/providers`) | Verified |
| ✅ App requests an ID token for the **web** client and posts it to `/api/auth/google` | Verified |
| 🔍 The APK's signing certificate | **SHA-1 `21:F4:C4:55:9B:25:8A:49:58:30:3B:B1:8F:33:3F:4F:02:12:57:2D`** |

**Tooling hurdle:** `keytool -printcert -jarfile` printed nothing, because it only reads old **v1** JAR signatures and modern
APKs use the **v2** signing block. We wrote a small parser that reads the certificate straight from the APK Signing Block.

**Most common causes of `DEVELOPER_ERROR` (code 10):**

| Check | Should be |
|---|---|
| Android OAuth client package name | `com.arthos.app` |
| Its SHA-1 | The fingerprint above (the EAS keystore that signs the APK) |
| Same Google Cloud project as the web client | ✅ |
| OAuth consent screen | Published, or your account added as a test user |

---

## 15. ✂️ Selling more than you held, after an edit

| 🐛 Symptom | 🛠️ Fix |
|---|---|
| Editing an old buy (smaller quantity, later date) could leave a **later sale selling more than you owned** | Every add, edit and delete replays the transactions in date order and rejects the change: *"That would sell more than you held on…"* |

---

## 16. 🧵 A virtual-thread deadlock in the price cache

| | |
|---|---|
| 🐛 **Symptom** | Right after the backend started, requests hung. The log showed `Market data for … unavailable` once every **12 seconds**, one symbol after another, even though Yahoo and mfapi answered in about a second from the same machine. |
| 🔍 **Root cause** | The price cache loaded entries with `ConcurrentHashMap.computeIfAbsent(key, k -> store.findById(k))`: a **blocking database read inside the map's `synchronized` lock**. On Java 21, a **virtual thread that blocks inside `synchronized` pins its carrier thread**, and there are only as many carriers as CPU cores. When the new startup price warm-up overlapped a request's lookups, every carrier was pinned and the other virtual threads couldn't run until their 12 s timeouts. |
| 🛠️ **Fix** | Read from the database **outside** the lock, then `putIfAbsent` (the first writer wins if two threads race). The same startup scenario now answers in ~0.4 s, with no timeouts. |
| 💡 **Lesson** | With virtual threads, never do I/O inside `synchronized`, including the hidden lock in `computeIfAbsent`. (JDK 24 removes this pinning, but production runs Java 21.) |

