'use client';

import { useState } from 'react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import useAddInventoryPayment from '@/hooks/use-add-inventory-payment';
import useFunds from '@/hooks/use-funds';
import { formatPlain as formatVND } from '@/lib/format';
import { getApiErrorMessage } from '@/services/apiClient';
import type { InventoryDocument, InventoryDocumentDetail } from '@/types/inventory';

type VoucherPaymentDialogProps = {
  document: InventoryDocument;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (detail: InventoryDocumentDetail) => void;
};

const labelClass = 'mb-1.5 block min-w-0 text-xs font-semibold text-on-surface';

export default function VoucherPaymentDialog({
  document,
  onOpenChange,
  onSuccess,
}: VoucherPaymentDialogProps) {
  const { data: funds = [] } = useFunds(true);
  const defaultFund =
    funds.find((fund) => fund.is_default && fund.is_active) ??
    funds.find((fund) => fund.is_active) ??
    funds[0];
  const [amount, setAmount] = useState(String(document.remaining_amount));
  const [fundId, setFundId] = useState(defaultFund?.id ?? '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const { mutate, isPending } = useAddInventoryPayment(document.id);

  const effectiveFundId = fundId || defaultFund?.id || '';
  const paidAmount = Number(amount) || 0;

  const handleSubmit = () => {
    if (paidAmount <= 0) {
      setError('Số tiền thanh toán phải lớn hơn 0');
      return;
    }
    if (paidAmount > document.remaining_amount) {
      setError('Số tiền trả vượt quá số còn nợ');
      return;
    }
    if (!effectiveFundId) {
      setError('Vui lòng chọn quỹ thanh toán');
      return;
    }
    setError('');
    mutate(
      {
        fund_id: effectiveFundId,
        amount: paidAmount,
        note: note.trim() || null,
      },
      {
        onSuccess: (detail) => {
          toast.add({
            title: 'Đã ghi nhận thanh toán',
            description: `${formatVND(paidAmount)} đ cho phiếu ${document.document_code}`,
            type: 'success',
          });
          onSuccess?.(detail);
          onOpenChange(false);
        },
        onError: (err) => {
          const message = getApiErrorMessage(err);
          setError(message);
          toast.add({ title: 'Thanh toán thất bại', description: message, type: 'error' });
        },
      },
    );
  };

  return (
    <DashDialog
      open
      onOpenChange={onOpenChange}
      title="Thanh toán công nợ"
      description={`Phiếu ${document.document_code} còn nợ ${formatVND(document.remaining_amount)} đ`}
      maxWidth="max-w-[520px]"
      footer={
        <DashDialogFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={handleSubmit}
          confirmText="Xác nhận thanh toán"
          loadingText="Đang xử lý..."
          isLoading={isPending}
        />
      }
    >
      <div className="space-y-3 pt-4">
        <div>
          <Label className={labelClass}>Số tiền thanh toán *</Label>
          <DashInput
            type="number"
            min={1}
            max={document.remaining_amount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-surface-container font-medium"
            autoFocus
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>
              Còn nợ: <span className="font-semibold text-error">{formatVND(document.remaining_amount)} đ</span>
            </span>
            <button
              type="button"
              onClick={() => setAmount(String(document.remaining_amount))}
              className="rounded bg-surface-container px-2 py-0.5 font-medium text-primary hover:bg-outline-variant"
            >
              Trả hết
            </button>
          </div>
        </div>

        <div>
          <Label className={labelClass}>Quỹ thanh toán *</Label>
          <DashSelect
            value={effectiveFundId}
            onValueChange={setFundId}
            options={funds.map((fund) => ({
              label: `${fund.name} (${formatVND(fund.current_balance)} đ)`,
              value: fund.id,
            }))}
            placeholder="Chọn quỹ chi tiền"
            triggerClassName="bg-surface-container font-medium"
          />
        </div>

        <div>
          <Label className={labelClass}>Ghi chú</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: trả đợt 1..."
            className="min-h-20 bg-surface-container text-xs"
          />
        </div>
        {error && <p className="text-[11px] text-error">{error}</p>}
      </div>
    </DashDialog>
  );
}
