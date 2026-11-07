# 🎨 Design System

[← Back to README](../README.md)

ArthOS aims to feel **premium, calm and practical**, like a control panel rather than a spreadsheet. The website and
the app share one design language, and **the app mirrors the web**: same palette, wording, sections and order.

---

## 🌗 Two themes

Switch with the **☀️ / 🌙** button in the header. On Android the change is a smooth circular reveal from the button.

| | 🌲 **Forest** (dark, default) | 🕊️ **Ivory** (light) |
|---|---|---|
| Background | `#06110C` forest | `#F6F4EF` paper |
| Text | `#F2EFE8` ivory | `#171717` charcoal |
| Brand accent | `#EC7A74` crimson-rose | `#1D5A44` forest green |
| 🟢 Income / good | `#4CC38A` | `#16794C` |
| 🔴 Expense / danger | `#F07167` | `#B42318` |
| 🟡 Warning | `#E8B45C` | `#A86B12` |
| 🔵 Info | `#84B6D8` | `#2C6E9B` |

Base palette: **Forest Green `#06110C` · Charcoal `#171717` · Crimson `#A31C1B`**.

Colours are **tokens**: CSS variables on the web (Tailwind v4) and a `palettes` object in the app
([`app/src/theme`](../app/src/theme/index.tsx)). Components never hard-code a hex value, so both themes stay consistent.

---

## 🔤 Typography

| Role | Font | Used for |
|---|---|---|
| 🖋️ Display | **Newsreader** (serif) | Page titles, hero numbers |
| 🧩 UI | **Manrope** | Labels, body, buttons |
| 🔢 Numbers | **IBM Plex Mono** / tabular figures | Amounts that line up in lists |
| 🪷 Wordmark | **Tiro Devanagari Hindi** | अर्थ in *"Take Control of Your अर्थ"* |

---

## 🧭 Navigation

| Platform | Pattern |
|---|---|
| 🖥️ Web (desktop) | Left sidebar: Overview · Income · Expenses · Budget · Investments · Insights, with Settings at the bottom |
| 📱 Web (mobile) and 🤖 app | A **dial**: a rotating tab selector at the bottom. Tap or spin to switch between Home · Income · Expenses · Budget · Invest · Insights |

---

## 🧱 Patterns

| Pattern | Where |
|---|---|
| 📋 **Groww-style lists** | Clean rows with a name and subtitle on the left and the amount on the right; used for transactions and holdings in the app |
| 🃏 **Cards** with an optional glow | Summary blocks; the glow marks the most important card on a screen |
| 📅 **Month picker** | Every money screen is per month |
| 🗣️ **Explainers** | "How is this calculated?" on Budget; tap-to-expand components on the health score |
| 🏷️ **Top-3 chips** | Category filters show the top 3 categories in one row, not a crowded grid |
| 🚦 **Semantic colour** | Green = income/good, red = expense/danger, amber = caution, blue = info |
| 🔢 **₹ en-IN formatting** | ₹1,23,456 grouping everywhere |

---

## 🖼️ Assets

| Asset | Location |
|---|---|
| App icon, adaptive icon, monochrome icon | [`app/assets/images`](../app/assets/images) |
| Tab icons (@1x/@2x/@3x) | [`app/assets/images/tabIcons`](../app/assets/images/tabIcons) |
| Web icon | [`web/src/app/icon.svg`](../web/src/app/icon.svg) |
| Product screenshots | [`docs/images`](images/) *(coming soon)* |
