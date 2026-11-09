"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth-store";
import type { CategorySuggestion, Insights, WidgetSnapshot, ParseResult, RecurringCandidate } from "./types";
import type { AssetClass, BudgetInput, BudgetStatus, HoldingInput, HoldingView, LotInput, Portfolio, PortfolioRange, Quote, SymbolMatch, Expense, ExpenseInput, Income, IncomeInput, MonthSummary, User } from "./types";

export const keys = {
  me: ["me"] as const,
  summary: (month: string) => ["summary", month] as const,
  incomes: (month: string) => ["incomes", month] as const,
  expenses: (month: string, filters: ExpenseFilters) => ["expenses", month, filters] as const,
};

export type ExpenseFilters = { category?: string; q?: string };

export function useSummary(month: string) {
  return useQuery({ queryKey: keys.summary(month), queryFn: () => api<MonthSummary>(`/api/summary?month=${month}`) });
}

export function useIncomes(month: string) {
  return useQuery({ queryKey: keys.incomes(month), queryFn: () => api<Income[]>(`/api/incomes?month=${month}`) });
}

export function useExpenses(month: string, filters: ExpenseFilters = {}) {
  const params = new URLSearchParams({ month });
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  return useQuery({ queryKey: keys.expenses(month, filters), queryFn: () => api<Expense[]>(`/api/expenses?${params}`) });
}

/** After any write, refresh every list and summary so the dashboard stays consistent. */
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["insights"] });
    qc.invalidateQueries({ queryKey: ["widget"] });
    qc.invalidateQueries({ queryKey: ["recurring-candidates"] });
    qc.invalidateQueries({ queryKey: ["category-suggestion"] });
    qc.invalidateQueries({ queryKey: ["summary"] });
    qc.invalidateQueries({ queryKey: ["incomes"] });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["budget"] });
  };
}

export function useSaveIncome() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: IncomeInput }) =>
      api<Income>(id ? `/api/incomes/${id}` : "/api/incomes", { method: id ? "PUT" : "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteIncome() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: (id: string) => api<void>(`/api/incomes/${id}`, { method: "DELETE" }), onSuccess: invalidate });
}

export function useSaveExpense() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ExpenseInput }) =>
      api<Expense>(id ? `/api/expenses/${id}` : "/api/expenses", { method: id ? "PUT" : "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: (id: string) => api<void>(`/api/expenses/${id}`, { method: "DELETE" }), onSuccess: invalidate });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const setUser = useAuth((s) => s.setUser);
  return useMutation({
    mutationFn: (patch: Partial<Pick<User, "name" | "currency" | "timezone" | "monthlyIncomeTarget" | "savingsMode" | "savingsValue" | "savingsStartingBalance" | "onboardingCompleted">>) =>
      api<User>("/api/users/me", { method: "PATCH", body: patch }),
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useBudget(month: string) {
  return useQuery({ queryKey: ["budget", month], queryFn: () => api<BudgetStatus>(`/api/budget?month=${month}`) });
}

export function useSaveBudget(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BudgetInput) => api<BudgetStatus>(`/api/budget?month=${month}`, { method: "PUT", body: input }),
    // later months inherit this budget, so refresh every month's budget view
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget"] }),
  });
}

export function useDeleteBudget(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<BudgetStatus>(`/api/budget?month=${month}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget"] }),
  });
}

// ---- Investments ----
function useInvalidatePortfolio() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["portfolio"] });
    qc.invalidateQueries({ queryKey: ["summary"] }); // buys move money out of savings or spending
  };
}

export function usePortfolio(range: PortfolioRange) {
  return useQuery({
    queryKey: ["portfolio", range],
    queryFn: () => api<Portfolio>(`/api/portfolio?range=${range}`),
    placeholderData: (prev) => prev, // keep the chart while switching ranges
    refetchInterval: 5 * 60_000,
  });
}

export function useMarketSearch(assetClass: AssetClass, q: string) {
  return useQuery({
    queryKey: ["market-search", assetClass, q],
    queryFn: () => api<SymbolMatch[]>(`/api/market/search?assetClass=${assetClass}&q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2 && (assetClass === "STOCK" || assetClass === "MUTUAL_FUND"),
    staleTime: 5 * 60_000,
  });
}

