import {
  ArrowDownRight,
  ArrowUpRight,
  Percent,
  ReceiptText,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from 'cn';
import { formatPlain } from '@/lib/format';
import type { ReportKpi } from '../lib/report-data';

type ReportKpiCardsProps = {
  kpi: ReportKpi;
};

type KpiCard = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  change: number;
  changeSuffix: string;
  caption: string;
  goodWhenPositive: boolean;
  progress: number;
  icon: LucideIcon;
  iconWrapClassName: string;
  barClassName: string;
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function formatChange(value: number, suffix: string): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(1)}${suffix}`;
}

export default function ReportKpiCards({ kpi }: ReportKpiCardsProps) {
  const cards: KpiCard[] = [
    {
      id: 'revenue',
      label: 'Tổng doanh thu',
      value: formatPlain(kpi.revenue),
      unit: 'đ',
      change: kpi.revenueChange,
      changeSuffix: '%',
      caption: 'so với kỳ trước',
      goodWhenPositive: true,
      progress: 84,
      icon: TrendingUp,
      iconWrapClassName: 'bg-primary/10 text-primary',
      barClassName: 'bg-primary',
    },
    {
      id: 'profit',
      label: 'Lợi nhuận thuần',
      value: formatPlain(kpi.netProfit),
      unit: 'đ',
      change: kpi.netProfitChange,
      changeSuffix: '%',
      caption: 'so với kỳ trước',
      goodWhenPositive: true,
      progress: clamp((kpi.margin / 40) * 100),
      icon: Wallet,
      iconWrapClassName: 'bg-emerald-50 text-success',
      barClassName: 'bg-success',
    },
    {
      id: 'opex',
      label: 'Chi phí vận hành',
      value: formatPlain(kpi.operatingExpense),
      unit: 'đ',
      change: kpi.operatingExpenseChange,
      changeSuffix: '%',
      caption: 'so với kỳ trước',
      goodWhenPositive: false,
      progress:
        kpi.revenue === 0
          ? 0
          : clamp((kpi.operatingExpense / kpi.revenue) * 100),
      icon: ReceiptText,
      iconWrapClassName: 'bg-amber-50 text-warning',
      barClassName: 'bg-amber-400',
    },
    {
      id: 'margin',
      label: 'Tỷ suất lợi nhuận',
      value: kpi.margin.toFixed(1),
      unit: '%',
      change: kpi.marginChange,
      changeSuffix: ' điểm %',
      caption: 'so với kỳ trước',
      goodWhenPositive: true,
      progress: clamp(kpi.margin),
      icon: Percent,
      iconWrapClassName: 'bg-indigo-50 text-indigo-600',
      barClassName: 'bg-indigo-500',
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isGood = card.goodWhenPositive ? card.change >= 0 : card.change <= 0;
        const TrendIcon = card.change >= 0 ? ArrowUpRight : ArrowDownRight;

        return (
          <div
            key={card.id}
            className="relative overflow-hidden rounded-xl border border-outline bg-surface p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                {card.label}
              </p>
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  card.iconWrapClassName,
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-on-surface">
                {card.value}
              </span>
              {card.unit && (
                <span className="text-base font-normal text-on-surface-variant">
                  {card.unit}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                  isGood
                    ? 'border-emerald-200 bg-emerald-50 text-success'
                    : 'border-red-200 bg-red-50 text-error',
                )}
              >
                <TrendIcon className="h-3 w-3" />
                {formatChange(card.change, card.changeSuffix)}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                {card.caption}
              </span>
            </div>

            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-outline-variant">
              <div
                className={cn('h-full rounded-full transition-all', card.barClassName)}
                style={{ width: `${card.progress}%` }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
