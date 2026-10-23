import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllCashFlows } from '@/services/cashflow';

export type CashflowChartPoint = {
  day: string;
  thu: number;
  chi: number;
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

export default function useCashflowChartData() {
  const range = React.useMemo(() => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }, []);

  return useQuery({
    queryKey: [
      'cashflow-chart',
      { dateFrom: range.from.toISOString(), dateTo: range.to.toISOString() },
    ],
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
