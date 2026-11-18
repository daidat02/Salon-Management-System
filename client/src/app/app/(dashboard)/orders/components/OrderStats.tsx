'use client';

import { Clock3, Receipt, Undo2, Wallet } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { formatPlain, formatVND } from '@/lib/format';
import { useOrderStats } from '@/hooks/order';

/** Thẻ thống kê đơn hàng: đơn/doanh thu tháng, tỉ lệ hủy/hoàn, chờ thanh toán hôm nay. */
export default function OrderStats() {
  const { data: s, isLoading } = useOrderStats();

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {isLoading || !s ? (
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
            label="Đơn hàng tháng"
            value={
              <>
                {s.month_total}{' '}
                <span className="text-xs font-normal text-on-surface-variant">đơn</span>
              </>
            }
            sub={`Hôm nay ${s.today_total} đơn • ${s.today_completed} hoàn tất`}
            icon={Receipt}
          />
          <StatCard
            label="Doanh thu tháng"
            value={
              <>
                {formatPlain(Math.round(s.month_revenue))}{' '}
                <span className="text-xs font-normal text-on-surface-variant">đ</span>
              </>
            }
            sub={`Hôm nay ${formatVND(Math.round(s.today_revenue))}`}
            icon={Wallet}
            iconWrapClassName="bg-emerald-50 text-success"
          />
          <StatCard
            label="Tỷ lệ hủy / hoàn tiền"
            value={
              <>
                {s.cancel_refund_rate.toFixed(1)}
                <span className="text-xs font-normal text-on-surface-variant">%</span>
              </>
            }
            sub={`${s.cancel_month} hủy • ${s.refund_month} hoàn tiền trong tháng`}
            icon={Undo2}
            iconWrapClassName="bg-gray-200 text-gray-700"
          />
          <StatCard
            label="Chờ thanh toán hôm nay"
            value={
              <>
                {s.pending_today_count}{' '}
                <span className="ml-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {formatVND(Math.round(s.pending_today_amount))}
                </span>
              </>
            }
            sub={<span className="text-amber-700/80">Cần thu trong ca hôm nay</span>}
            icon={Clock3}
            iconWrapClassName="bg-amber-100 text-amber-800"
            className="border-amber-200 bg-amber-50/20"
          />
        </>
      )}
    </section>
  );
}
