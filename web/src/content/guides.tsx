import Link from "next/link";

// Long-form guides behind /guides/*. Plain, accurate, India-specific; each links to its calculator and to ArthOS.

type Faq = { q: string; a: string };
export type GuideContent = { Body: () => React.ReactNode; faq: Faq[] };

export const GUIDE_CONTENT: Record<string, GuideContent> = {
  "how-to-budget-your-salary": {
    Body: () => (
      <>
        <p>
          Most budgets fail for the same reason: they ask you to track forty categories and remember them every time you pay. Here is a simpler system that
          works on any Indian salary, whether it&apos;s ₹25,000 or ₹2,50,000 a month. It has four steps, and only one number to watch day to day.
        </p>

        <h2>Step 1: Start from take-home pay</h2>
        <p>
          Budget with what actually lands in your account after TDS, PF, professional tax and any salary deductions — not your CTC. If your income varies
          (freelance, incentives), use the lowest month of the last six as your base and treat anything above it as a bonus.
        </p>

        <h2>Step 2: Save first, the day salary arrives</h2>
        <p>
          Decide a savings share — 20% is a good default, 10% if you&apos;re starting out — and move it out on salary day: SIPs, RD, PPF or a separate savings
          account. What&apos;s saved first doesn&apos;t compete with the rest of the month. This is the{" "}
          <Link href="/guides/pay-yourself-first">pay-yourself-first</Link> method, and it does more for your savings than any amount of tracking.
        </p>

        <h2>Step 3: Take fixed bills off the top</h2>
        <p>List everything that is the same, or nearly the same, every month:</p>
        <ul>
          <li>Rent or home-loan EMI, other EMIs</li>
          <li>Electricity, gas, water, broadband, mobile</li>
          <li>Insurance premiums (spread annual ones over twelve months)</li>
          <li>School fees, domestic help, society maintenance</li>
          <li>Subscriptions you&apos;re keeping</li>
        </ul>
        <p>
          These aren&apos;t decisions you make day to day, so they shouldn&apos;t sit in the money you &ldquo;spend&rdquo;. Subtract them once.
        </p>

        <h2>Step 4: Spend from one daily number</h2>
        <p>What remains is your flexible money: food, groceries, travel, shopping, fun. Turn it into a daily figure:</p>
        <table>
          <thead>
            <tr><th>Example</th><th>Per month</th></tr>
          </thead>
          <tbody>
            <tr><td>Take-home salary</td><td>₹75,000</td></tr>
            <tr><td>Save first (20%)</td><td>− ₹15,000</td></tr>
            <tr><td>Rent, EMIs, bills, insurance</td><td>− ₹30,000</td></tr>
            <tr><td>Flexible spending budget</td><td>₹30,000</td></tr>
            <tr><td>Per day (30-day month)</td><td>₹1,000</td></tr>
          </tbody>
        </table>
        <p>
          Better still, recalculate it daily as <strong>what&apos;s left ÷ days left</strong>. Overspend on a weekend and the next days shrink a little;
          have a quiet week and they grow. You always know what today can take, and you finish the month on budget without a spreadsheet. Try it with the{" "}
          <Link href="/tools/daily-budget-calculator">daily budget calculator</Link>.
        </p>

        <h2>Review once a month, not every day</h2>
        <p>At month-end, spend ten minutes on three questions:</p>
        <ol>
          <li>Did I save what I planned? If not, what got in the way?</li>
          <li>Which category grew most compared with last month?</li>
          <li>Is there a subscription or habit I&apos;d happily drop?</li>
        </ol>
        <p>Raise your savings share by a few points after every hike, before your lifestyle catches up.</p>

        <h2>Doing it automatically</h2>
        <p>
          <Link href="/">ArthOS</Link> is built around exactly this system: it sets savings aside first when income is added, keeps rent and EMIs out of your
          daily number, recalculates &ldquo;safe to spend today&rdquo; after every expense and explains, in plain words, how your month went. Share a GPay or
          PhonePe screenshot and the expense fills itself in.
        </p>
      </>
    ),
    faq: [
      { q: "How should I divide my salary every month?", a: "Save a fixed share first (10–20% or more), subtract fixed bills like rent and EMIs, and spend the rest from a daily allowance that you recalculate as the month goes on." },
      { q: "How much of my salary should I save in India?", a: "Aim for at least 20% of take-home pay. If that's not possible yet, start at 10% and increase it by a few points with each salary hike." },
      { q: "Should I budget on CTC or in-hand salary?", a: "Always on in-hand (take-home) salary — the amount credited after tax, PF and other deductions." },
    ],
  },

  "50-30-20-rule": {
    Body: () => (
      <>
        <p>
          The 50/30/20 rule is the most popular budgeting rule of thumb, popularised by US senator Elizabeth Warren. It splits your take-home pay into three
          buckets — and it&apos;s useful in India too, as long as you know when to bend it.
        </p>

        <h2>The rule in one line</h2>
        <ul>
          <li><strong>50% needs</strong> — things you must pay to live and work.</li>
          <li><strong>30% wants</strong> — things that make life better but could be cut.</li>
          <li><strong>20% savings</strong> — investments, emergency fund, goals, extra debt repayment.</li>
        </ul>

        <h2>Examples on Indian salaries</h2>
        <table>
          <thead>
            <tr><th>Take-home</th><th>Needs (50%)</th><th>Wants (30%)</th><th>Savings (20%)</th></tr>
          </thead>
          <tbody>
            <tr><td>₹30,000</td><td>₹15,000</td><td>₹9,000</td><td>₹6,000</td></tr>
            <tr><td>₹60,000</td><td>₹30,000</td><td>₹18,000</td><td>₹12,000</td></tr>
            <tr><td>₹1,00,000</td><td>₹50,000</td><td>₹30,000</td><td>₹20,000</td></tr>
            <tr><td>₹2,00,000</td><td>₹1,00,000</td><td>₹60,000</td><td>₹40,000</td></tr>
          </tbody>
        </table>
        <p>
          Plug in your own salary with the <Link href="/tools/50-30-20-calculator">50/30/20 calculator</Link>.
        </p>

        <h2>Needs vs wants: the grey areas</h2>
        <ul>
          <li><strong>Groceries</strong> are a need; ordering in every night is a want.</li>
          <li><strong>A phone plan</strong> is a need; the upgrade every year is a want.</li>
          <li><strong>EMIs</strong> are needs once you&apos;ve signed up — which is why taking a new one deserves a pause.</li>
          <li><strong>Supporting parents</strong> is a need for many Indian households. Count it there, honestly.</li>
        </ul>

        <h2>When 50/30/20 doesn&apos;t fit</h2>
        <h3>High metro rent</h3>
        <p>
          In Mumbai, Bengaluru or Gurugram, rent alone can be 35–40% of an early-career salary. Use 60/20/20: let needs take more, squeeze wants, and keep
          savings at 20%.
        </p>
        <h3>First job or a big EMI</h3>
        <p>70/20/10 is a fine starting point. The habit of saving something every month matters more than the percentage.</p>
        <h3>Living with family, or a high income</h3>
        <p>
          If your needs are low, 50% is too generous. Push savings to 30–40% — 40/30/30 reaches a ₹1 crore corpus years sooner than 50/30/20.
        </p>

        <h2>Make the rule automatic</h2>
        <p>
          The split only works if the savings part leaves your account first. Set SIPs and transfers for the day after salary day, and spend the rest — see{" "}
          <Link href="/guides/pay-yourself-first">Pay yourself first</Link>. <Link href="/">ArthOS</Link> lets you set a save-first percentage once and
          applies it to every income automatically.
        </p>
      </>
    ),
    faq: [
      { q: "Does the 50/30/20 rule work in India?", a: "Yes, as a starting point. In high-rent cities a 60/20/20 split is often more realistic; people with low expenses should save more than 20%." },
      { q: "Is the 50/30/20 rule based on gross or net income?", a: "On net (take-home) income — what is credited to your account after tax and deductions." },
      { q: "Are investments part of the 20%?", a: "Yes. SIPs, PPF, NPS contributions you make yourself, emergency fund deposits and extra loan prepayments all count as savings." },
    ],
  },

  "pay-yourself-first": {
    Body: () => (
      <>
        <p>
          Most people save what&apos;s left at the end of the month. Usually that&apos;s nothing. <strong>Pay yourself first</strong> flips the order: the
          moment income arrives, a fixed share goes to savings, and you spend whatever remains — without guilt.
        </p>

        <h2>Why it works</h2>
        <ul>
          <li><strong>Spending expands to fill what&apos;s available.</strong> Money that&apos;s already moved out never gets the chance.</li>
          <li><strong>It removes daily willpower.</strong> You make one decision a month instead of thirty.</li>
          <li><strong>It makes the rest guilt-free.</strong> Once savings are done, the remaining money really is yours to spend.</li>
        </ul>

        <h2>How much to pay yourself</h2>
        <table>
          <thead>
            <tr><th>Stage</th><th>Save first</th></tr>
          </thead>
          <tbody>
            <tr><td>First job, high rent</td><td>10%</td></tr>
            <tr><td>Most salaried people</td><td>20%</td></tr>
            <tr><td>Living with family / big goals</td><td>30%+</td></tr>
          </tbody>
        </table>
        <p>
          Better to start at 10% and keep it than to start at 30% and give up. Add 2–5 points with every increment.
        </p>

        <h2>Set it up in four steps</h2>
        <ol>
          <li>Open a separate savings account (or use an RD) that isn&apos;t linked to your UPI apps.</li>
          <li>Schedule SIPs and transfers for the day after salary credit.</li>
          <li>Treat it as a bill. If a month is tight, cut wants before touching the transfer.</li>
          <li>Let unspent money from good months roll into savings too.</li>
        </ol>

        <h2>Where the saved money should go</h2>
        <p>In order:</p>
        <ol>
          <li>An <Link href="/guides/emergency-fund-guide">emergency fund</Link> of a few months&apos; essentials.</li>
          <li>Short-term goals (trip, gadget, wedding) in FDs, RDs or debt funds — use the <Link href="/tools/savings-goal-calculator">savings goal calculator</Link>.</li>
          <li>Long-term wealth in equity mutual fund SIPs — see the <Link href="/tools/sip-calculator">SIP calculator</Link>.</li>
        </ol>

        <h2>Save-first in ArthOS</h2>
        <p>
          <Link href="/">ArthOS</Link> is built on this idea. Set a rule once — a percentage or a fixed amount — and every income you add moves that share into
          a savings account that carries forward month after month. Your &ldquo;left to spend&rdquo; already has savings taken out, and you can pay for
          investments from savings, from spending, or split between them.
        </p>
      </>
    ),
    faq: [
      { q: "What does pay yourself first mean?", a: "Setting aside a fixed share of income for savings as soon as you're paid, before spending anything, instead of saving whatever is left at month-end." },
      { q: "How much should I pay myself first?", a: "20% of take-home pay is a common target. Start at 10% if needed and increase it with every raise." },
      { q: "Is pay yourself first better than budgeting?", a: "They work together. Paying yourself first secures savings; a simple daily budget then keeps the remaining spending on track." },
    ],
  },

  "track-upi-expenses": {
    Body: () => (
      <>
        <p>
          UPI made paying effortless — and that&apos;s the problem. ₹40 chai, ₹180 auto, ₹349 delivery: none of them feel like spending, and by the 20th the
          account is mysteriously low. Here&apos;s how to see where UPI money goes without logging every transaction in a spreadsheet.
        </p>

        <h2>Why UPI spending is hard to track</h2>
        <ul>
          <li><strong>Small and frequent</strong> — dozens of payments a week, each too small to notice.</li>
          <li><strong>Spread across apps</strong> — GPay, PhonePe, Paytm, BHIM and bank apps all pull from the same account.</li>
          <li><strong>Unclear names</strong> — bank statements show cryptic merchant IDs instead of &ldquo;lunch with team&rdquo;.</li>
        </ul>

        <h2>Option 1: Your UPI app&apos;s history</h2>
        <p>
          Every UPI app shows past payments, and some show monthly totals. It&apos;s free and accurate, but each app only sees its own payments and
          categories are rough. Good for a quick look, not for a budget.
        </p>

        <h2>Option 2: Bank statements</h2>
        <p>
          Download a monthly statement and sort it. Complete, but slow — and merchant names are often unreadable. Fine for a once-a-quarter review.
        </p>

        <h2>Option 3: An expense tracker, with the least possible typing</h2>
        <p>The trick is to make capturing a payment take seconds:</p>
        <ul>
          <li><strong>Share the payment screenshot</strong> straight from the UPI app to the tracker and let it read the amount, merchant and date.</li>
          <li><strong>Let categories learn</strong> — once you mark a merchant as Food, every future payment there should be Food automatically.</li>
          <li><strong>Mark recurring payments once</strong> — rent, subscriptions and bills shouldn&apos;t need re-entering.</li>
        </ul>
        <p>
          Be careful with apps that read your SMS inbox or ask for bank logins: they see far more than your spending. A tracker that reads only what you share
          is safer.
        </p>

        <h2>What to do with the numbers</h2>
        <ol>
          <li>Find your top three categories — usually food, shopping and travel.</li>
          <li>Compare with last month; one category growing fast is the signal.</li>
          <li>Set a daily spending number so the next ₹349 order is a conscious choice — try the <Link href="/tools/daily-budget-calculator">daily budget calculator</Link>.</li>
        </ol>

        <h2>How ArthOS handles UPI payments</h2>
        <p>
          In <Link href="/">ArthOS</Link>, share a GPay, PhonePe, Paytm or bank-app screenshot to the app and the amount, merchant, date and category fill
          themselves in. The text is read <strong>on your phone</strong> — the image is never uploaded — and nothing is saved until you confirm. No SMS
          reading, no bank logins. Categories learn from your corrections, and recurring bills are spotted for you.
        </p>
      </>
    ),
    faq: [
      { q: "How can I track my UPI expenses?", a: "Use your UPI app's history for a quick view, bank statements for a full record, or an expense tracker where you share payment screenshots so the details fill in automatically." },
      { q: "Is it safe to give an expense app access to my SMS?", a: "SMS access lets an app read all your messages, including OTPs. Prefer trackers that only read what you choose to share, such as a payment screenshot." },
      { q: "How do I see total UPI spending in a month?", a: "Some UPI apps show monthly totals for their own payments. For all apps combined, use your bank statement or an expense tracker." },
    ],
  },

  "what-is-xirr": {
    Body: () => (
      <>
        <p>
          Your SIP app says your mutual fund is up 10%. Is that good? It depends on <em>when</em> the money went in — and that&apos;s exactly what XIRR
          accounts for.
        </p>

        <h2>Why absolute return misleads for SIPs</h2>
        <p>
          Absolute return just compares total value with total invested. But in a SIP, money goes in month by month. The last instalment has been invested
          for a few weeks; the first for a year. Treating them all the same understates how hard the money worked.
        </p>

        <h2>A worked example</h2>
        <table>
          <thead>
            <tr><th></th><th>Value</th></tr>
          </thead>
          <tbody>
            <tr><td>SIP</td><td>₹5,000 a month for 12 months</td></tr>
            <tr><td>Total invested</td><td>₹60,000</td></tr>
            <tr><td>Value one month after the last instalment</td><td>₹66,000</td></tr>
            <tr><td>Absolute return</td><td>10%</td></tr>
            <tr><td><strong>XIRR</strong></td><td><strong>about 19% a year</strong></td></tr>
          </tbody>
        </table>
        <p>
          On average, each rupee was invested for only about six and a half months, so earning 10% in that time works out to roughly 19% a year. XIRR is the
          honest, annualised figure.
        </p>

        <h2>What XIRR actually is</h2>
        <p>
          XIRR (extended internal rate of return) is the single yearly rate that, applied to every investment and withdrawal from its own date, produces
          today&apos;s value. It handles irregular amounts and dates — extra lumpsums, skipped months, partial redemptions — which is why it&apos;s the
          standard for SIPs and real portfolios.
        </p>

        <h2>XIRR vs CAGR vs absolute return</h2>
        <table>
          <thead>
            <tr><th>Measure</th><th>Use it for</th></tr>
          </thead>
          <tbody>
            <tr><td>Absolute return</td><td>Quick look; investments under a year</td></tr>
            <tr><td>CAGR</td><td>One lumpsum held over several years</td></tr>
            <tr><td>XIRR</td><td>SIPs, multiple buys and sells, a whole portfolio</td></tr>
          </tbody>
        </table>

        <h2>Reading your XIRR</h2>
        <ul>
          <li><strong>Ignore it for the first year.</strong> Annualising a few months of returns swings wildly.</li>
          <li><strong>Compare with a benchmark</strong> over the same dates, such as a Nifty 50 index fund.</li>
          <li><strong>Compare with inflation</strong> (around 5–6% in India) — that&apos;s your real gain.</li>
        </ul>
        <p>
          Planning a new SIP? The <Link href="/tools/sip-calculator">SIP calculator</Link> shows what it could grow to. Tracking existing ones?{" "}
          <Link href="/">ArthOS</Link> calculates XIRR for each holding and your whole portfolio at live prices — and can import every mutual fund from your CAS
          statement, read on your device.
        </p>
      </>
    ),
    faq: [
      { q: "What is XIRR in mutual funds?", a: "The annualised return of investments made on different dates, such as SIP instalments. It accounts for how long each amount was invested." },
      { q: "What is a good XIRR for a SIP?", a: "Over long periods, many diversified equity funds have delivered 10–14% XIRR, but it varies by fund and market phase. Compare against an index fund over the same dates." },
      { q: "What is the difference between XIRR and CAGR?", a: "CAGR suits a single investment held over time. XIRR handles many cash flows on different dates, so it's the right measure for SIPs and portfolios." },
    ],
  },

  "emergency-fund-guide": {
    Body: () => (
      <>
        <p>
          An emergency fund is money you don&apos;t invest, don&apos;t spend and hopefully never need — until a layoff, a hospital bill or an urgent trip home.
          It&apos;s what keeps one bad month from becoming a credit-card spiral or a forced sale of your investments.
        </p>

        <h2>How many months to keep</h2>
        <table>
          <thead>
            <tr><th>Your situation</th><th>Months of essentials</th></tr>
          </thead>
          <tbody>
            <tr><td>Stable salaried job, no dependents</td><td>6</td></tr>
            <tr><td>Single income, family depends on you</td><td>9</td></tr>
            <tr><td>Freelance, business, commission-based</td><td>12</td></tr>
          </tbody>
        </table>
        <p>
          &ldquo;Essentials&rdquo; means only what you&apos;d still pay if income stopped: rent or EMI, groceries, utilities, insurance premiums, school fees,
          medicines. Work out your number with the <Link href="/tools/emergency-fund-calculator">emergency fund calculator</Link>.
        </p>

        <h2>What counts as an emergency</h2>
        <ul>
          <li>Job loss or a long gap in income</li>
          <li>Medical costs beyond insurance</li>
          <li>Urgent home or vehicle repairs you can&apos;t postpone</li>
          <li>Family emergencies that need travel</li>
        </ul>
        <p>A sale, a new phone or a planned trip is not an emergency — those belong to <Link href="/tools/savings-goal-calculator">savings goals</Link>.</p>

        <h2>Where to keep it</h2>
        <ul>
          <li><strong>Savings account</strong> — one or two months, for instant access.</li>
          <li><strong>Sweep-in FD</strong> — earns FD interest, breaks automatically when needed.</li>
          <li><strong>Liquid mutual fund</strong> — usually reaches your bank in a working day.</li>
        </ul>
        <p>
          Keep it out of stocks and equity funds: markets often fall at the same time as layoffs. And don&apos;t count your health insurance as the emergency
          fund — you need both.
        </p>

        <h2>How to build it without stalling investments</h2>
        <ol>
          <li>Get to one month of essentials as fast as possible.</li>
          <li>Then split savings — for example half to the fund, half to SIPs — until you reach the target.</li>
          <li>Put bonuses and tax refunds straight into it.</li>
          <li>After using it, refill it before raising investments again.</li>
        </ol>

        <h2>Keep it visible</h2>
        <p>
          In <Link href="/">ArthOS</Link>, your save-first rule moves a share of every income into a savings account that carries forward each month — an easy
          home for the fund, with the balance always in view.
        </p>
      </>
    ),
    faq: [
      { q: "How much emergency fund is enough in India?", a: "Six months of essential expenses for a stable salaried job; 9–12 months for single-income families and freelancers." },
      { q: "Is health insurance a substitute for an emergency fund?", a: "No. Insurance covers hospital bills; the emergency fund covers income loss and costs insurance won't pay. You need both." },
      { q: "Can I keep my emergency fund in mutual funds?", a: "Liquid funds are suitable for part of it. Avoid equity funds, which can fall sharply when you need the money." },
    ],
  },
};
