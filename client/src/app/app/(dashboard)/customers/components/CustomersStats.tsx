'use client';

import { Crown, UserPlus, Users, Wallet } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { useCustomerStats } from '@/hooks/customer';

/** 4 thẻ số liệu tệp khách: 3 thẻ từ API stats thật + thẻ VIP giữ số hiện tại. */
export default function CustomersStats() {
  const { data, isLoading } = useCustomerStats();

  const total = data?.total_customer ?? 0;
  const newThisMonth = data?.total_new_customer ?? 0;
  const newLastMonth = data?.total_new_customer_last_month ?? 0;
  const points = data?.total_outstanding_points ?? 0;
  const loading = isLoading && !data;

  const growth =
    newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : 0;
  const growthText = loading
    ? '…'
    : `${growth >= 0 ? '↗ +' : '↘ '}${growth}% so với tháng trước`;

  const val = (v: string) => (loading ? '—' : v);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Tổng khách hàng"
        value={val(total.toLocaleString('vi-VN'))}
        sub={
          <span className="inline-flex items-center gap-1 font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />{' '}
            {loading ? '…' : `+${newThisMonth} tháng này`}
          </span>
        }
        icon={Users}
        iconWrapClassName="bg-blue-50 text-primary"
      />
      <StatCard
        label="Khách hàng VIP"
        value="186"
        sub={
          <span className="inline-flex items-center gap-1 font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> 15% tổng tệp khách
          </span>
        }
        icon={Crown}
        iconWrapClassName="bg-amber-50 text-amber-600"
      />
      <StatCard
        label="Khách mới tháng này"
        value={val(String(newThisMonth))}
        sub={<span className="font-medium text-success">{growthText}</span>}
        icon={UserPlus}
        iconWrapClassName="bg-emerald-50 text-success"
      />
      <StatCard
        label="Điểm tích lũy lưu hành"
        value={val(points.toLocaleString('vi-VN'))}
        sub={
          <span>
            Quy đổi:{' '}
            <span className="font-semibold text-on-surface">
              ~{loading ? '…' : `${(points * 100).toLocaleString('vi-VN')} đ`}
            </span>
          </span>
        }
        icon={Wallet}
        iconWrapClassName="bg-indigo-50 text-indigo-600"
      />
    </section>
  );
}
