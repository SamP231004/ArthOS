# 🎯 Budget Engine

[← Back to README](../README.md)

A monthly limit like "₹30,000" is hard to act on, so the budget engine turns it into **one simple daily number**:

> ### *"Safe to spend today: ₹842"*

Logic: [`BudgetCalculator`](../backend/src/main/java/com/arthos/budget/BudgetCalculator.java), a pure function over
the month's expenses, tested in [`BudgetCalculatorTest`](../backend/src/test/java/com/arthos/budget/BudgetCalculatorTest.java).

---

## 🧭 Three modes

| Mode | Daily allowance | Best for |
|---|---|---|
| 🧱 **Fixed daily** | `limit ÷ days in month`, the same every day | Strict discipline |
| 🌊 **Adaptive daily** | `(limit − spent before today) ÷ days remaining` | Spending that varies day to day |
| 📆 **Weekly** | Each week gets `limit × days in week ÷ days in month`; within a week the daily guide adapts | People who think in weeks |

The Budget screen also shows what **today's** number would be under each of the other modes, so you can compare before switching.

---

## 🧮 How each mode works

### 🧱 Fixed daily

```text
allowance(every day) = limit ÷ days in month
```

₹30,000 in a 30-day month gives **₹1,000 every day**. Overspending one day doesn't change tomorrow; it shows up as days marked over.

### 🌊 Adaptive daily

```text
allowance(day d) = (limit − spent before day d) ÷ days remaining from d     (never negative)
```

Spending less lifts every later day; spending more lowers them. Example with ₹30,000 over 30 days:

| Day | Allowance | Spent | Effect |
|---|---|---|---|
| 1 | 30,000 ÷ 30 = **₹1,000** | ₹400 | ₹600 saved |
| 2 | 29,600 ÷ 29 = **₹1,020** | ₹2,500 | overspent |
| 3 | 27,100 ÷ 28 = **₹967** | … | the overspend is spread across the remaining 28 days |

### 📆 Weekly

Weeks are days **1–7, 8–14, 15–21, 22–28, 29–end**. Each week's share is proportional to its length:

```text
week allowance = limit × (days in week ÷ days in month)
```

Inside a week, the daily guide adapts the same way as adaptive mode, but only within that week.

---

## 🧾 Fixed costs are excluded

Rent and EMIs aren't day-to-day decisions, so **expenses in excluded categories never count against the allowance**.
The default exclusions are `RENT` and `EMI`, and you can choose others when setting the budget.

---

## 🚦 Status & warnings

| Status | Meaning | Shown as |
|---|---|---|
| 🟢 `ON_TRACK` | Comfortably within today's (or this week's) allowance | Green |
| 🟡 `CAUTION` | 80–100% of the current period used | Amber warning |
| 🔴 `OVER` | Over today's/this week's allowance | Red warning |
| ⛔ `OVER_MONTH` | Monthly limit already exceeded | Red banner + [alert](insights.md#-alerts) |
| ⏳ `UPCOMING` | A future month | — |
| ✅ `COMPLETED` | A past month finished within its limit | — |

### 📅 Calendar history

Every day of the month is coloured: **UNDER** · **NEAR** (≥80%) · **OVER** · **TODAY** · **FUTURE**. Tap a day to see what was spent versus that day's allowance.

### 🔮 Projection

```text
projected spend = spent so far ÷ days elapsed × days in month
```

Insights uses the projection for the *"on pace to overspend"* alert and the budget part of the [health score](insights.md#-financial-health-score-out-of-100).

---

## 📌 Other rules

| Rule | Why |
|---|---|
| ⬇️ Allowances **round down** to the paisa | The guidance is never generous because of rounding. |
| ➡️ A budget **carries forward** | Set it once and later months inherit it until you change it. |
| 🗣️ **"How is this calculated?"** | The web and app explain today's number step by step. |
