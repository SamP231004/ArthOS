import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { api } from "./api";
import { useAuth } from "./auth-store";
import { label as prettify } from "./format";
import { EXPENSE_CATEGORIES, INCOME_TYPES } from "./types";

/**
 * The user's expense categories and income types: the built-ins (renamable, hideable) plus their own. Mirrors
 * backend/src/main/java/com/arthos/category. Keep web/src/lib/categories.ts and app/src/lib/categories.ts in sync.
 */
export type CategoryKind = "expense" | "income";
export type CategoryView = { key: string; label: string; emoji?: string | null; builtIn: boolean; hidden: boolean };
export type CategoryLists = { expense: CategoryView[]; income: CategoryView[] };

const builtIn = (keys: readonly string[]): CategoryView[] => keys.map((key) => ({ key, label: prettify(key), builtIn: true, hidden: false }));
/** What to show before the user's lists have loaded (or when signed out). */
export const DEFAULT_CATEGORIES: CategoryLists = { expense: builtIn(EXPENSE_CATEGORIES), income: builtIn(INCOME_TYPES) };

export function useCategoryLists() {
  const signedIn = useAuth((s) => !!s.token);
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api<CategoryLists>("/api/categories"),
    enabled: signedIn,
    staleTime: 10 * 60_000,
    placeholderData: DEFAULT_CATEGORIES,
  });
}

/**
 * One list, with helpers: `visible` for pickers (hidden ones left out), `all` for history and charts, and lookups that
 * fall back gracefully for keys the list doesn't know (e.g. a category deleted on another device).
 */
export function useCategories(kind: CategoryKind) {
  const lists = useCategoryLists().data ?? DEFAULT_CATEGORIES;
  const all = lists[kind];
  return useMemo(() => {
    const byKey = new Map(all.map((c) => [c.key, c]));
    return {
      all,
      visible: all.filter((c) => !c.hidden),
      /** pickers: the visible ones, plus `current` if it's hidden (so editing an old entry keeps its category) */
      options: (current?: string) => all.filter((c) => !c.hidden || c.key === current),
      label: (key?: string | null) => (key ? byKey.get(key)?.label ?? prettify(key) : ""),
      emoji: (key?: string | null) => (key ? byKey.get(key)?.emoji ?? null : null),
    };
  }, [all]);
}

/** A label for a key from either list (recent transactions mix expenses and income). */
export function useAnyCategoryLabel() {
  const lists = useCategoryLists().data ?? DEFAULT_CATEGORIES;
  return useCallback(
    (key?: string | null) => (key ? (lists.expense.find((c) => c.key === key) ?? lists.income.find((c) => c.key === key))?.label ?? prettify(key) : ""),
    [lists],
  );
}

function useRefreshAfterCategoryChange() {
  const qc = useQueryClient();
  return () => {
    for (const k of ["categories", "expenses", "incomes", "summary", "insights", "budget", "recurring-candidates", "category-suggestion"])
      qc.invalidateQueries({ queryKey: [k] });
  };
}

export function useCreateCategory() {
  const refresh = useRefreshAfterCategoryChange();
  return useMutation({
    mutationFn: ({ kind, label, emoji }: { kind: CategoryKind; label: string; emoji?: string }) =>
      api<CategoryView>(`/api/categories/${kind}`, { method: "POST", body: { label, emoji } }),
    onSuccess: refresh,
  });
}

export function useUpdateCategory() {
  const refresh = useRefreshAfterCategoryChange();
  return useMutation({
    mutationFn: ({ kind, key, ...patch }: { kind: CategoryKind; key: string; label?: string; emoji?: string; hidden?: boolean }) =>
      api<CategoryView>(`/api/categories/${kind}/${encodeURIComponent(key)}`, { method: "PATCH", body: patch }),
    onSuccess: refresh,
  });
}

export function useDeleteCategory() {
  const refresh = useRefreshAfterCategoryChange();
  return useMutation({
    mutationFn: ({ kind, key, moveTo }: { kind: CategoryKind; key: string; moveTo: string }) =>
      api<{ moved: number }>(`/api/categories/${kind}/${encodeURIComponent(key)}?moveTo=${encodeURIComponent(moveTo)}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
}

export function categoryUsage(kind: CategoryKind, key: string) {
  return api<{ count: number }>(`/api/categories/${kind}/${encodeURIComponent(key)}/usage`);
}
