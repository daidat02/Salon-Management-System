'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatVND } from '@/lib/format';
import type { MonthlyReportPoint } from '../lib/report-data';

type RevenueProfitChartProps = {
  points: MonthlyReportPoint[];
  year: number;
};

type ChartTooltipEntry = {
  dataKey?: string;
  value?: number | string;
};

const SERIES = [
  { key: 'revenue', label: 'Doanh thu', color: '#4F7CAC' },
  { key: 'operatingExpense', label: 'Chi phí vận hành', color: '#CBD5E1' },
  { key: 'netProfit', label: 'Lợi nhuận thuần', color: '#10B981' },
] as const;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const valueOf = (key: string) =>
    Number(payload.find((entry) => entry.dataKey === key)?.value ?? 0);

  return (
    <div className="min-w-[190px] rounded-lg border border-outline bg-surface px-3 py-2 text-xs shadow-md">
      <div className="mb-1.5 font-semibold text-on-surface">{label}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-on-surface-variant">Doanh thu</span>
          <span className="font-semibold text-[#4F7CAC]">
            {valueOf('revenue').toFixed(1)}M
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-on-surface-variant">Chi phí vận hành</span>
          <span className="font-semibold text-on-surface">
            {valueOf('operatingExpense').toFixed(1)}M
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-on-surface-variant">Lợi nhuận thuần</span>
          <span className="font-semibold text-success">
            {valueOf('netProfit').toFixed(1)}M
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RevenueProfitChart({
  points,
  year,
}: RevenueProfitChartProps) {
  const totalRevenue = React.useMemo(
    () => points.reduce((sum, point) => sum + point.revenue, 0),
    [points],
  );

  const chartData = React.useMemo(
    () =>
      points.map((point) => ({
        label: point.label,
        revenue: Number((point.revenue / 1_000_000).toFixed(1)),
        operatingExpense: Number((point.operatingExpense / 1_000_000).toFixed(1)),
        netProfit: Number((point.netProfit / 1_000_000).toFixed(1)),
      })),
    [points],
  );

  return (
    <div className="flex flex-col rounded-xl border border-outline bg-surface p-6 shadow-sm lg:col-span-8">
      <div className="flex flex-col gap-3 border-b border-outline pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-on-surface">
            Doanh thu &amp; Lợi nhuận theo tháng năm {year}
          </h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            So sánh 12 tháng của năm {year}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {SERIES.map((series) => (
            <div key={series.key} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: series.color }}
              />
              <span className="font-medium text-on-surface">{series.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            barGap={4}
            barCategoryGap="22%"
          >
            <CartesianGrid
              strokeDasharray="5 5"
              stroke="#e2e8f0"
              vertical={false}
              opacity={0.8}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval={0}
              tickFormatter={(value: string) =>
                value.replace('Tháng ', 'T')
              }
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}M`}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: '#f8fafc' }}
            />
            <Bar
              dataKey="revenue"
              name="Doanh thu"
              fill="#4F7CAC"
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
            />
            <Bar
              dataKey="operatingExpense"
              name="Chi phí vận hành"
              fill="#CBD5E1"
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
            />
            <Bar
              dataKey="netProfit"
              name="Lợi nhuận thuần"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-outline pt-3 text-[11px] text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-primary" />
          Số liệu minh hoạ theo năm {year}
        </span>
        <span>
          Doanh thu năm:{' '}
          <strong className="font-semibold text-on-surface">
            {formatVND(totalRevenue)}
          </strong>
        </span>
      </div>
    </div>
  );
}
