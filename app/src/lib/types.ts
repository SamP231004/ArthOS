// Mirrors the backend DTOs in backend/src/main/java/com/arthos/**/..Dtos.java
// Money comes back as JSON numbers (BigDecimal); treat as major units (e.g. rupees).

export type User = {
  id: string;
  name: string;
  email: string;
  currency: string;
  timezone: string;
  monthlyIncomeTarget?: number;
  onboardingCompleted: boolean;
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
