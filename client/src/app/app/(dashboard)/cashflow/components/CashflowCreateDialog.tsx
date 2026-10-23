'use client';

import * as React from 'react';
import { ArrowDownCircle, ArrowUpCircle, Info } from 'lucide-react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { DashCombobox } from '@/components/dashboard/DashCombobox';
import { toast } from '@/components/ui/toast';
import useCreateCashFlow from '@/hooks/use-create-cashflow';
import { getApiErrorMessage } from '@/services/apiClient';
import { formatVND } from '@/lib/format';
import { cn } from 'cn';
import type { CashFlowCategory, CashFlowKind, Fund } from '@/types/cashflow';

export type CreateCashflowFormValues = {
  kind: CashFlowKind;
  category_id: string | null;
  fund_id: string;
  amount: number;
  description: string | null;
  occurred_at: string;
};

type CashflowCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories?: CashFlowCategory[];
  funds?: Fund[];
  onSuccess?: () => void;
};

function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function nowDateTimeLocal(): string {
  return toDateTimeLocal(new Date());
}

export function CashflowCreateDialog({
  open,
  onOpenChange,
  categories = [],
  funds = [],
  onSuccess,
}: CashflowCreateDialogProps) {
  const { mutate, isPending } = useCreateCashFlow();
  const [kind, setKind] = React.useState<CashFlowKind>('income');
  const [categoryId, setCategoryId] = React.useState('');
  const [fundId, setFundId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [occurredAt, setOccurredAt] = React.useState(nowDateTimeLocal);
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setKind('income');
      setCategoryId('');
      setFundId('');
      setAmount('');
      setOccurredAt(nowDateTimeLocal());
      setDescription('');
      setError(null);
    }
  }

  const categoryOptions = categories
    .filter((category) => category.is_active && category.kind === kind)
    .map((category) => ({ label: category.name, value: category.id }));

  const fundOptions = funds
    .filter((fund) => fund.is_active)
    .map((fund) => ({ label: fund.name, value: fund.id }));

  const amountValue = Number(amount);

  const handleKindChange = (nextKind: CashFlowKind) => {
    setKind(nextKind);
    setCategoryId('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!fundId) {
      setError('Vui lòng chọn quỹ hạch toán');
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Số tiền phải lớn hơn 0');
      return;
    }

    const occurredDate = new Date(occurredAt);
    if (!occurredAt || Number.isNaN(occurredDate.getTime())) {
      setError('Vui lòng chọn ngày phát sinh hợp lệ');
      return;
    }

    const payload: CreateCashflowFormValues = {
      kind,
      category_id: categoryId || null,
      fund_id: fundId,
      amount: amountValue,
      description: description.trim() || null,
      occurred_at: occurredDate.toISOString(),
    };

    mutate(payload, {
      onSuccess: (created) => {
        toast.add({
          title: 'Tạo phiếu thành công',
          description: `${created.code} • ${formatVND(created.amount)}`,
          type: 'success',
        });
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        const message = getApiErrorMessage(err);
        setError(message);
        toast.add({ title: 'Tạo phiếu thất bại', description: message, type: 'error' });
      },
    });
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Thêm phiếu thu / chi"
      description="Ghi nhận một khoản thu hoặc chi từ quỹ của salon"
      footer={
        <DashDialogFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={() =>
            (document.getElementById('cashflow-create-form') as HTMLFormElement)?.requestSubmit()
          }
          cancelText="Hủy"
          confirmText="Lưu phiếu"
          isLoading={isPending}
          confirmDisabled={isPending}
        />
      }
    >
      <form
        id="cashflow-create-form"
        onSubmit={handleSubmit}
        className="space-y-4 py-4 text-xs"
      >
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <div>
          <Label className="mb-1 block font-semibold text-slate-700">
            Loại phiếu <span className="text-error">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleKindChange('income')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                kind === 'income'
                  ? 'border-emerald-300 bg-emerald-50 text-success'
                  : 'border-outline bg-surface text-on-surface-variant hover:border-emerald-200 hover:text-success',
              )}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Phiếu thu
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('expense')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                kind === 'expense'
                  ? 'border-red-300 bg-red-50 text-error'
                  : 'border-outline bg-surface text-on-surface-variant hover:border-red-200 hover:text-error',
              )}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Phiếu chi
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block font-semibold text-slate-700">
              Số tiền <span className="text-error">*</span>
            </Label>
            <DashInput
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="VD: 500000"
            />
            {amountValue > 0 && Number.isFinite(amountValue) && (
              <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
                {formatVND(amountValue)}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-1 block font-semibold text-slate-700">
              Ngày phát sinh <span className="text-error">*</span>
            </Label>
            <DashInput
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </div>

          <div>
            <Label className="mb-1 block font-semibold text-slate-700">
              Quỹ hạch toán <span className="text-error">*</span>
            </Label>
            <DashSelect
              value={fundId || null}
              onValueChange={setFundId}
              placeholder={fundOptions.length === 0 ? 'Chưa có quỹ khả dụng' : 'Chọn quỹ'}
              disabled={fundOptions.length === 0}
              options={fundOptions}
            />
          </div>

          <div>
            <Label className="mb-1 block font-semibold text-slate-700">Danh mục</Label>
            <DashCombobox
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder="Không phân loại"
              options={categoryOptions}
            />
          </div>
        </div>

        <div>
          <Label className="mb-1 block font-semibold text-slate-700">Diễn giải</Label>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="VD: Thu tiền combo uốn & nhuộm HĐ #INV-001..."
            rows={3}
            className="border-outline bg-surface focus-visible:border-primary"
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            Phiếu sau khi tạo sẽ ở trạng thái <b>Chờ duyệt</b> và chỉ cập nhật số dư quỹ khi được
            duyệt.
          </p>
        </div>
      </form>
    </DashDialog>
  );
}
