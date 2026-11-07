# 🔌 API Reference

[← Back to README](../README.md)

| | |
|---|---|
| 🌍 Base URL (production) | `https://arthos-9tro.onrender.com` |
| 🏠 Base URL (local) | `http://localhost:8080` |
| 🔐 Auth | `Authorization: Bearer <JWT>` on every endpoint except `/api/auth/*` and `/api/health` |
| 📦 Format | JSON. Dates are `YYYY-MM-DD`, months `YYYY-MM`, and money is a decimal number in the user's currency. |
| 🧹 Nulls | Omitted from responses |

### ❗ Errors

Every error has the same shape:

```json
{ "status": 400, "message": "Amount must be positive", "fieldErrors": { "amount": "must be greater than 0" }, "timestamp": "2026-11-07T05:12:00Z" }
```

| Status | When |
|---|---|
| 400 | Validation failed, or a rule was broken (e.g. selling more than you held) |
| 401 | Missing or expired token |
| 404 | Not found, **or it belongs to another user** |
| 429 | Too many demo accounts from one IP |

---

## 🔐 Auth

| Method | Path | Body → Response |
|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` → `{token, expiresAt, user}` |
| POST | `/api/auth/login` | `{email, password}` → `{token, expiresAt, user}` |
| GET | `/api/auth/providers` | → `{google: {clientId}}` when Google sign-in is configured |
| POST | `/api/auth/google` | `{idToken}` → `{token, expiresAt, user}`. Finds the account by Google ID, else links one with the same verified email, else creates one. |
| POST | `/api/auth/demo` | → `{token, …}` for a private sandbox (6 months of data, budget, portfolio) that **self-deletes after 24 h**. Max 10 per IP per hour. |

## 👤 User

| Method | Path | Notes |
|---|---|---|
| GET | `/api/users/me` | Profile |
| PATCH | `/api/users/me` | Any of `name`, `currency`, `timezone`, `monthlyIncomeTarget`, `savingsMode` (`PERCENT`/`FIXED`), `savingsValue`, `savingsStartingBalance`, `onboardingCompleted` |

## 💰 Income

| Method | Path | Notes |
|---|---|---|
| GET | `/api/incomes?month=YYYY-MM` | List for the month |
| POST | `/api/incomes` | `{amount, type, date, source?, note?, recurring?}` |
| GET · PUT · DELETE | `/api/incomes/{id}` | |

## 💸 Expenses

| Method | Path | Notes |
|---|---|---|
| GET | `/api/expenses?month=&category=&q=&minAmount=&maxAmount=` | Filtered list; `q` searches merchant and note |
| POST | `/api/expenses` | `{amount, category, date, merchant?, paymentSource?, note?, recurring?}`. A merchant also teaches [smart categories](automation.md#-smart-categories). |
| GET · PUT · DELETE | `/api/expenses/{id}` | |

## 🏠 Summary

| Method | Path | Notes |
|---|---|---|
| GET | `/api/summary?month=YYYY-MM` | Overview payload: totals, saved first, left to spend, savings account, categories, daily series, recent. Fields: [money-model.md](money-model.md#-the-month-summary) |

## 🎯 Budget

| Method | Path | Notes |
|---|---|---|
| GET | `/api/budget?month=YYYY-MM` | Today's allowance, status, week, day-by-day calendar, projection, the other modes compared |
| PUT | `/api/budget?month=YYYY-MM` | `{limit, mode: FIXED_DAILY\|ADAPTIVE_DAILY\|WEEKLY, excludedCategories}`. Carries forward to later months. |
| DELETE | `/api/budget?month=YYYY-MM` | Remove |

Details: [budget.md](budget.md)

## 📈 Investments

| Method | Path | Notes |
|---|---|---|
| GET | `/api/portfolio?range=1M\|3M\|6M\|1Y\|ALL` | Holdings with value, P&L, XIRR, day change; totals, allocation, history (default `1Y`) |
| POST | `/api/holdings` | Create (or **join an existing** holding of the same instrument) with a first lot |
| PUT · DELETE | `/api/holdings/{id}` | Edit details (horizon, manual price, bond fields…) / delete |
| POST | `/api/holdings/{id}/lots` | `{type: BUY\|SELL, date, quantity, price, note?, fundedFrom?: SAVINGS\|SPENDING, fromSavings?}` |
| PUT · DELETE | `/api/holdings/{id}/lots/{lotId}` | Edit/delete a transaction (chronology is checked) |
| GET | `/api/market/search?assetClass=&q=` | Symbol / fund search (≥ 2 chars) |
| GET | `/api/market/quote?assetClass=&symbol=` | Price preview (gold needs no symbol; bonds have no live price) |

Details: [investments.md](investments.md)

## 📸 Automation

| Method | Path | Notes |
|---|---|---|
| POST | `/api/automation/parse` | `{text}` → `{kind, amount, date, merchant, reference, paymentSource, category \| incomeType, confidence, usable}` |
| GET | `/api/automation/category?merchant=` | Suggested category and where it came from (learned / built-in) |
| GET | `/api/automation/recurring` | Recurring candidates not yet marked |
| POST | `/api/automation/recurring` | Mark candidates recurring |

Details: [automation.md](automation.md)

## 💡 Insights

| Method | Path | Notes |
|---|---|---|
| GET | `/api/insights?month=YYYY-MM` | `{month, current, summary[], trends[], anomalies[], leakage, health, alerts[], suggestions[]}` |

Details: [insights.md](insights.md)

## ❤️ Health

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Liveness (used by Render) |
