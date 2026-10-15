import type { Metadata } from 'next';
import OrdersHeading from './components/OrdersHeading';
import OrdersToolbar from './components/OrdersToolbar';
import OrdersTable from './components/OrdersTable';
import OrderStats from './components/OrderStats';
import { History } from 'lucide-react';

export const metadata: Metadata = { title: 'Đơn hàng | SALON ADMIN' };

export default function DonHangPage() {
  return (
    <div className="space-y-4">
      <OrdersHeading />
      <OrderStats mock />
      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-on-surface">
            <History className="h-4 w-4 text-primary" />
            Lịch sử Đơn Hàng
          </h2>
          <p className="text-[11px] text-on-surface-variant">
            Theo dõi các đơn đã thanh toán, hoàn tất, hủy và hoàn tiền.
          </p>
        </div>
        <OrdersToolbar historyOnly />
        <OrdersTable historyOnly />
      </section>
    </div>
  );
}
