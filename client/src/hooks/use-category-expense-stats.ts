import { useQuery } from '@tanstack/react-query';
import { getAllCashFlows, getCashFlowCategories } from '@/services/cashflow';
import type { CashFlowCategory } from '@/types/cashflow';

export type CategoryExpenseStat = CashFlowCategory & {
  total_expense: number;
  voucher_count: number;
};

type UseCategoryExpenseStatsParams = {
  dateFrom?: string;
  dateTo?: string;
};

export default function useCategoryExpenseStats({
  dateFrom,
  dateTo,
}: UseCategoryExpenseStatsParams = {}) {
  return useQuery({
    queryKey: ['category-expense-stats', { dateFrom, dateTo }],
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
