import { Landmark, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';

export default function CashflowStats() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Tổng Thu"
        value="45.200.000 đ"
        sub={
          <span className="flex items-center justify-between">
            <span className="font-semibold text-success">↗ +14.8%</span>
            <span className="text-[11px]">Tháng này (01/10 - 24/10)</span>
          </span>
        }
        icon={TrendingUp}
        iconWrapClassName="bg-emerald-50 text-success"
      />
      <StatCard
        label="Tổng Chi"
        value="28.500.000 đ"
        sub={
          <span className="flex items-center justify-between">
            <span className="font-semibold text-error">↘ -5.2%</span>
            <span className="text-[11px]">Chi phí kiểm soát tốt</span>
          </span>
        }
        icon={TrendingDown}
        iconWrapClassName="bg-rose-50 text-error"
      />
      <StatCard
        label="Lợi Nhuận Thuần"
        value="16.700.000 đ"
        sub={
          <span className="flex items-center justify-between">
            <span className="font-semibold text-primary">↗ +22.4%</span>
            <span className="text-[11px]">Tỷ suất 36.9% doanh thu</span>
          </span>
        }
        icon={Wallet}
        iconWrapClassName="bg-blue-50 text-primary"
      />
      <StatCard
        label="Tồn Quỹ Khả Dụng"
        value="52.000.000 đ"
        sub={
          <span>
            TM: <b className="font-semibold text-on-surface">18.5M</b>
            <span className="mx-1 text-slate-300">|</span> VCB:{' '}
            <b className="font-semibold text-on-surface">33.5M</b>
          </span>
        }
        icon={Landmark}
        iconWrapClassName="bg-indigo-50 text-indigo-600"
      />
    </section>
  );
}
