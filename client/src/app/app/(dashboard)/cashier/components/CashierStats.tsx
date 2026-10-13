'use client';

import { BadgeCheck, Clock3, Receipt, Wallet } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { cn } from '@/lib/utils';

export type CashierStatNumbers = {
  waitingTotal: number;
  confirmedCount: number;
  pendingCount: number;
  revenueToday: number;
  completedCountToday: number;
};

function formatVND(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export default function CashierStats({ stats }: { stats: CashierStatNumbers }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Tổng đơn chờ hôm nay"
        value={`${stats.waitingTotal} đơn`}
        sub={
          <span className="inline-flex items-center gap-1 font-medium text-success">
            ↗ +12% hôm nay
          </span>
        }
        icon={Receipt}
      />
      <StatCard
        label="Đã xác nhận"
        value={`${String(stats.confirmedCount).padStart(2, '0')} đơn`}
        sub={<span className="font-medium text-primary">Sẵn sàng thu tiền</span>}
        icon={BadgeCheck}
      />
      <StatCard
        label="Chờ xử lý"
        value={<span className="text-amber-600">{stats.pendingCount} đơn</span>}
        sub={<span className="font-medium text-warning">Ưu tiên xử lý</span>}
        icon={Clock3}
        iconWrapClassName="bg-amber-50 text-warning"
        className={cn(stats.pendingCount > 0 && 'border-amber-200 bg-amber-50/20')}
      />
      <StatCard
        label="Doanh thu tại quầy hôm nay"
        value={formatVND(stats.revenueToday)}
        sub={
          <span className="font-medium text-success">Đã thu {stats.completedCountToday} giao dịch</span>
        }
        icon={Wallet}
        iconWrapClassName="bg-emerald-50 text-success"
      />
    </section>
  );
}
