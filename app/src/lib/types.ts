import type { SavingsMode, SavingsRule } from './savings';

// Mirrors the backend DTOs in backend/src/main/java/com/arthos/**/..Dtos.java
// Money comes back as JSON numbers (BigDecimal); treat as major units (e.g. rupees).

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  currency: string;
  timezone: string;
  monthlyIncomeTarget?: number;
  savingsMode: SavingsMode;
  savingsValue: number;
  savingsStartingBalance: number;
  onboardingCompleted: boolean;
  /** Sandbox account from "Explore the demo"; self-deletes at expiresAt. */
  demo?: boolean;
  expiresAt?: string;
  createdAt?: string;
};

export type AuthResponse = { token: string; expiresAt: string; user: User };

export const INCOME_TYPES = ["SALARY", "FREELANCE", "BONUS", "INTEREST", "DIVIDEND", "CASH", "REFUND", "OTHER"] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

export const EXPENSE_CATEGORIES = [
  "FOOD", "GROCERIES", "TRANSPORT", "RENT", "UTILITIES", "SHOPPING", "ENTERTAINMENT",
  "HEALTH", "EDUCATION", "SUBSCRIPTIONS", "EMI", "TRAVEL", "PERSONAL_CARE", "GIFTS", "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_SOURCES = ["UPI", "CREDIT_CARD", "DEBIT_CARD", "CASH", "BANK_TRANSFER", "WALLET", "OTHER"] as const;
export type PaymentSource = (typeof PAYMENT_SOURCES)[number];

export type Income = {
  id: string;
  amount: number;
  source: string;
  type: IncomeType;
  date: string; // YYYY-MM-DD
  monthKey: string;
  note?: string;
  recurring: boolean;
  createdAt?: string;
};
export type IncomeInput = Omit<Income, "id" | "monthKey" | "createdAt">;

export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  merchant?: string;
  paymentSource: PaymentSource;
  date: string;
  monthKey: string;
  note?: string;
  recurring: boolean;
  createdAt?: string;
};
export type ExpenseInput = Omit<Expense, "id" | "monthKey" | "createdAt">;

export type MonthSummary = {
  month: string;
  currency: string;
  daysInMonth: number;
  daysElapsed: number;
  incomeTarget?: number;
  totalIncome: number;
  totalExpense: number;
  net: number;
  savingsRate?: number;
  incomeTargetProgress?: number;
  savingsRule: SavingsRule;
  savedFirst: number;
  spendable: number;
  leftToSpend: number;
  investedThisMonth: number;
  savings: SavingsAccount;
  todayExpense: number;
  averageDailyExpense: number;
  expenseByCategory: { category: ExpenseCategory; amount: number; share: number }[];
  incomeByType: { type: IncomeType; amount: number }[];
  dailyExpense: { date: string; amount: number }[];
  recent: { id: string; kind: "INCOME" | "EXPENSE"; amount: number; label: string; tag: string; date: string }[];
  incomeCount: number;
  expenseCount: number;
};

export type ApiErrorBody = { status: number; message: string; fieldErrors?: Record<string, string> };
// ---- Budget engine (Phase 2) — mirrors backend/src/main/java/com/arthos/budget/BudgetStatus.java ----
export const BUDGET_MODES = ["ADAPTIVE_DAILY", "FIXED_DAILY", "WEEKLY"] as const;
export type BudgetMode = (typeof BUDGET_MODES)[number];
export type BudgetState = "ON_TRACK" | "CAUTION" | "OVER" | "OVER_MONTH" | "UPCOMING" | "COMPLETED";
export type BudgetDayStatus = "UNDER" | "NEAR" | "OVER" | "TODAY" | "FUTURE";

export type BudgetStatus = {
  month: string;
  configured: boolean;
  inherited: boolean;
  inheritedFrom?: string;
  limit: number;
  mode: BudgetMode;
  excludedCategories: ExpenseCategory[];
  daysInMonth: number;
  dayOfMonth: number;
  daysRemaining: number;
  spentMonth: number;
  spentToday: number;
  spentBeforeToday: number;
  excludedSpent: number;
  remainingMonth: number;
  baseDailyAllowance: number;
  todayAllowance: number;
  todayRemaining: number;
  week: { index: number; start: string; end: string; days: number; allowance: number; spent: number; remaining: number; daysLeft: number; dailyGuide: number };
  status: BudgetState;
  usedPct?: number;
  elapsedPct: number;
  projectedSpend?: number;
  days: { date: string; spent: number; allowance: number; status: BudgetDayStatus }[];
  /** Today's figures under every mode, so the switcher can preview each before it's chosen. */
  modes?: BudgetModeOption[];
};

export type BudgetModeOption = { mode: BudgetMode; todayAllowance: number; todayRemaining: number; weekRemaining: number; status: BudgetState };

export type BudgetInput = { limit: number; mode: BudgetMode; excludedCategories: ExpenseCategory[] };
// ---- Investments (Phase 3) — mirrors backend/src/main/java/com/arthos/portfolio/PortfolioView.java ----
export const ASSET_CLASSES = ["STOCK", "MUTUAL_FUND", "GOLD", "BOND"] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];
export const HORIZONS = ["SHORT", "MEDIUM", "LONG"] as const;
export type Horizon = (typeof HORIZONS)[number];
export type GoldForm = "DIGITAL" | "PHYSICAL" | "SGB";
export type GoldPurity = "K24" | "K22";
export type BondType = "GOVERNMENT" | "CORPORATE";
export type LotType = "BUY" | "SELL";
export type PriceSource = "LIVE" | "MANUAL" | "FACE_VALUE" | "COST";
export type PortfolioRange = "1M" | "3M" | "6M" | "1Y" | "ALL";

