'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useCreateStaffSalaryAdjustment } from '@/hooks/use-create-staff-salary-adjustment';
import { getApiErrorMessage } from '@/services/apiClient';
import type { StaffSalaryAdjustmentType } from '@/types/staff';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  onSuccess?: () => void;
};

const FORM_ID = 'staff-salary-adjustment-form';

export function StaffRewardPenaltyCreateDialog({ open, onOpenChange, staffId, onSuccess }: Props) {
  const [type, setType] = React.useState<StaffSalaryAdjustmentType>('ALLOWANCE');
  const [period, setPeriod] = React.useState(() => format(new Date(), 'yyyy-MM'));
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const { mutate, isPending } = useCreateStaffSalaryAdjustment();

  const monthOptions = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      return { value: format(date, 'yyyy-MM'), label: `Tháng ${format(date, 'MM/yyyy')}` };
    });
  }, []);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setType('ALLOWANCE');
      setPeriod(format(new Date(), 'yyyy-MM'));
      setAmount('');
      setReason('');
      setError(null);
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Số tiền phải lớn hơn 0');
      return;
    }
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do');
      return;
    }

    mutate(
      {
        staff_id: staffId,
        adjustment_type: type,
        amount: amountValue,
        reason: reason.trim(),
        effective_date: period,
      },
      {
        onSuccess: () => {
          toast.add({
            title: type === 'ALLOWANCE' ? 'Đã tạo khoản thưởng' : 'Đã tạo khoản phạt',
            type: 'success',
          });
          onSuccess?.();
          onOpenChange(false);
        },
        onError: (err) => {
          const message = getApiErrorMessage(err);
          setError(message);
          toast.add({ title: 'Tạo khoản thưởng/phạt thất bại', description: message, type: 'error' });
        },
      },
    );
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tạo khoản thưởng/phạt"
      description="Khoản điều chỉnh sẽ ở trạng thái Chờ chốt cho tới khi bảng lương được chốt."
      footer={
        <DashDialogFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={() =>
            (document.getElementById(FORM_ID) as HTMLFormElement | null)?.requestSubmit()
          }
          cancelText="Hủy"
          confirmText="Tạo khoản"
          isLoading={isPending}
          confirmDisabled={isPending}
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
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Loại <span className="text-error">*</span>
            </Label>
            <DashSelect
              value={type}
              onValueChange={(value) => setType(value as StaffSalaryAdjustmentType)}
              options={[
                { label: 'Thưởng', value: 'ALLOWANCE' },
                { label: 'Phạt', value: 'DEDUCTION' },
              ]}
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Kỳ lương <span className="text-error">*</span>
            </Label>
            <DashSelect value={period} onValueChange={setPeriod} options={monthOptions} />
          </div>
        </div>

        <div>
          <Label htmlFor="salary-adjustment-amount" className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
            Số tiền (VNĐ) <span className="text-error">*</span>
          </Label>
          <DashInput
            id="salary-adjustment-amount"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="VD: 500000"
            required
          />
        </div>

        <div>
          <Label htmlFor="salary-adjustment-reason" className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
            Lý do <span className="text-error">*</span>
          </Label>
          <Textarea
            id="salary-adjustment-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="VD: Thưởng KPI doanh thu tháng 9"
            rows={3}
            className="bg-surface border-outline focus-visible:border-primary"
            required
          />
        </div>
      </form>
    </DashDialog>
  );
}
