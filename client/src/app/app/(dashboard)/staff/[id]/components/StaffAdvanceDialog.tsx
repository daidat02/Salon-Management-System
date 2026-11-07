'use client';

import * as React from 'react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { DashDatePicker } from '@/components/dashboard/DashDatePicker';
import { DashInput } from '@/components/dashboard/DashInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName?: string;
};

const FORM_ID = 'staff-advance-form';

export function StaffAdvanceDialog({ open, onOpenChange, staffName }: Props) {
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount('');
      setDate(new Date());
      setNote('');
      setError(null);
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Số tiền tạm ứng phải lớn hơn 0');
      return;
    }
    if (!date) {
      setError('Vui lòng chọn ngày tạm ứng');
      return;
    }

    toast.add({
      title: 'Chưa kết nối API tạm ứng',
      description: 'Giao diện đã sẵn sàng, API tạm ứng sẽ được bổ sung sau.',
      type: 'info',
    });
    onOpenChange(false);
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tạm ứng lương"
      description={
        staffName ? `Ghi nhận khoản tạm ứng cho ${staffName}` : 'Ghi nhận khoản tạm ứng của nhân viên'
      }
      footer={
        <DashDialogFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={() =>
            (document.getElementById(FORM_ID) as HTMLFormElement | null)?.requestSubmit()
          }
          cancelText="Hủy"
          confirmText="Ghi nhận tạm ứng"
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4 py-4 text-xs">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label
              htmlFor="staff-advance-amount"
              className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface"
            >
              Số tiền (VNĐ) <span className="text-error">*</span>
            </Label>
            <DashInput
              id="staff-advance-amount"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="VD: 1000000"
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Ngày tạm ứng <span className="text-error">*</span>
            </Label>
            <DashDatePicker value={date} onValueChange={setDate} />
          </div>
        </div>

        <div>
          <Label htmlFor="staff-advance-note" className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
            Ghi chú
          </Label>
          <Textarea
            id="staff-advance-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="VD: Tạm ứng chi tiêu gia đình"
            rows={3}
            className="bg-surface border-outline focus-visible:border-primary"
          />
        </div>
      </form>
    </DashDialog>
  );
}
