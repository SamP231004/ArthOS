import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth-store";
import type { BudgetInput, BudgetStatus, Expense, ExpenseInput, Income, IncomeInput, MonthSummary, User } from "./types";

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
    qc.invalidateQueries({ queryKey: ["summary"] });
    qc.invalidateQueries({ queryKey: ["incomes"] });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["income"] });
    qc.invalidateQueries({ queryKey: ["expense"] });
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
    mutationFn: (patch: Partial<Pick<User, "name" | "currency" | "timezone" | "monthlyIncomeTarget" | "onboardingCompleted">>) =>
      api<User>("/api/users/me", { method: "PATCH", body: patch }),
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useIncome(id?: string) {
  return useQuery({ queryKey: ["income", id], queryFn: () => api<Income>(`/api/incomes/${id}`), enabled: !!id });
}

export function useExpense(id?: string) {
  return useQuery({ queryKey: ["expense", id], queryFn: () => api<Expense>(`/api/expenses/${id}`), enabled: !!id });
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