export type HoldingView = {
  id: string;
  assetClass: AssetClass;
  name: string;
  symbol?: string;
  exchange?: string;
  quantity: number;
  avgCost: number;
  invested: number;
  price: number;
  priceSource: PriceSource;
  priceAsOf?: string;
  previousClose?: number;
  currentValue: number;
  gain: number;
  gainPct?: number;
  dayChange: number;
  dayChangePct?: number;
  realizedGain: number;
  xirr?: number;
  share?: number;
  goal?: string;
  horizon?: Horizon;
  manualPrice?: number;
  notes?: string;
  firstBought?: string;
  gold?: { form: GoldForm; purity: GoldPurity; grams: number; pricePerGram24k: number };
  bond?: { faceValue: number; couponRate: number; maturityDate: string; bondType: BondType; annualCoupon: number; nextCouponDate?: string; yearsToMaturity?: number; currentYield?: number };
  spark: number[];
  lots: { id: string; type: LotType; date: string; quantity: number; price: number; amount: number; note?: string; fundedFrom?: FundingSource; fromSavings?: number; fromSpending?: number }[];
};

export type Portfolio = {
  totals: { value: number; invested: number; gain: number; gainPct?: number; dayChange: number; dayChangePct?: number; realizedGain: number; xirr?: number; holdingsCount: number };
  allocation: { assetClass: AssetClass; value: number; invested: number; gain: number; gainPct?: number; share?: number; count: number }[];
  byHorizon: { horizon?: Horizon; value: number; share?: number; count: number }[];
  holdings: HoldingView[];
  history: { date: string; value: number; invested: number }[];
  range: PortfolioRange;
  pricesAsOf?: string;
  priceNotes: string[];
};

export type SymbolMatch = { symbol: string; name: string; exchange: string; assetClass: AssetClass };
export type Quote = { price: number; previousClose?: number; asOf: string; source: string };

export type FundingSource = 'SAVINGS' | 'SPENDING';
export type LotInput = { type: LotType; date: string; quantity: number; price: number; note?: string; fundedFrom?: FundingSource; fromSavings?: number };

/** Savings account — mirrors backend/src/main/java/com/arthos/savings/SavingsAccount.java. */
export type SavingsAccount = {
  month: string;
  startingBalance: number;
  opening: number;
  savedFirst: number;
  investedFromSavings: number;
  saleProceeds: number;
  closing: number;
  investedFromSpending: number;
  history: { month: string; opening: number; saved: number; invested: number; proceeds: number; closing: number }[];
};
export type HoldingInput = {
  assetClass: AssetClass;
  name: string;
  symbol?: string;
  exchange?: string;
  goal?: string;
  horizon?: Horizon;
  goldForm?: GoldForm;
  purity?: GoldPurity;
  faceValue?: number;
  couponRate?: number;
  maturityDate?: string;
  bondType?: BondType;
  manualPrice?: number;
  notes?: string;
  firstLot?: LotInput;
};

// ---- Automation (Phase 4) — mirrors backend/src/main/java/com/arthos/automation/AutomationController.java ----
export type ParseResult = {
  kind: 'INCOME' | 'EXPENSE';
  amount?: number;
  date?: string;
  merchant?: string;
  reference?: string;
  paymentSource?: PaymentSource;
  category?: ExpenseCategory;
  incomeType?: IncomeType;
  categorySource: 'LEARNED' | 'BUILT_IN' | 'NONE';
  confidence: number;
  found: string[];
  usable: boolean;
};
export type CategorySuggestion = { category?: ExpenseCategory; source: 'LEARNED' | 'BUILT_IN' | 'NONE' };
export type RecurringCandidate = { kind: 'INCOME' | 'EXPENSE'; key: string; name: string; tag?: string; typicalAmount: number; months: number; lastDate: string; dayOfMonth: number };

// ---- Insights (Phase 5) — mirrors backend/src/main/java/com/arthos/insights/InsightsCalculator.java ----
export type InsightLevel = 'DANGER' | 'WARN' | 'INFO';
export type Insights = {
  month: string;
  current: boolean;
  summary: string[];
  trends: { category: ExpenseCategory; thisMonth: number; typical: number; changePct?: number }[];
  anomalies: { id: string; merchant: string; category: ExpenseCategory; amount: number; date: string; typical: number; reason: string }[];
  leakage: {
    monthly: number;
    yearly: number;
    items: { name: string; category: ExpenseCategory; amount: number; lastDate: string }[];
    priceRises: { name: string; before: number; now: number; changePct: number }[];
  };
  health: { score: number; grade: string; headline: string; components: { key: string; label: string; points: number; max: number; value: string; explanation: string; tip: string }[] };
  alerts: { key: string; level: InsightLevel; title: string; body: string; dueDate?: string }[];
  suggestions: { title: string; body: string; monthlyImpact?: number }[];
};
