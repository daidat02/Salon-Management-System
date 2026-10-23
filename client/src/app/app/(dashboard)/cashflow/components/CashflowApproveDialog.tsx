'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { Tag } from '@/components/ui/tag';
import { formatVND } from '@/lib/format';
import { cn } from 'cn';
import type { CashflowVoucher } from './types';

type CashflowApproveDialogProps = {
  voucher: CashflowVoucher | null;
  open: boolean;
  isPending: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-outline py-2.5 last:border-b-0">
      <span className="shrink-0 text-on-surface-variant">{label}</span>
      <span className="text-right font-medium text-on-surface">{children}</span>
    </div>
  );
}

export function CashflowApproveDialog({
  voucher,
  open,
  isPending,
  error,
  onOpenChange,
  onConfirm,
}: CashflowApproveDialogProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) onOpenChange(nextOpen);
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Duyệt phiếu thu / chi"
      description="Kiểm tra thông tin trước khi cập nhật số dư quỹ"
      maxWidth="max-w-[480px]"
      footer={
        <DashDialogFooter
          onCancel={() => handleOpenChange(false)}
          onConfirm={onConfirm}
          cancelText="Hủy"
          confirmText="Duyệt phiếu"
          loadingText="Đang duyệt..."
          isLoading={isPending}
          confirmDisabled={isPending || !voucher}
        />
      }
    >
      {voucher && (
        <div className="py-2 text-xs">
          {error && (
            <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
              {error}
            </div>
          )}
          <InfoRow label="Mã phiếu">{voucher.code}</InfoRow>
          <InfoRow label="Loại">
            {voucher.type === 'income' ? (
              <Tag variant="success" shape="pill" size="sm">
                <ArrowDown className="h-3 w-3" />
                Thu
              </Tag>
            ) : (
              <Tag variant="error" shape="pill" size="sm">
                <ArrowUp className="h-3 w-3" />
                Chi
              </Tag>
            )}
          </InfoRow>
          <InfoRow label="Số tiền">
            <span
              className={cn(
                'font-bold',
                voucher.type === 'income' ? 'text-success' : 'text-error',
              )}
            >
              {voucher.type === 'income' ? '+' : '-'}
              {formatVND(voucher.amount)}
            </span>
          </InfoRow>
          <InfoRow label="Quỹ">{voucher.fund}</InfoRow>
          <InfoRow label="Diễn giải">
            <span className="block max-w-[260px]">{voucher.description}</span>
          </InfoRow>

          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            {voucher.type === 'income'
              ? 'Duyệt phiếu thu sẽ cộng số tiền vào số dư quỹ ngay lập tức.'
              : 'Duyệt phiếu chi sẽ trừ số tiền khỏi số dư quỹ ngay lập tức.'}
          </div>
        </div>
      )}
    </DashDialog>
  );
}
