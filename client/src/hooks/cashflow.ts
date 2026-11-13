import * as React from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getCashFlows,
  getAllCashFlows,
  getCashFlowStats,
  getCashFlowCategories,
  getFunds,
  getFundMovementHistory,
  createCashFlow,
  approveCashFlow,
  createFund,
  updateFund,
  type CreateCashFlowPayload,
  type CreateFundPayload,
  type UpdateFundPayload,
} from '@/services/cashflow';
import type { CashFlowCategory } from '@/types/cashflow';
import { queryKeys } from './query-keys';

type UseCashFlowsParams = {
  search?: string;
  kind?: string;
  categoryId?: string;
  fundId?: string;
  status?: string;
  sortBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

type UseCashFlowStatsParams = {
  dateFrom?: string;
  dateTo?: string;
};

type UseCategoryExpenseStatsParams = {
  dateFrom?: string;
  dateTo?: string;
};

export type CashflowChartPoint = {
  day: string;
  thu: number;
  chi: number;
};

export type CategoryExpenseStat = CashFlowCategory & {
  total_expense: number;
  voucher_count: number;
};

function toDateKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function formatDayLabel(value: Date): string {
  const weekday = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][value.getDay()];
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${weekday} (${day}/${month})`;
}

export function useCashFlows({
  search,
  kind,
  categoryId,
  fundId,
  status,
  sortBy,
  dateFrom,
  dateTo,
  page,
  pageSize,
}: UseCashFlowsParams) {
  return useQuery({
    queryKey: queryKeys.cashflow.list({
      search,
      kind,
      categoryId,
      fundId,
      status,
      sortBy,
      dateFrom,
      dateTo,
      page,
      pageSize,
    }),
    queryFn: async () =>
      getCashFlows({
        search,
        kind,
        categoryId,
        fundId,
        status,
        sortBy,
        dateFrom,
        dateTo,
        page,
        pageSize,
      }),
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useCashFlowStats({ dateFrom, dateTo }: UseCashFlowStatsParams = {}) {
  return useQuery({
    queryKey: queryKeys.cashflow.stats({ dateFrom, dateTo }),
    queryFn: () => getCashFlowStats({ dateFrom, dateTo }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCashFlowCategories(kind?: string) {
  return useQuery({
    queryKey: queryKeys.cashflow.categories(kind),
    queryFn: async () => getCashFlowCategories(kind),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCashflowChartData() {
  const range = React.useMemo(() => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }, []);

  return useQuery({
    queryKey: queryKeys.cashflow.chart({
      dateFrom: range.from.toISOString(),
      dateTo: range.to.toISOString(),
    }),
    queryFn: async () => {
      const cashflows = await getAllCashFlows({
        status: 'approved',
        dateFrom: range.from.toISOString(),
        dateTo: range.to.toISOString(),
      });

      const buckets = new Map<string, { thu: number; chi: number }>();
      const points: CashflowChartPoint[] = [];
      for (let index = 0; index < 7; index += 1) {
        const date = new Date(range.from);
        date.setDate(date.getDate() + index);
        const key = toDateKey(date);
        buckets.set(key, { thu: 0, chi: 0 });
        points.push({ day: formatDayLabel(date), thu: 0, chi: 0 });
      }

      for (const cashflow of cashflows) {
        const rawDate = cashflow.occurred_at ?? cashflow.created_at;
        if (!rawDate) continue;
        const date = new Date(rawDate);
        if (Number.isNaN(date.getTime())) continue;
        const bucket = buckets.get(toDateKey(date));
        if (!bucket) continue;
        if (cashflow.kind === 'income') bucket.thu += cashflow.amount;
        else bucket.chi += cashflow.amount;
      }

      let totalIncome = 0;
      let totalExpense = 0;
      for (let index = 0; index < points.length; index += 1) {
        const date = new Date(range.from);
        date.setDate(date.getDate() + index);
        const bucket = buckets.get(toDateKey(date)) ?? { thu: 0, chi: 0 };
        points[index].thu = Number((bucket.thu / 1_000_000).toFixed(1));
        points[index].chi = Number((bucket.chi / 1_000_000).toFixed(1));
        totalIncome += bucket.thu;
        totalExpense += bucket.chi;
      }

      return { points, totalIncome, totalExpense };
    },
    staleTime: 60 * 1000,
  });
}

export function useCategoryExpenseStats({
  dateFrom,
  dateTo,
}: UseCategoryExpenseStatsParams = {}) {
  return useQuery({
    queryKey: queryKeys.cashflow.categoryExpense({ dateFrom, dateTo }),
    queryFn: async () => {
      const [categories, cashflows] = await Promise.all([
        getCashFlowCategories('expense'),
        getAllCashFlows({ kind: 'expense', status: 'approved', dateFrom, dateTo }),
      ]);

      const totals = new Map<string, { total: number; count: number }>();
      for (const cashflow of cashflows) {
        if (!cashflow.category_id) continue;
        const current = totals.get(cashflow.category_id) ?? { total: 0, count: 0 };
        current.total += cashflow.amount;
        current.count += 1;
        totals.set(cashflow.category_id, current);
      }

      return categories
        .map<CategoryExpenseStat>((category) => ({
          ...category,
          total_expense: totals.get(category.id)?.total ?? 0,
          voucher_count: totals.get(category.id)?.count ?? 0,
        }))
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    staleTime: 60 * 1000,
  });
}

export function useFunds(activeOnly = true) {
  return useQuery({
    queryKey: queryKeys.cashflow.funds(activeOnly),
    queryFn: async () => getFunds(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFundMovementHistory() {
  return useQuery({
    queryKey: queryKeys.cashflow.fundMovement(),
    queryFn: getFundMovementHistory,
    staleTime: 60 * 1000,
  });
}

export function useCreateCashFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCashFlowPayload) => createCashFlow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cashflow.all });
    },
  });
}

export function useApproveCashFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cashflowId: string) => approveCashFlow(cashflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cashflow.all });
    },
  });
}

function invalidateFundQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.cashflow.all });
}

export function useCreateFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFundPayload) => createFund(payload),
    onSuccess: () => invalidateFundQueries(queryClient),
  });
}

export function useUpdateFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fundId, payload }: { fundId: string; payload: UpdateFundPayload }) =>
      updateFund(fundId, payload),
    onSuccess: () => invalidateFundQueries(queryClient),
  });
}

export function createCashflowChartPlaceholder(): CashflowChartPoint[] {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const points: CashflowChartPoint[] = [];
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(to);
    date.setDate(date.getDate() - index);
    points.push({ day: formatDayLabel(date), thu: 0, chi: 0 });
  }
  return points;
}

export type { CreateCashFlowPayload, CreateFundPayload, UpdateFundPayload };