export function useQuote(assetClass: AssetClass, symbol?: string) {
  return useQuery({
    queryKey: ["quote", assetClass, symbol],
    queryFn: () => api<Quote>(`/api/market/quote?assetClass=${assetClass}${symbol ? `&symbol=${encodeURIComponent(symbol)}` : ""}`),
    enabled: assetClass === "GOLD" || ((assetClass === "STOCK" || assetClass === "MUTUAL_FUND") && !!symbol),
    staleTime: 60_000,
    retry: false,
  });
}

export function useSaveHolding() {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: HoldingInput }) =>
      api<HoldingView>(id ? `/api/holdings/${id}` : "/api/holdings", { method: id ? "PUT" : "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteHolding() {
  const invalidate = useInvalidatePortfolio();
  return useMutation({ mutationFn: (id: string) => api<void>(`/api/holdings/${id}`, { method: "DELETE" }), onSuccess: invalidate });
}

export function useAddLot(holdingId: string) {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (lot: LotInput) => api<HoldingView>(`/api/holdings/${holdingId}/lots`, { method: "POST", body: lot }),
    onSuccess: invalidate,
  });
}

export function useUpdateLot(holdingId: string) {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: ({ lotId, lot }: { lotId: string; lot: LotInput }) => api<HoldingView>(`/api/holdings/${holdingId}/lots/${lotId}`, { method: "PUT", body: lot }),
    onSuccess: invalidate,
  });
}

export function useDeleteLot(holdingId: string) {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (lotId: string) => api<HoldingView>(`/api/holdings/${holdingId}/lots/${lotId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

// ---- Automation (Phase 4)

/** Turn OCR'd text into a draft transaction (nothing is saved). */
export function useParseText() {
  return useMutation({ mutationFn: (text: string) => api<ParseResult>("/api/automation/parse", { method: "POST", body: { text } }) });
}

/** Category for a merchant: what the user taught ArthOS first, then built-in knowledge. */
export function useCategorySuggestion(merchant: string) {
  const m = merchant.trim();
  return useQuery({
    queryKey: ["category-suggestion", m.toLowerCase()],
    queryFn: () => api<CategorySuggestion>(`/api/automation/category?merchant=${encodeURIComponent(m)}`),
    enabled: m.length >= 2,
    staleTime: 5 * 60_000,
  });
}

export function useRecurringCandidates() {
  return useQuery({ queryKey: ["recurring-candidates"], queryFn: () => api<RecurringCandidate[]>("/api/automation/recurring"), staleTime: 60_000 });
}

export function useMarkRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: { kind: "INCOME" | "EXPENSE"; key: string }) => api<{ updated: number }>("/api/automation/recurring", { method: "POST", body: c }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-candidates"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["incomes"] });
    },
  });
}

// ---- Insights (Phase 5)

export function useInsights(month: string) {
  return useQuery({ queryKey: ["insights", month], queryFn: () => api<Insights>(`/api/insights?month=${month}`), staleTime: 60_000 });
}

// ---- Home-screen widgets (Phase 6): the same snapshot the Android widgets draw

export function useWidgetSnapshot() {
  return useQuery({ queryKey: ["widget"], queryFn: () => api<WidgetSnapshot>("/api/widget"), staleTime: 60_000 });
}

// ---- Import from a broker / CAS (files are read on the device; only confirmed holdings are sent)

/** Public ISIN → NSE symbol / AMFI scheme code reference, downloaded once and used to match files locally. */
export function useIsinIndex(enabled: boolean) {
  return useQuery({
    queryKey: ["isin-index"],
    queryFn: () => api<import("./import").IsinIndex>("/api/market/isin-index"),
    enabled,
    staleTime: 12 * 60 * 60_000,
    gcTime: 12 * 60 * 60_000,
  });
}

export type ImportResult = { created: number; updated: number; transactions: number; skipped: { name: string; reason: string }[] };

export function useImportHoldings() {
  const invalidate = useInvalidatePortfolio();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { source: string; items: import("./import").ImportItem[] }) => api<ImportResult>("/api/holdings/import", { method: "POST", body }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["insights"] });
      qc.invalidateQueries({ queryKey: ["widget"] });
    },
  });
}
