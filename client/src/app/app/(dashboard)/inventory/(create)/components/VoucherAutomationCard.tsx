'use client';

import { CircleCheck, SlidersHorizontal } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { VoucherFormState } from './voucherData';

type VoucherAutomationCardProps = {
  form: VoucherFormState;
  onComplete?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

export default function VoucherAutomationCard({
  form,
  onComplete,
  isSubmitting,
  submitLabel = 'Hoàn tất & Cập nhật Kho',
}: VoucherAutomationCardProps) {
  return (
    <section className="space-y-4 rounded-xl bg-surface p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-headline text-sm font-semibold tracking-wide text-on-surface uppercase">
        <SlidersHorizontal className="h-[18px] w-[18px] text-primary" />
        <span>Thiết lập tự động hóa</span>
      </h3>

      <div className="flex items-start justify-between gap-3">
        <div className="text-xs">
          <div className="font-medium text-on-surface">Cộng tồn kho tức thì</div>
          <div className="text-[11px] text-on-surface-variant">
            Tăng số lượng tồn của kho ngay khi bấm lưu phiếu
          </div>
        </div>
        <Switch checked={form.autoAddStock} disabled className="shrink-0" />
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => onComplete?.()}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-on-primary shadow-md transition-all hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CircleCheck className="h-[18px] w-[18px]" />
          <span>{isSubmitting ? 'Đang lưu phiếu…' : submitLabel}</span>
        </button>
        <p className="mt-2 text-center text-[10px] text-on-surface-variant">
          Phím tắt nhanh:{' '}
          <kbd className="rounded bg-surface-container px-1.5 py-0.5 font-mono">
            Ctrl + Enter
          </kbd>{' '}
          để hoàn tất
        </p>
      </div>
    </section>
  );
}
