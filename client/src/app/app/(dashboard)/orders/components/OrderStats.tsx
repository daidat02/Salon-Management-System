'use client';

import { Clock3, Receipt, Undo2, Wallet } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { formatPlain, formatVND } from '@/lib/format';
import { useOrderStats } from '@/hooks/order';

function changeText(pct: number): string {
  if (pct > 0) return `↗ +${pct.toFixed(1)}% so với hôm qua`;
  if (pct < 0) return `↘ ${pct.toFixed(1)}% so với hôm qua`;
  return 'Bằng hôm qua';
}

function MockCards() {
  return (
    <>
      <StatCard
        label="Tổng đơn hôm nay"
        value={
          <>
            18 <span className="text-xs font-normal text-on-surface-variant">đơn</span>
          </>
        }
        sub="12 hoàn tất • 6 đang xử lý"
        icon={Receipt}
      />
      <StatCard
        label="Doanh thu hôm nay"
        value={
          <>
            8.450.000 <span className="text-xs font-normal text-on-surface-variant">đ</span>
          </>
        }
        sub={
          <span className="inline-flex items-center gap-1 font-medium text-success">
            ↗ +12% so với hôm qua
          </span>
        }
        icon={Wallet}
        iconWrapClassName="bg-emerald-50 text-success"
      />
      <StatCard
        label="Chờ thanh toán"
        value={
          <>
            6{' '}
            <span className="ml-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              2.300.000 đ
            </span>
          </>
        }
        sub={<span className="text-amber-700/80">Cần thu trong ca hôm nay</span>}
        icon={Clock3}
        iconWrapClassName="bg-amber-100 text-amber-800"
        className="border-amber-200 bg-amber-50/20"
      />
      <StatCard
        label="Hủy / Hoàn tiền"
        value={
          <>
            02 <span className="text-xs font-normal text-on-surface-variant">đơn</span>
          </>
        }
        sub="Tỷ lệ 3.1% tổng đơn tháng"
        icon={Undo2}
        iconWrapClassName="bg-gray-200 text-gray-700"
      />
    </>
  );
}

/** mock=true: hiện số mock tĩnh (trang đơn hàng) — live: số server (trang thu ngân). */
export default function OrderStats({ mock = false }: { mock?: boolean }) {
  const { data: s, isLoading } = useOrderStats(!mock);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {mock ? (
        <MockCards />
      ) : isLoading || !s ? (
        [0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-outline bg-surface px-4 py-3.5 shadow-sm"
          >
            <div className="h-4 w-28 rounded bg-surface-container" />
            <div className="mt-2 h-6 w-20 rounded bg-surface-container" />
          </div>
        ))
      ) : (
        <>
          <StatCard
            label="Tổng đơn hôm nay"
            value={
              <>
                {s.today_total}{' '}
                <span className="text-xs font-normal text-on-surface-variant">đơn</span>
              </>
            }
            sub={`${s.today_completed} hoàn tất • ${s.today_processing} đang xử lý`}
            icon={Receipt}
          />
          <StatCard
            label="Doanh thu hôm nay"
            value={
              <>
                {formatPlain(Math.round(s.today_revenue))}{' '}
                <span className="text-xs font-normal text-on-surface-variant">đ</span>
              </>
            }
            sub={
              <span
                className={`inline-flex items-center gap-1 font-medium ${s.revenue_change_pct < 0 ? 'text-error' : 'text-success'}`}
              >
                {changeText(s.revenue_change_pct)}
              </span>
            }
            icon={Wallet}
            iconWrapClassName="bg-emerald-50 text-success"
          />
          <StatCard
            label="Chờ thanh toán"
            value={
              <>
                {s.pending_count}{' '}
                <span className="ml-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {formatVND(Math.round(s.pending_amount))}
                </span>
              </>
            }
            sub={<span className="text-amber-700/80">Cần thu trong ca hôm nay</span>}
            icon={Clock3}
            iconWrapClassName="bg-amber-100 text-amber-800"
            className="border-amber-200 bg-amber-50/20"
          />
          <StatCard
            label="Hủy / Hoàn tiền"
            value={
              <>
                {s.cancel_refund_today}{' '}
                <span className="text-xs font-normal text-on-surface-variant">đơn</span>
              </>
            }
            sub={`Tỷ lệ ${s.cancel_refund_rate.toFixed(1)}% tổng đơn tháng`}
            icon={Undo2}
            iconWrapClassName="bg-gray-200 text-gray-700"
          />
        </>
      )}
    </section>
  );
}
