import Link from "next/link";
import {
  DailyBudgetCalculator,
  EmergencyFundCalculator,
  FiftyThirtyTwentyCalculator,
  SavingsGoalCalculator,
  SipCalculator,
} from "@/components/tools/calculators";

// What each calculator page shows besides the widget: a plain explanation and FAQs (also emitted as FAQPage data).

type Faq = { q: string; a: string };
export type ToolContent = { Calculator: () => React.ReactNode; intro: string; Body: () => React.ReactNode; faq: Faq[]; guide?: string };

export const TOOL_CONTENT: Record<string, ToolContent> = {
  "daily-budget-calculator": {
    Calculator: DailyBudgetCalculator,
    intro: "A monthly budget is easy to set and hard to follow — nobody knows on the 12th whether a ₹600 dinner is fine. This calculator turns the month into one number: what you can safely spend today.",
    guide: "how-to-budget-your-salary",
    Body: () => (
      <>
        <h2>How the daily budget is worked out</h2>
        <p>There are two ways to turn a monthly budget into a daily one:</p>
        <ul>
          <li>
            <strong>Fixed daily limit</strong> = monthly budget ÷ days in the month. A ₹30,000 budget in a 30-day month is ₹1,000 a day, every day. Simple, but
            it ignores what already happened: overspend on Saturday and Sunday still says ₹1,000.
          </li>
          <li>
            <strong>Adaptive daily limit</strong> = what&apos;s left ÷ days left (including today). Spend ₹14,000 by the 12th of a 30-day month and you have
            ₹16,000 for 19 days — about ₹842 a day. Underspend and the number rises; overspend and it quietly shrinks, so you still finish on budget.
          </li>
        </ul>
        <p>
          The adaptive number is the honest one: it always answers &ldquo;if I want to end the month on budget, how much can I spend today?&rdquo;
        </p>
        <h2>Why fixed bills stay out</h2>
        <p>
          Rent, EMIs, insurance premiums and school fees are paid once and can&apos;t be trimmed day to day. Counting them in a daily number makes the 1st look
          like a disaster and the 2nd look rich. Set them aside, and budget only the flexible money — food, travel, shopping, fun.
        </p>
        <h2>Make it automatic</h2>
        <p>
          <Link href="/">ArthOS</Link> does this every day on its own: it keeps rent and EMIs out, recalculates after every expense, shows a day-by-day
          calendar and puts &ldquo;safe to spend today&rdquo; on your home screen as a widget.
        </p>
      </>
    ),
    faq: [
      { q: "How do I calculate my daily budget?", a: "Divide what's left of your monthly spending budget by the number of days left in the month, counting today. For example ₹16,000 left with 19 days to go is about ₹842 a day." },
      { q: "Should rent and EMIs be part of my daily budget?", a: "No. Fixed bills are paid once a month and can't be adjusted day to day, so subtract them first and build the daily number only from flexible spending." },
      { q: "What is the difference between a fixed and an adaptive daily budget?", a: "A fixed budget is the monthly amount divided evenly across all days. An adaptive budget divides what's left by the days left, so overspending lowers future days and underspending raises them." },
      { q: "Is my data saved anywhere?", a: "No. The calculator runs entirely in your browser; nothing you type is sent or stored." },
    ],
  },

  "50-30-20-calculator": {
    Calculator: FiftyThirtyTwentyCalculator,
    intro: "The 50/30/20 rule splits take-home pay into needs, wants and savings. Enter your salary to see the split in rupees — or pick a ratio that fits high rent or an aggressive savings goal.",
    guide: "50-30-20-rule",
    Body: () => (
      <>
        <h2>What goes where</h2>
        <table>
          <thead>
            <tr><th>Bucket</th><th>Share</th><th>Examples</th></tr>
          </thead>
          <tbody>
            <tr><td>Needs</td><td>50%</td><td>Rent, groceries, electricity, phone, commute, EMIs, insurance</td></tr>
            <tr><td>Wants</td><td>30%</td><td>Swiggy and Zomato, shopping, OTT subscriptions, weekend trips</td></tr>
            <tr><td>Savings</td><td>20%</td><td>SIPs, PPF, emergency fund, goal savings, extra loan repayment</td></tr>
          </tbody>
        </table>
        <h2>When to change the ratio</h2>
        <ul>
          <li><strong>Metro rent eats your salary</strong> — try 60/20/20 and protect the 20% savings first.</li>
          <li><strong>Early career</strong> — 70/20/10 is a fine start; raise savings by 2–5 points with every hike.</li>
          <li><strong>Living with family or high income</strong> — 40/30/30 or more savings gets you to goals years sooner.</li>
        </ul>
        <p>
          The one rule that matters more than the exact split: <strong>move the savings part out the day salary arrives</strong>, then spend the rest. Read
          more in <Link href="/guides/pay-yourself-first">Pay yourself first</Link>.
        </p>
      </>
    ),
    faq: [
      { q: "What is the 50/30/20 rule?", a: "A budgeting guideline that puts 50% of take-home pay toward needs, 30% toward wants and 20% toward savings and investments." },
      { q: "Is the 50/30/20 rule based on gross or net salary?", a: "On take-home (net) pay — the amount credited to your bank after tax, PF and other deductions." },
      { q: "Do EMIs count as needs or savings?", a: "The minimum EMI is a need. Extra prepayments beyond the EMI can count toward the savings bucket." },
      { q: "What if my needs are more than 50%?", a: "Use a 60/20/20 or 70/20/10 split for now, keep savings fixed, and trim wants first. Revisit the ratio after each salary hike." },
    ],
  },

  "sip-calculator": {
    Calculator: SipCalculator,
    intro: "Estimate how a monthly SIP in a mutual fund could grow, including a yearly step-up as your salary rises. See what you invest, what growth adds and the value year by year.",
    guide: "what-is-xirr",
    Body: () => (
      <>
        <h2>How this SIP calculator works</h2>
        <p>
          Each month&apos;s instalment is invested at the start of the month and grows at the expected yearly return, compounded monthly (yearly return ÷ 12
          each month). With a step-up, the instalment rises by that percentage at the start of every new year. This matches how most fund-house calculators
          estimate SIP value.
        </p>
        <h2>Why step-up matters</h2>
        <p>
          A ₹10,000 SIP for 15 years at 12% grows to roughly ₹50 lakh. Raising it 10% every year — usually less than an annual hike — takes it to about
          ₹87 lakh. The extra money goes in later, but those years still compound.
        </p>
        <h2>Read the result carefully</h2>
        <ul>
          <li>Returns are an assumption. Equity funds swing year to year; the long-run average is what this models.</li>
          <li>&ldquo;In today&apos;s money&rdquo; divides by 6% inflation a year, so you can judge what the amount will actually buy.</li>
          <li>To measure what your existing SIPs really earned, use <Link href="/guides/what-is-xirr">XIRR</Link>, not absolute return.</li>
        </ul>
        <p>
          <Link href="/">ArthOS</Link> tracks your real SIPs and funds at live AMFI NAVs and calculates their XIRR for you — or import them from your CAS in one
          step.
        </p>
      </>
    ),
    faq: [
      { q: "How is SIP return calculated?", a: "Each instalment compounds from the month it's invested. This calculator uses monthly compounding at the yearly rate divided by 12, with instalments at the start of each month." },
      { q: "What is a step-up SIP?", a: "A SIP whose instalment increases by a fixed percentage every year, usually in line with salary hikes. It can grow the final corpus far more than a flat SIP." },
      { q: "What return should I assume for a SIP?", a: "Many investors use 10–12% a year for diversified equity funds over long periods and 6–8% for debt funds. Returns are never guaranteed, so test lower numbers too." },
      { q: "Are SIP calculator results guaranteed?", a: "No. They are estimates based on a constant return; actual returns vary with the market." },
    ],
  },

  "emergency-fund-calculator": {
    Calculator: EmergencyFundCalculator,
    intro: "An emergency fund covers job loss, a medical bill or an urgent trip without breaking your investments or borrowing. Work out how much you need and how long it will take to build.",
    guide: "emergency-fund-guide",
    Body: () => (
      <>
        <h2>How much is enough</h2>
        <table>
          <thead>
            <tr><th>Situation</th><th>Cover</th></tr>
          </thead>
          <tbody>
            <tr><td>Stable salaried job, no dependents</td><td>6 months of essentials</td></tr>
            <tr><td>Single income supporting a family</td><td>9 months</td></tr>
            <tr><td>Freelance, business or commission income</td><td>12 months</td></tr>
          </tbody>
        </table>
        <p>
          Count only <strong>essentials</strong> — what you&apos;d still pay if income stopped tomorrow. Eating out and shopping drop to near zero in a real
          emergency, so they don&apos;t belong in the target.
        </p>
        <h2>Where to keep it</h2>
        <p>
          It must be safe and quick to reach: a savings account for a month or two of expenses, and the rest in a sweep-in FD or a liquid fund. Not in stocks
          or equity funds — they can be down exactly when you need the money.
        </p>
        <p>
          More detail in <Link href="/guides/emergency-fund-guide">How much emergency fund do you need?</Link>
        </p>
      </>
    ),
    faq: [
      { q: "How many months of emergency fund should I have?", a: "Six months of essential expenses is a common baseline for a stable job. Families on one income and freelancers should aim for 9–12 months." },
      { q: "Where should I keep my emergency fund in India?", a: "In safe, liquid places: a savings account for immediate needs, and a sweep-in FD or liquid mutual fund for the rest." },
      { q: "Should I invest before building an emergency fund?", a: "Build at least two or three months of cover first, then split new savings between the fund and investments until it is complete." },
    ],
  },

  "savings-goal-calculator": {
    Calculator: SavingsGoalCalculator,
    intro: "Turn a goal into a monthly number. Enter the amount, the deadline and what you've already saved to see exactly how much to put aside each month.",
    guide: "pay-yourself-first",
    Body: () => (
      <>
        <h2>How it&apos;s calculated</h2>
        <p>
          Without returns, it&apos;s simply (goal − already saved) ÷ months. With interest, each monthly deposit and your existing savings grow until the
          deadline, so you need to put in a little less — the calculator solves for that monthly amount, assuming deposits at the start of each month.
        </p>
        <h2>Pick the right place for the money</h2>
        <ul>
          <li><strong>Under a year:</strong> savings account or a recurring deposit. Safety beats return.</li>
          <li><strong>1–3 years:</strong> FD, RD or a debt fund.</li>
          <li><strong>5+ years:</strong> equity mutual funds can make sense — see the <Link href="/tools/sip-calculator">SIP calculator</Link>.</li>
        </ul>
        <h2>Make the number stick</h2>
        <p>
          Treat the monthly amount as a bill you pay yourself on salary day. <Link href="/">ArthOS</Link> sets savings aside first, automatically, the moment
          income arrives — so goal money is gone before it can be spent.
        </p>
      </>
    ),
    faq: [
      { q: "How much should I save per month to reach my goal?", a: "Subtract what you've already saved from the goal and divide by the number of months left. If the money earns interest you need slightly less each month." },
      { q: "Where should I keep money for a short-term goal?", a: "For goals under a year, use a savings account or recurring deposit. For 1–3 years, FDs or debt funds. Equity suits goals five or more years away." },
      { q: "Does this calculator store my information?", a: "No. Everything is calculated in your browser and nothing is sent." },
    ],
  },
};
