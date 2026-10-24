'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatVND } from '@/lib/format';
import {
  formatCompactMoney,
  type RevenueCompositionItem,
} from '../lib/report-data';

type RevenueCompositionProps = {
  items: RevenueCompositionItem[];
  totalRevenue: number;
};

type CompositionTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: RevenueCompositionItem }>;
};

function CompositionTooltip({ active, payload }: CompositionTooltipProps) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="rounded-lg border border-outline bg-surface px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-on-surface">{item.label}</div>
      <div className="mt-1 font-bold text-primary">{formatVND(item.amount)}</div>
      <div className="text-[11px] text-on-surface-variant">
        {item.ratio.toFixed(1)}% doanh thu
      </div>
    </div>
  );
}

export default function RevenueComposition({
  items,
  totalRevenue,
}: RevenueCompositionProps) {
  return (
    <div className="flex flex-col rounded-xl border border-outline bg-surface p-6 shadow-sm lg:col-span-4">
      <div className="border-b border-outline pb-3">
        <h2 className="text-base font-bold text-on-surface">
          Cơ cấu Doanh thu
        </h2>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          Tỷ trọng theo nhóm dịch vụ, bán lẻ và khác
        </p>
      </div>

      <div className="relative mx-auto my-4 h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="amount"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={78}
              paddingAngle={2}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {items.map((item) => (
                <Cell key={item.id} fill={item.color} />
              ))}
            </Pie>
            <Tooltip content={<CompositionTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium text-on-surface-variant">
            Tổng thu
          </span>
          <span className="text-base font-bold text-on-surface">
            {formatCompactMoney(totalRevenue)}
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-xs font-medium text-on-surface">
                {item.label}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xs font-bold text-on-surface">
                {formatVND(item.amount)}
              </span>
              <span className="ml-1 text-[11px] font-semibold text-on-surface-variant">
                ({item.ratio.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-outline pt-3 text-[11px] text-on-surface-variant">
        <span>Dựa trên doanh thu trong kỳ</span>
        <span className="font-semibold text-on-surface">
          {formatCompactMoney(totalRevenue)}
        </span>
      </div>
    </div>
  );
}
