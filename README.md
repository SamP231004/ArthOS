# ArthOS — Take Control of Your अर्थ

ArthOS is a personal financial operating system that tracks income, expenses, budgets, investments and net worth in one place.
Users get it two ways, the **Android app** and the **website**, and both use the **same backend and account**.

```
ArthOS/
├── backend/   Spring Boot 3.5 · Java 21 · MongoDB · JWT     → deploy as Docker (Render / Railway / Fly)
├── web/       Next.js 16 · React 19 · Tailwind v4           → deploy on Vercel (Root Directory = web)
├── app/       Expo SDK 58 · React Native · Expo Router      → build with EAS (Android first)
└── ArthOS_Detailed_Product_Blueprint.docx                   → product spec
```

Each folder is independent, with its own dependencies, env file and deploy target.

## Phase 1 — Foundation (this release)

| Area | Backend | Web | App |
|---|---|---|---|
| Register / login (JWT) | ✅ | ✅ | ✅ (token in SecureStore) |
| First-run onboarding (income target, currency, timezone) | ✅ | ✅ | ✅ |
| Income CRUD (types, recurring flag, notes) | ✅ | ✅ | ✅ |
| Expense CRUD (category, merchant, payment source, recurring) | ✅ | ✅ | ✅ |
| Expense search & category filter | ✅ | ✅ | ✅ |
| Month summary dashboard (totals, savings rate, category split, daily spend, recent) | ✅ | ✅ | ✅ |
| Marketing landing page | — | ✅ | — |

Data is grouped by month: every income or expense stores a `monthKey` (`YYYY-MM`) with an index on `{userId, monthKey, date}`.
Money is stored as `Decimal128`.

## Phase 2 — Budget engine (this release)

| Area | Backend | Web | App |
|---|---|---|---|
| Fixed daily, adaptive daily and weekly modes | ✅ | ✅ | ✅ |
| Fixed costs excluded from the allowance (default: Rent, EMI) | ✅ | ✅ | ✅ |
| Safe to spend today, month remaining, projection, week view | ✅ | ✅ | ✅ |
| Warnings (80% caution, over today, over month) | ✅ | ✅ | ✅ |
| Day-by-day calendar history | ✅ | ✅ | ✅ |
| Step-by-step explanation of today's number | — | ✅ | ✅ |

A budget is set once and carries forward to later months until changed. The engine is pure and unit-tested in
[`BudgetCalculator`](backend/src/main/java/com/arthos/budget/BudgetCalculator.java).

## Phase 3 — Investments (this release)

Stocks & ETFs (NSE/BSE via Yahoo Finance), mutual funds (AMFI NAVs via mfapi.in), gold (COMEX spot × USD/INR, per gram,
24K/22K, digital/physical/SGB) and bonds (coupon, maturity, manual or face-value pricing). Holdings keep dated buy/sell
lots, so the engine computes average-cost P&L, realised gains, day change, per-holding and portfolio XIRR, allocation by
class and horizon, and a value-vs-invested history. Price providers sit behind a swappable interface with a Mongo-backed
cache and a 15-minute refresh job. APIs: `/api/portfolio`, `/api/holdings` (+ `/lots`), `/api/market/search|quote`.

## Run locally

**1. Backend** (needs MongoDB: local, Docker, or a free Atlas cluster)

```bash
cd backend
# optional: export MONGODB_URI=mongodb+srv://...   (defaults to mongodb://localhost:27017/arthos)
mvn spring-boot:run          # http://localhost:8080/api/health
mvn test                     # unit + web-layer tests (no DB needed)
```

**2. Web**

```bash
cd web
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8080
npm install && npm run dev   # http://localhost:3000
```

**3. App**

```bash
cd app
cp .env.example .env         # EXPO_PUBLIC_API_URL (10.0.2.2 = host from Android emulator)
npm install && npx expo start --android
```

## API (v1)

All endpoints except `/api/auth/*` and `/api/health` need `Authorization: Bearer <token>`.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` → `{token, expiresAt, user}` |
| POST | `/api/auth/login` | `{email, password}` → `{token, expiresAt, user}` |
| GET / PATCH | `/api/users/me` | profile, `monthlyIncomeTarget`, `onboardingCompleted` |
| GET / POST | `/api/incomes?month=YYYY-MM` | list for month / create |
| GET / PUT / DELETE | `/api/incomes/{id}` | |
| GET / POST | `/api/expenses?month=&category=&q=&minAmount=&maxAmount=` | filtered list / create |
| GET / PUT / DELETE | `/api/expenses/{id}` | |
| GET | `/api/summary?month=YYYY-MM` | dashboard payload |
| GET / PUT / DELETE | `/api/budget?month=YYYY-MM` | budget status (safe-to-spend today, week, day-by-day calendar); PUT `{limit, mode, excludedCategories}` |
| POST | `/api/auth/demo` | private demo sandbox (3 months of data + budget), self-deletes after 24h |
| GET | `/api/health` | liveness |

Errors always use the same shape: `{status, message, fieldErrors?, timestamp}`.

## Deploy

### Backend → Render (or any Docker host)

Vercel can't run Spring Boot because it has no Java runtime, so the backend ships as a Docker image.

- **Render:** *New → Blueprint* picks up [`render.yaml`](render.yaml), which builds only `backend/`. Set `MONGODB_URI` and `CORS_ALLOWED_ORIGINS`; `JWT_SECRET` is generated for you.
- **Railway / Fly.io / Cloud Run:** point the service at `backend/` and use its `Dockerfile`. The service must listen on `$PORT`.

| Env var | Required | Example |
|---|---|---|
| `MONGODB_URI` | ✅ | `mongodb+srv://user:pass@cluster.mongodb.net/arthos` |
| `JWT_SECRET` | ✅ | 32+ random chars (`openssl rand -base64 48`) |
| `CORS_ALLOWED_ORIGINS` | ✅ | `https://arthos.vercel.app,https://*.vercel.app` |
| `JWT_EXPIRY_HOURS` | | `168` (7 days) |

### Web → Vercel

1. *Add New Project* → import this repo → set **Root Directory** to `web` (Next.js is auto-detected).
2. Add env var `NEXT_PUBLIC_API_URL` = your backend URL.
3. Add the Vercel domain to the backend's `CORS_ALLOWED_ORIGINS`.

### App → EAS

```bash
cd app
npx eas-cli@latest build --platform android --profile preview
```

Set `EXPO_PUBLIC_API_URL` to the production backend URL first, either in `.env` or in the EAS environment variables.

## Roadmap

~~Phase 2 Budget engine~~ ✅ → ~~3 Investments~~ ✅ → 4 OCR automation → 5 Insights → 6 Widgets → 7 AI assistant → 8 Scale.
See the blueprint for details.
