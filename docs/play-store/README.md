# 🏪 Google Play listing kit

[← Back to README](../../README.md)

Everything needed to publish ArthOS on Google Play: text to paste, graphics to upload, and the answers for each
Play Console form. Package name: **`com.arthos.app`** (permanent once published).

---

## 🖼️ Graphics (in this folder)

| Asset | File | Play's requirement |
|---|---|---|
| App icon | [`icon-512.png`](icon-512.png) | 512 × 512 PNG, full square (Play rounds the corners) |
| Feature graphic | [`feature-graphic.png`](feature-graphic.png) | 1024 × 500 PNG/JPG |
| Phone screenshots | [`screenshots/`](screenshots/): home, budget, investments, insights, expenses, income, widgets | 2–8 images, aspect ratio ≤ 2:1 |

---

## ✍️ Store listing text

**App name** (30 max)
```
ArthOS: Budget & Investments
```

**Short description** (80 max)
```
Save first, spend with one daily number, track investments, get clear insights.
```

**Full description** (4000 max)
```
ArthOS is your personal financial operating system: income, spending, budgets, savings, investments and insights in one calm place. Know what comes in, what goes out, what grows and what remains.

SAVE FIRST, AUTOMATICALLY
• A share of every income goes into your savings account the moment it arrives, and carries forward month after month
• "Left to spend" shows exactly what's yours after saving, spending and investing

ONE NUMBER FOR TODAY
• Turn a monthly budget into one daily number: "Safe to spend today"
• Fixed, adaptive or weekly — overspend one day and the rest of the month quietly adjusts
• Rent and EMIs stay out of your daily number
• A day-by-day calendar and a step-by-step explanation of how today's number is worked out

INVESTMENTS AT LIVE PRICES
• Stocks and ETFs (NSE/BSE), mutual funds (AMFI NAVs), gold (24K/22K, digital, physical, SGB) and bonds
• 1-day and total returns, XIRR, realised profit, allocation, and value vs invested over time
• Pay for each investment from savings, from spending, or split between them

IMPORT FROM YOUR BROKER — NO TYPING
• Bring in your holdings or tradebook from Zerodha, Groww, Upstox, Angel One and others, or your CAS for every mutual fund
• The file is read on your phone and never uploaded; only the holdings you confirm are saved

SCAN & SHARE
• Share a payment screenshot from GPay, PhonePe, Paytm or your bank app to ArthOS — amount, merchant, date and category fill themselves in
• Text is read on your phone; the image is never uploaded
• Smart categories learn from you; recurring bills are spotted automatically

INSIGHTS THAT EXPLAIN THEMSELVES
• Your month in plain words, a 100-point financial health score broken into five parts, unusual spending and subscriptions that add up
• No AI and no data sent to third parties — just clear rules

ON YOUR HOME SCREEN
• Widgets: safe to spend today, your month, your portfolio and quick add — tap the eye to hide amounts
• A pinned alert when you're over budget, and bill reminders on the due date

PRIVATE BY DESIGN
• No bank or broker logins, no SMS reading, no ads, no trackers
• Delete your account and all data anytime, in the app

One account for the app and the website (os-arth.vercel.app). Try the private demo with six months of sample data — no sign-up needed.
```

**Release notes** (first release)
```
Welcome to ArthOS 1.0 — save first, one daily budget number, live investments, broker import, screenshot scanning, insights, widgets and alerts.
```

| Field | Value |
|---|---|
| Category | **Finance** |
| Tags | Budget, Personal finance, Expense tracker, Investments |
| Contact email | samp231004@gmail.com |
| Website | https://os-arth.vercel.app |
| Privacy policy | **https://os-arth.vercel.app/privacy** |

---

## 📋 App content (Policy → App content)

| Form | Answer |
|---|---|
| **Privacy policy** | https://os-arth.vercel.app/privacy |
| **App access** | "All or some functionality is restricted" → add instructions: *"Tap 'Just looking? Explore the demo' on the sign-in screen for a full account with sample data — no credentials needed."* (Optionally also give a test email/password you create.) |
| **Ads** | No, the app has no ads |
| **Content rating** | Questionnaire → category *Utility, productivity, communication or other*; answer **No** to violence, sexuality, language, drugs, gambling, user-generated sharing. Expected rating: *Everyone / 3+* |
| **Target audience** | 18 and over |
| **News app** | No |
| **Health apps** | No |
| **Government app** | No |
| **Financial features** | Personal finance / **budgeting and expense tracking**, investment **tracking**. It does **not** lend, trade, process payments, hold money or give regulated financial advice. |
| **Account deletion** | Yes, users can create accounts. In-app: Settings → Delete account. Web link: **https://os-arth.vercel.app/delete-account** |

### 🔐 Data safety

| Question | Answer |
|---|---|
| Collects or shares user data? | **Collects: Yes · Shares: No** |
| Encrypted in transit? | **Yes** (HTTPS) |
| Users can request deletion? | **Yes** (in-app and via the web page) |

| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Personal info → **Name** | Yes | Account management, app functionality | Required |
| Personal info → **Email address** | Yes | Account management | Required |
| Personal info → **User IDs** (Google sign-in ID) | Yes, if Google sign-in is used | Account management | Optional |
| Financial info → **Other financial info** (income, expenses, budgets, investments you enter) | Yes | App functionality | Required for the app to work |
| App info & performance, location, contacts, photos, messages, device IDs | **No** | — | — |

> 📸 Screenshots and broker files are processed **on the device** and never sent, so photos and files are **not** collected.
> Notifications and widgets are local to the phone.

---

## 🚀 Release steps

1. **Build the bundle:** push a tag (`git tag v1.0.0 && git push origin v1.0.0`) or run **Actions → Android AAB (Play Store) → Run workflow**, then download `ArthOS.aab` from the run's artifacts.
2. **Internal testing:** Test and release → Internal testing → Create release → upload the AAB (the first upload must be manual) → add yourself → install from the Play link.
3. **Google sign-in for Play builds:** Play re-signs the app, so copy the **App signing key SHA-1** (Test and release → App integrity) and add an **Android OAuth client** for `com.arthos.app` with it in Google Cloud (same project; keep the existing one for the GitHub APK).
4. **Closed testing** (new personal accounts): at least **12 testers, opted in for 14 consecutive days**, then apply for production access.
5. **Production:** create the release from the tested build, staged rollout (e.g. 20% → 100%).

Each new release: bump `version` in `app/app.json` (e.g. 1.0.1), push a new tag, upload the new AAB. The version code increases automatically.
