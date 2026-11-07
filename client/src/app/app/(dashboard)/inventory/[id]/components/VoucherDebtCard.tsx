'use client';

import { AlertTriangle, CheckCircle2, Clock3, HandCoins, Plus } from 'lucide-react';
import { formatPlain as formatVND } from '@/lib/format';
import type {
  InventoryDocument,
  InventoryPayment,
  InventoryPaymentStatus,
} from '@/types/inventory';

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
  payments: InventoryPayment[];
  onPay?: () => void;
};

export default function VoucherDebtCard({ document, payments, onPay }: VoucherDebtCardProps) {
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

      {document.payment_status !== 'paid' && onPay && (
        <button
          type="button"
          onClick={onPay}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary/95"
        >
          <Plus className="h-4 w-4" />
          Thanh toán công nợ
        </button>
      )}

      {payments.length > 0 && (
        <div className="space-y-2 border-t border-outline pt-3">
          <div className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
            Lịch sử thanh toán
          </div>
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="rounded-md bg-surface-container px-2.5 py-2 text-[11px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-on-surface">{payment.code}</span>
                <span className="font-semibold text-success">
                  {formatVND(payment.amount)} đ
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-on-surface-variant">
                <span className="truncate">{payment.fund_name}</span>
                <span>
                  {payment.occurred_at
                    ? new Date(payment.occurred_at).toLocaleString('vi-VN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '—'}
                </span>
              </div>
              {payment.description && (
                <div className="mt-0.5 truncate text-on-surface-variant">
                  {payment.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
