'use client';

import { BadgeCheck, PauseCircle, Scissors, Wallet } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { useServiceStats } from '@/hooks/service';

/** 4 thẻ số liệu dịch vụ từ API stats thật. */
export default function ServicesStats() {
  const { data, isLoading } = useServiceStats();

  const total = data?.total_services ?? 0;
  const active = data?.active_services ?? 0;
  const inactive = data?.inactive_services ?? 0;
  const revenue = data?.service_revenue_month ?? 0;
  const loading = isLoading && !data;
  const rate = total > 0 ? ((active / total) * 100).toFixed(1) : '0.0';
  const val = (v: string) => (loading ? '—' : v);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Tổng dịch vụ"
        value={val(String(total))}
        sub="Tất cả dịch vụ của salon"
        icon={Scissors}
        iconWrapClassName="bg-surface-container text-primary"
      />
      <StatCard
        label="Đang hoạt động"
        value={
          <span className="flex items-baseline justify-between">
            <span>{val(String(active))}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> {loading ? '…' : `${rate}% tỷ lệ`}
            </span>
          </span>
        }
        sub="Sẵn sàng nhận khách đặt lịch"
        icon={BadgeCheck}
        iconWrapClassName="bg-emerald-50 text-success"
      />
      <StatCard
        label="Tạm ngưng / Ẩn"
        value={val(String(inactive))}
        sub="Ngừng nhận khách đặt lịch"
        icon={PauseCircle}
        iconWrapClassName="bg-amber-50 text-warning"
      />
      <StatCard
        label="Doanh thu dịch vụ tháng"
        value={loading ? '—' : `${revenue.toLocaleString('vi-VN')} đ`}
        sub="Tính trên đơn đã hoàn thành"
        icon={Wallet}
        iconWrapClassName="bg-primary-container text-primary"
      />
    </section>
  );
}
