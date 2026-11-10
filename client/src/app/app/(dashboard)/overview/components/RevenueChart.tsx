'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPlain } from '@/lib/format';
import type { DailyRevenuePoint } from '@/types/overview';

type ChartPoint = {
  label: string;
  value: number;
  revenue: number;
  appointments: number;
};

type TooltipEntry = {
  payload?: ChartPoint;
};

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active) return null;

  const point = payload?.[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-outline bg-surface px-3 py-1.5 text-xs shadow-lg">
      <div className="flex items-center gap-1.5 font-bold text-on-surface">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        {label}: {formatPlain(point.revenue)}₫
      </div>
      <div className="text-[10px] text-on-surface-variant">
        {point.appointments} lịch hẹn hoàn thành
      </div>
    </div>
  );
}

type RevenueChartProps = {
  points: DailyRevenuePoint[];
};

export default function RevenueChart({ points }: RevenueChartProps) {
  const chartData = useMemo<ChartPoint[]>(
    () =>
      points.map((point) => ({
        label: point.label,
        value: Number((point.revenue / 1_000_000).toFixed(1)),
        revenue: point.revenue,
        appointments: point.appointments,
      })),
    [points],
  );

  const average = useMemo(() => {
    if (points.length === 0) return 0;
    return Math.round(
      points.reduce((sum, point) => sum + point.revenue, 0) / points.length,
    );
  }, [points]);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-outline bg-surface p-6 shadow-sm lg:col-span-2">
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-on-surface">Doanh thu 7 ngày qua</h2>
          <span className="text-xs font-normal text-on-surface-variant">
            • Trung bình: {(average / 1_000_000).toFixed(1)}M/ngày
          </span>
        </div>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          Biểu đồ đối soát doanh số thanh toán dịch vụ &amp; bán lẻ
        </p>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 16, right: 8, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id="overviewRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F7CAC" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#4F7CAC" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748B' }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              ticks={[0, 10, 20, 30, 40]}
              domain={[0, 40]}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}M`}
            />
            <Tooltip
              content={<RevenueTooltip />}
              cursor={{ stroke: '#4F7CAC', strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#4F7CAC"
              strokeWidth={3}
              strokeLinecap="round"
              fill="url(#overviewRevenueGradient)"
              activeDot={{ r: 6, fill: '#4F7CAC', stroke: '#ffffff', strokeWidth: 2.5 }}
              dot={{ r: 4, fill: '#ffffff', stroke: '#4F7CAC', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
