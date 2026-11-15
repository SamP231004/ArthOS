// Registry of the public, search-facing pages: free calculators and guides. Used by their index pages, the sitemap,
// cross-links and metadata, so a page added here shows up everywhere at once.

export type ToolPage = { slug: string; name: string; title: string; description: string; blurb: string };
export type GuidePage = { slug: string; title: string; description: string; blurb: string; minutes: number; published: string; updated: string; tool?: string };

export const TOOLS: ToolPage[] = [
  {
    slug: "daily-budget-calculator",
    name: "Daily budget calculator",
    title: "Daily budget calculator: how much can I spend today?",
    description:
      "Turn your monthly budget into one safe-to-spend number for today. Enter your budget, what you've spent and today's date — see your fixed and adaptive daily limit instantly.",
    blurb: "Turn a monthly budget into one safe number for today.",
  },
  {
    slug: "50-30-20-calculator",
    name: "50/30/20 budget calculator",
    title: "50/30/20 budget calculator (India, in ₹)",
    description:
      "Split your monthly take-home salary into needs, wants and savings with the 50/30/20 rule — or your own ratio. Free, instant, works in rupees.",
    blurb: "Split your salary into needs, wants and savings.",
  },
  {
    slug: "sip-calculator",
    name: "SIP calculator",
    title: "SIP calculator with annual step-up",
    description:
      "Estimate what a monthly SIP grows to, with an optional yearly step-up. See invested amount, estimated returns and the year-by-year value.",
    blurb: "See what a monthly SIP can grow to, with step-up.",
  },
  {
    slug: "emergency-fund-calculator",
    name: "Emergency fund calculator",
    title: "Emergency fund calculator: how much do you need?",
    description:
      "Work out the right emergency fund for your monthly essentials and job stability, and how long it takes to build at your saving rate.",
    blurb: "How big your safety net should be, and how fast to build it.",
  },
  {
    slug: "savings-goal-calculator",
    name: "Savings goal calculator",
    title: "Savings goal calculator: how much to save each month",
    description:
      "Planning a trip, a bike or a down payment? Find out how much to save every month to reach your goal by a date, with or without returns.",
    blurb: "How much to set aside each month to hit a goal on time.",
  },
];

export const GUIDES: GuidePage[] = [
  {
    slug: "how-to-budget-your-salary",
    title: "How to budget your salary in India: a simple monthly system",
    description:
      "A practical, step-by-step way to budget your monthly salary in India: save first, separate fixed bills, and spend from one daily number instead of guessing.",
    blurb: "A step-by-step monthly system that actually sticks.",
    minutes: 7,
    published: "2026-11-15",
    updated: "2026-11-15",
    tool: "daily-budget-calculator",
  },
  {
    slug: "50-30-20-rule",
    title: "The 50/30/20 rule explained (with Indian salary examples)",
    description:
      "What the 50/30/20 budgeting rule is, how to apply it on an Indian salary, when it doesn't fit (high rent, EMIs, early career) and how to adjust it.",
    blurb: "Needs, wants and savings — and when to bend the rule.",
    minutes: 6,
    published: "2026-11-15",
    updated: "2026-11-15",
    tool: "50-30-20-calculator",
  },
  {
    slug: "pay-yourself-first",
    title: "Pay yourself first: why saving before spending works",
    description:
      "The pay-yourself-first (save-first) method: set savings aside the day income arrives, then spend what's left. Why it works, how much to save, and how to automate it.",
    blurb: "Save the day money arrives, then spend the rest guilt-free.",
    minutes: 5,
    published: "2026-11-15",
    updated: "2026-11-15",
    tool: "savings-goal-calculator",
  },
  {
    slug: "track-upi-expenses",
    title: "How to track UPI expenses without spreadsheets",
    description:
      "UPI makes spending invisible. Here's how to track GPay, PhonePe and Paytm payments with little effort — and what to do with the numbers once you have them.",
    blurb: "Make GPay, PhonePe and Paytm spending visible again.",
    minutes: 5,
    published: "2026-11-15",
    updated: "2026-11-15",
  },
  {
    slug: "what-is-xirr",
    title: "What is XIRR? Your real return on SIPs, explained simply",
    description:
      "Why absolute return and CAGR mislead for SIPs, what XIRR measures, a worked example, and how to read your portfolio's XIRR.",
    blurb: "The one return number that's honest about SIPs.",
    minutes: 6,
    published: "2026-11-15",
    updated: "2026-11-15",
    tool: "sip-calculator",
  },
  {
    slug: "emergency-fund-guide",
    title: "How much emergency fund do you need in India?",
    description:
      "How many months of expenses to keep, what counts as an emergency, where to park the money, and how to build the fund without stalling your investments.",
    blurb: "How many months, where to keep it, and how to build it.",
    minutes: 5,
    published: "2026-11-15",
    updated: "2026-11-15",
    tool: "emergency-fund-calculator",
  },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);
export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
