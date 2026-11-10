'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import DashTable, { type DashColumn } from '@/components/dashboard/DashTable';
import { cn } from '@/lib/utils';
import { formatPlain } from '@/lib/format';
import type { OverviewOrder } from '@/types/overview';

const PAYMENT_STATUS_META: Record<
  OverviewOrder['paymentStatus'],
  { label: string; className: string }
> = {
  paid: {
    label: 'Đã thanh toán',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  unpaid: {
    label: 'Chưa thanh toán',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const columns: DashColumn<OverviewOrder>[] = [
  {
    id: 'code',
    header: 'Mã đơn',
    className: 'px-4 py-3.5 font-bold text-primary whitespace-nowrap',
    cell: (row) => `#${row.code}`,
  },
  {
    id: 'customer',
    header: 'Khách hàng',
    className: 'px-4 py-3.5 font-medium text-on-surface',
    cell: (row) => row.customerName || 'Khách lẻ',
  },
  {
    id: 'summary',
    header: 'Dịch vụ/Sản phẩm',
    className: 'px-4 py-3.5 text-on-surface-variant max-w-[150px] truncate',
    cell: (row) => row.summary || '—',
  },
  {
    id: 'total',
    header: 'Tổng tiền',
    className: 'px-4 py-3.5 font-semibold text-on-surface whitespace-nowrap',
    cell: (row) => `${formatPlain(row.totalAmount)}₫`,
  },
  {
    id: 'payment',
    header: 'Thanh toán',
    className: 'px-4 py-3.5',
    cell: (row) => {
      const meta = PAYMENT_STATUS_META[row.paymentStatus];
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
            meta.className,
          )}
        >
          {meta.label}
        </span>
      );
    },
  },
];

type RecentOrdersProps = {
  orders: OverviewOrder[];
  total: number;
};

export default function RecentOrders({ orders, total }: RecentOrdersProps) {
  const displayedTotal = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-outline bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-outline p-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Đơn hàng gần đây</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Cập nhật hóa đơn thanh toán trực tiếp tại quầy
          </p>
        </div>
        <Link
          href="/app/orders"
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
        >
          Xem tất cả ({total})
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="[&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
        <DashTable
          columns={columns}
          data={orders}
          getRowId={(row) => row.id}
          selectable={false}
          emptyText="Chưa có đơn hàng nào"
          footer={
            <div className="text-right">
              Tổng giá trị đơn hiển thị: {formatPlain(displayedTotal)}₫
            </div>
          }
        />
      </div>
    </div>
  );
}
