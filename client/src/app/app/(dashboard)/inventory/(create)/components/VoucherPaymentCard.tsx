'use client';

import { CalendarDays, Tag, Wallet } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { formatPlain as formatVND } from '@/lib/format';
import type { Fund } from '@/types/cashflow';
import type { VoucherFormState } from './voucherData';
import type { VoucherTotals } from './voucherUtils';

type VoucherPaymentCardProps = {
  form: VoucherFormState;
  onChange: (patch: Partial<VoucherFormState>) => void;
  totals: VoucherTotals;
  funds: Fund[];
};

export default function VoucherPaymentCard({
  form,
  onChange,
  totals,
  funds,
}: VoucherPaymentCardProps) {
  const paidAmount = Math.max(0, Number(form.paidAmount) || 0);
  const remaining = Math.max(totals.grand - paidAmount, 0);

  return (
    <section className="space-y-4 rounded-xl bg-surface p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-headline text-sm font-semibold tracking-wide text-on-surface uppercase">
        <Wallet className="h-[18px] w-[18px] text-primary" />
        <span>Thanh toán &amp; Chứng từ</span>
      </h3>

      <div className="space-y-3.5">
        <div>
          <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
            Số tiền đã trả
          </Label>
          <DashInput
            type="number"
            min={0}
            max={totals.grand}
            value={form.paidAmount}
            onChange={(e) => onChange({ paidAmount: e.target.value })}
            className="bg-surface-container font-medium"
            placeholder="0"
          />
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => onChange({ paidAmount: String(totals.grand) })}
              className="rounded bg-surface-container px-2 py-0.5 font-medium text-primary hover:bg-outline-variant"
            >
              Trả đủ
            </button>
            <button
              type="button"
              onClick={() => onChange({ paidAmount: '' })}
              className="rounded bg-surface-container px-2 py-0.5 font-medium text-on-surface-variant hover:bg-outline-variant"
            >
              Chưa trả
            </button>
            <span className="ml-auto text-on-surface-variant">
              Còn nợ:{' '}
              <span className="font-semibold text-error">{formatVND(remaining)} đ</span>
            </span>
          </div>
        </div>

        {paidAmount > 0 && (
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Quỹ thanh toán
            </Label>
            <DashSelect
              value={form.fundId}
              onValueChange={(v) => onChange({ fundId: v })}
              options={funds.map((fund) => ({
                label: `${fund.name} (${formatVND(fund.current_balance)} đ)`,
                value: fund.id,
              }))}
              placeholder="Chọn quỹ chi tiền"
              triggerClassName="bg-surface-container font-medium"
            />
          </div>
        )}

        <div>
          <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
            Hạn thanh toán
          </Label>
          <div className="relative">
            <DashInput
              type="date"
              value={form.dueDate}
              onChange={(e) => onChange({ dueDate: e.target.value })}
              className="bg-surface-container pl-8 text-xs"
            />
            <CalendarDays className="pointer-events-none absolute top-1/2 left-2.5 h-[15px] w-[15px] -translate-y-1/2 text-on-surface-variant" />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
            Mã hóa đơn VAT / Phiếu gốc
          </Label>
          <div className="relative">
            <DashInput
              value={form.vatInvoiceCode}
              onChange={(e) => onChange({ vatInvoiceCode: e.target.value })}
              className="bg-surface-container pl-8 text-xs"
              placeholder="Nhập mã hóa đơn VAT / phiếu gốc..."
            />
            <Tag className="pointer-events-none absolute top-1/2 left-2.5 h-[15px] w-[15px] -translate-y-1/2 text-on-surface-variant" />
          </div>
        </div>

        <p className="rounded-md bg-surface-container px-2.5 py-2 text-[11px] text-on-surface-variant">
          Phiếu chi được tạo tự động và duyệt ngay khi lưu nếu đã trả tiền. Số dư quỹ sẽ bị trừ
          tương ứng.
        </p>
      </div>
    </section>
  );
}
