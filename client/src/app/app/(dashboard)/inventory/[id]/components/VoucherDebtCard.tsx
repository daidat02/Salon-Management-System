'use client';

import { AlertTriangle, CheckCircle2, Clock3, HandCoins } from 'lucide-react';
import { formatPlain as formatVND } from '@/lib/format';
import type { InventoryDocument, InventoryPaymentStatus } from '@/types/inventory';

const statusMeta: Record<
  InventoryPaymentStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  paid: {
    label: 'Đã thanh toán đủ',
    className: 'bg-success/10 text-success',
    icon: CheckCircle2,
  },
  partial: {
    label: 'Thanh toán một phần',
    className: 'bg-amber-500/10 text-amber-600',
    icon: Clock3,
  },
  unpaid: {
    label: 'Chưa thanh toán',
    className: 'bg-error/10 text-error',
    icon: AlertTriangle,
  },
  not_tracked: {
    label: 'Không theo dõi công nợ',
    className: 'bg-surface-container text-on-surface-variant',
    icon: Clock3,
  },
};

type VoucherDebtCardProps = {
  document: InventoryDocument;
};

export default function VoucherDebtCard({ document }: VoucherDebtCardProps) {
  if (!document.payment_tracked) return null;

  const meta = statusMeta[document.payment_status];
  const Icon = meta.icon;
  const dueDate = document.due_date ? document.due_date.slice(0, 10) : null;

  return (
    <section className="space-y-4 rounded-xl bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-headline text-sm font-semibold tracking-wide text-on-surface uppercase">
          <HandCoins className="h-[18px] w-[18px] text-primary" />
          <span>Công nợ nhà cung cấp</span>
        </h3>
        <span
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span>Tổng phải trả</span>
          <span className="font-medium text-on-surface">{formatVND(document.total_amount)} đ</span>
        </div>
        <div className="flex items-center justify-between text-on-surface-variant">
          <span>Đã trả</span>
          <span className="font-medium text-success">{formatVND(document.paid_amount)} đ</span>
        </div>
        <div className="flex items-center justify-between text-on-surface-variant">
          <span>Còn nợ</span>
          <span className="font-semibold text-error">
            {formatVND(document.remaining_amount)} đ
          </span>
        </div>
        {dueDate && (
          <div className="flex items-center justify-between text-on-surface-variant">
            <span>Hạn thanh toán</span>
            <span
              className={`font-medium ${document.is_overdue ? 'text-error' : 'text-on-surface'}`}
            >
              {dueDate}
              {document.is_overdue ? ' (quá hạn)' : ''}
            </span>
          </div>
        )}
        {document.invoice_code && (
          <div className="flex items-center justify-between text-on-surface-variant">
            <span>Mã hóa đơn VAT</span>
            <span className="font-medium text-on-surface">{document.invoice_code}</span>
          </div>
        )}
      </div>
    </section>
  );
}
