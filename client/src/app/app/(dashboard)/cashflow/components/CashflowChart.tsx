'use client';

import * as React from 'react';
import { MoreVertical } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCashflowChartData, createCashflowChartPlaceholder } from '@/hooks/cashflow';

type ChartTooltipEntry = { dataKey?: string; value?: number | string };

function formatMillions(value: number): string {
  return `${(value / 1_000_000).toFixed(1)}M`;
}

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
  const thu = payload.find((p) => p.dataKey === 'thu')?.value;
  const chi = payload.find((p) => p.dataKey === 'chi')?.value;
  return (
    <div className="rounded-lg border border-outline bg-surface px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-semibold text-on-surface">{label}</div>
      <div className="font-semibold text-success">Thu: +{thu}M</div>
      <div className="font-semibold text-error">Chi: -{chi}M</div>
    </div>
  );
}

export default function CashflowChart() {
  const { data, isLoading } = useCashflowChartData();
  const placeholder = React.useMemo(() => createCashflowChartPlaceholder(), []);
  const points = data?.points ?? placeholder;
  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-outline bg-surface p-6 shadow-sm lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-on-surface">Biểu đồ Dòng tiền 7 ngày qua</h2>
          <p className="text-xs text-on-surface-variant">
            So sánh biến động doanh thu và chi phí thực tế
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="text-on-surface-variant">
              Thu ({isLoading ? '...' : `+${formatMillions(totalIncome)}`})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-error" />
            <span className="text-on-surface-variant">
              Chi ({isLoading ? '...' : `-${formatMillions(totalExpense)}`})
            </span>
          </div>
          <button
            type="button"
            aria-label="Tùy chọn biểu đồ"
            className="rounded p-1 text-on-surface-variant hover:text-on-surface"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="cashflowThu" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cashflowChi" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="5 5" stroke="#e2e8f0" vertical={false} opacity={0.7} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}M`}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
            />
            <Area type="monotone" dataKey="thu" fill="url(#cashflowThu)" stroke="none" />
            <Area type="monotone" dataKey="chi" fill="url(#cashflowChi)" stroke="none" />
            <Line
              type="monotone"
              dataKey="thu"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#fff', stroke: '#10B981', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="chi"
              stroke="#EF4444"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#fff', stroke: '#EF4444', strokeWidth: 2 }}
              activeDot={{ r: 4, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between border-t border-outline pt-3 text-[11px] font-medium text-on-surface-variant">
        {points.map((point, index) => (
          <span
            key={point.day}
            className={index === points.length - 1 ? 'font-bold text-primary' : undefined}
          >
            {point.day}
          </span>
        ))}
      </div>
    </div>
  );
}
