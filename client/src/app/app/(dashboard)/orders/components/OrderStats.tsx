import { Clock3, Receipt, Undo2, Wallet } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';

// TODO: số liệu mock tạm theo pattern InventoryStats — nối API thống kê khi backend có endpoint.
export default function OrderStats() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </section>
  );
}
