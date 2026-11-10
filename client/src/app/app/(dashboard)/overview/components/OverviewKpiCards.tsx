import {
  CalendarDays,
  ReceiptText,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { cn } from '@/lib/utils';
import { formatPlain } from '@/lib/format';
import type { OverviewKpi } from '@/types/overview';

type KpiTone = 'success' | 'warning' | 'error' | 'neutral';

type KpiCard = {
  id: string;
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  iconWrapClassName: string;
  badge: {
    label: string;
    tone: KpiTone;
    trend?: 'up' | 'down';
  };
  caption?: string;
};

const BADGE_TONE: Record<KpiTone, string> = {
  success: 'bg-emerald-50 text-success',
  warning: 'bg-amber-50 text-warning border border-amber-200',
  error: 'bg-rose-50 text-error border border-rose-200',
  neutral: 'bg-surface-container text-on-surface-variant',
};

function formatChange(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

type OverviewKpiCardsProps = {
  kpi: OverviewKpi;
};

export default function OverviewKpiCards({ kpi }: OverviewKpiCardsProps) {
  const cards: KpiCard[] = [
    {
      id: 'revenue',
      label: 'Doanh thu hôm nay',
      value: (
        <>
          {formatPlain(kpi.revenueToday)}
          <span className="text-base">₫</span>
        </>
      ),
      icon: Wallet,
      iconWrapClassName: 'bg-[#EFF6FF] text-primary',
      badge: {
        label: formatChange(kpi.revenueChange),
        tone: kpi.revenueChange >= 0 ? 'success' : 'error',
        trend: kpi.revenueChange >= 0 ? 'up' : 'down',
      },
      caption: 'so với hôm qua',
    },
    {
      id: 'aov',
      label: 'Giá trị đơn trung bình',
      value: (
        <>
          {formatPlain(kpi.aovToday)}
          <span className="text-base">₫</span>
        </>
      ),
      icon: ReceiptText,
      iconWrapClassName: 'bg-emerald-50 text-success',
      badge: {
        label: formatChange(kpi.aovChange),
        tone: kpi.aovChange >= 0 ? 'success' : 'error',
        trend: kpi.aovChange >= 0 ? 'up' : 'down',
      },
      caption: 'so với hôm qua',
    },
    {
      id: 'appointments',
      label: 'Lịch hẹn hôm nay',
      value: kpi.appointmentsToday,
      icon: CalendarDays,
      iconWrapClassName: 'bg-[#EFF6FF] text-primary',
      badge: {
        label: `${kpi.appointmentsPending} đang chờ xác nhận`,
        tone: kpi.appointmentsPending > 0 ? 'warning' : 'neutral',
      },
    },
    {
      id: 'orders',
      label: 'Tổng đơn hàng',
      value: kpi.ordersToday,
      icon: ShoppingBag,
      iconWrapClassName: 'bg-[#FFF1F2] text-error',
      badge: {
        label: `${kpi.ordersUnpaid} chưa thanh toán`,
        tone: kpi.ordersUnpaid > 0 ? 'error' : 'success',
      },
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const dotted = card.badge.tone === 'warning' || card.badge.tone === 'error';
        const TrendIcon = card.badge.trend === 'down' ? TrendingDown : TrendingUp;

        return (
          <StatCard
            key={card.id}
            label={card.label}
            value={card.value}
            icon={card.icon}
            iconWrapClassName={card.iconWrapClassName}
            sub={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                    BADGE_TONE[card.badge.tone],
                  )}
                >
                  {card.badge.trend && <TrendIcon className="h-3 w-3" />}
                  {dotted && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  {card.badge.label}
                </span>
                {card.caption && <span>{card.caption}</span>}
              </span>
            }
          />
        );
      })}
    </section>
  );
}
