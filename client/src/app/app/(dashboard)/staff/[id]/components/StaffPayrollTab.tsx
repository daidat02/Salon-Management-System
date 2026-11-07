'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { isAxiosError } from 'axios';
import { Banknote } from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import { Button } from '@/components/ui/button';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { DashDateRangePicker } from '@/components/dashboard/DashDateRangePicker';
import { DashSelect } from '@/components/dashboard/DashSelect';
import DashTabs from '@/components/dashboard/DashTabs';
import { toast } from '@/components/ui/toast';
import useStaffPayroll from '@/hooks/use-staff-payroll';
import { useCreateStaffPayroll } from '@/hooks/use-create-staff-payroll';
import { formatVND } from '@/lib/format';
import { getApiErrorMessage } from '@/services/apiClient';
import type { Staff, StaffPayroll } from '@/types/staff';
import { StaffAdvanceDialog } from './StaffAdvanceDialog';

const STANDARD_WORKING_DAYS = 26;

function getMonthRange(value: string): DateRange {
  const [year, month] = value.split('-').map(Number);
  return {
    from: new Date(year, month - 1, 1),
    to: new Date(year, month, 0),
  };
}

function getCurrentMonthRange(): DateRange {
  return getMonthRange(format(new Date(), 'yyyy-MM'));
}

function toApiDate(date: Date | undefined): string | undefined {
  return date ? format(date, 'yyyy-MM-dd') : undefined;
}

function formatPeriodDate(value: string | undefined): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function signedVND(value: number, sign: '+' | '−'): string {
  return `${sign}${formatVND(value)}`;
}

function getDeductionSub(payroll: StaffPayroll): string | undefined {
  const parts = [
    payroll.adjustment_deduction > 0
      ? `khấu trừ ${formatVND(payroll.adjustment_deduction)}`
      : '',
    payroll.penalty_amount > 0 ? `phạt ${formatVND(payroll.penalty_amount)}` : '',
  ].filter(Boolean);

  return parts.length > 0 ? `(${parts.join(' • ')})` : undefined;
}

function StaffPayrollSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-lg bg-surface-container" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-surface-container" />
    </div>
  );
}

function PayrollContent({
  payroll,
  staff,
  periodLabel,
  settled,
  canSettle,
  isSettling,
  onSettle,
}: {
  payroll: StaffPayroll;
  staff: Staff;
  periodLabel: string;
  settled: boolean;
  canSettle: boolean;
  isSettling: boolean;
  onSettle: () => void;
}) {
  const grossPay =
    payroll.prorated_base_salary + payroll.total_commission + payroll.bonus_amount;
  const deductionSub = getDeductionSub(payroll);
  const bankAccount =
    staff.bank_name && staff.bank_account_number
      ? `${staff.bank_name} • **** ${staff.bank_account_number.slice(-4)}`
      : 'Chưa cập nhật tài khoản nhận lương';

  const rows = [
    {
      label: 'Lương cứng theo ngày công',
      sub: `(${payroll.actual_working_days}/${payroll.standard_working_days})`,
      value: formatVND(payroll.prorated_base_salary),
      valueClass: 'font-bold text-on-surface',
    },
    {
      label: 'Hoa hồng dịch vụ',
      sub: `(${payroll.total_items} dịch vụ)`,
      value: signedVND(payroll.total_commission, '+'),
      valueClass: 'font-bold text-primary',
    },
    {
      label: 'Thưởng / phụ cấp',
      sub: undefined,
      value: signedVND(payroll.bonus_amount, '+'),
      valueClass: 'font-bold text-amber-700',
    },
    {
      label: 'Khấu trừ / Phạt',
      sub: deductionSub,
      value: signedVND(payroll.total_deduction, '−'),
      valueClass: 'font-bold text-error',
    },
    {
      label: 'Tạm ứng',
      sub: undefined,
      value: signedVND(payroll.advance_amount, '−'),
      valueClass: 'font-bold text-on-surface-variant',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sm:border-r sm:border-outline sm:pr-3">
          <p className="text-xs text-on-surface-variant">Hoa hồng kỳ này</p>
          <p className="mt-2 font-semibold text-success">{formatVND(payroll.total_commission)}</p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">
            {payroll.total_orders} đơn phục vụ
          </p>
        </div>
        <div className="sm:border-r sm:border-outline sm:pr-3">
          <p className="text-xs text-on-surface-variant">Số đơn phục vụ</p>
          <p className="mt-2 text-xl font-semibold text-on-surface">
            {payroll.total_orders}{' '}
            <span className="text-xs font-normal text-on-surface-variant">đơn</span>
          </p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">
            {payroll.total_items} dịch vụ
          </p>
        </div>
        <div className="sm:border-r sm:border-outline sm:pr-3">
          <p className="text-xs text-on-surface-variant">Ngày công</p>
          <p className="mt-2 text-xl font-semibold text-on-surface">
            {payroll.actual_working_days}{' '}
            <span className="text-xs font-normal text-on-surface-variant">
              / {payroll.standard_working_days} ngày
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">
            Nghỉ {payroll.total_leave_days} ngày
          </p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">Tạm tính lương</p>
          <p className="mt-2 font-semibold text-primary">{formatVND(grossPay)}</p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">
            Cứng {formatVND(payroll.prorated_base_salary)} + hoa hồng
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-xl border border-outline bg-white">
          <div className="border-b border-outline bg-surface-header px-4 py-3 text-[13px] font-bold">
            Chi tiết cấu thành lương — {periodLabel}
          </div>
          <ul className="divide-y divide-outline text-[13px]">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span>
                  {row.label}{' '}
                  {row.sub && (
                    <span className="text-[11px] text-on-surface-variant">{row.sub}</span>
                  )}
                </span>
                <span className={row.valueClass}>{row.value}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 bg-on-surface px-4 py-3.5 text-white">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                Tổng thực lĩnh (Net Salary)
              </p>
              <p className="text-[11px] text-slate-400">Chuyển khoản • {bankAccount}</p>
            </div>
            <p className="text-xl font-bold text-emerald-300">{formatVND(payroll.net_pay)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-outline bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Trạng thái kỳ lương
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Tag variant={settled ? 'success' : 'warning'} shape="pill" size="md">
                {settled ? 'ĐÃ CHỐT' : 'TẠM TÍNH'}
              </Tag>
              <span className="text-[11px] text-on-surface-variant">
                Đến {formatPeriodDate(payroll.date_to)}
              </span>
            </div>
            <Button
              size="sm"
              disabled={settled || !canSettle || isSettling}
              onClick={onSettle}
              className="mt-3.5 w-full"
              title={
                settled
                  ? 'Kỳ lương này đã được chốt'
                  : canSettle
                    ? 'Chốt bảng lương cho kỳ đã chọn'
                    : 'Chọn chế độ Tháng để chốt lương'
              }
            >
              {settled ? 'Đã chốt lương' : isSettling ? 'Đang chốt...' : 'Chốt lương'}
            </Button>
          </div>

          <div className="rounded-xl border border-dashed border-outline bg-white p-3.5 text-[13px]">
            <p className="mb-2 font-bold">Thông tin kỳ lương</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-on-surface-variant">Từ ngày</span>
                <span className="font-medium">{formatPeriodDate(payroll.date_from)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-on-surface-variant">Đến ngày</span>
                <span className="font-medium">{formatPeriodDate(payroll.date_to)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-on-surface-variant">Ngày công chuẩn</span>
                <span className="font-medium">{payroll.standard_working_days} ngày</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-on-surface-variant">Doanh thu dịch vụ</span>
                <span className="font-medium">{formatVND(payroll.total_amount_value)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function StaffPayrollTab({ staff }: { staff: Staff }) {
  const [cycleMode, setCycleMode] = React.useState<'month' | 'custom'>('month');
  const [cycle, setCycle] = React.useState(() => format(new Date(), 'yyyy-MM'));
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>(
    getCurrentMonthRange,
  );
  const [confirmSettleOpen, setConfirmSettleOpen] = React.useState(false);
  const [advanceOpen, setAdvanceOpen] = React.useState(false);
  const [settledCycle, setSettledCycle] = React.useState<string | null>(null);
  const { mutate: settleMutate, isPending: isSettling } = useCreateStaffPayroll();

  const monthOptions = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const value = format(date, 'yyyy-MM');
      return { value, label: `Tháng ${format(date, 'MM/yyyy')}` };
    });
  }, []);

  const activeRange = cycleMode === 'month' ? getMonthRange(cycle) : customRange;
  const dateFrom = toApiDate(activeRange?.from);
  const dateTo = toApiDate(activeRange?.to);
  const ready = Boolean(dateFrom && dateTo);

  const { data, isLoading, isFetching, isError, error, refetch } = useStaffPayroll(
    staff.id,
    dateFrom,
    dateTo,
    STANDARD_WORKING_DAYS,
  );

  const periodLabel = data
    ? `${formatPeriodDate(data.date_from)} - ${formatPeriodDate(data.date_to)}`
    : '—';

  const canSettle = cycleMode === 'month';
  const settled = settledCycle === cycle;
  const cycleLabel = cycle.split('-').reverse().join('/');

  const handleSettle = () => {
    settleMutate(
      { id: staff.id, targetMonth: cycle },
      {
        onSuccess: () => {
          toast.add({
            title: 'Đã chốt lương',
            description: `Kỳ tháng ${cycleLabel}`,
            type: 'success',
          });
          setSettledCycle(cycle);
          setConfirmSettleOpen(false);
        },
        onError: (err) => {
          if (isAxiosError(err) && err.response?.status === 409) setSettledCycle(cycle);
          toast.add({
            title: 'Chốt lương thất bại',
            description: getApiErrorMessage(err),
            type: 'error',
          });
          setConfirmSettleOpen(false);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Bảng lương chi tiết</h2>
        <p className="text-[13px] text-on-surface-variant">
          Tổng hợp thu nhập theo chu kỳ — đối soát trước khi chốt lương.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-outline bg-surface-container-low p-2">
        <DashTabs
          value={cycleMode}
          onValueChange={(value) => {
            const nextMode = value as 'month' | 'custom';
            if (nextMode === 'custom') setCustomRange(getMonthRange(cycle));
            setCycleMode(nextMode);
          }}
          items={[
            { value: 'month', label: 'Tháng' },
            { value: 'custom', label: 'Tùy chọn' },
          ]}
        />
        {cycleMode === 'month' ? (
          <DashSelect
            value={cycle}
            onValueChange={setCycle}
            triggerClassName="w-40"
            options={monthOptions}
          />
        ) : (
          <DashDateRangePicker
            value={customRange}
            onValueChange={setCustomRange}
            triggerClassName="min-w-[240px]"
          />
        )}
        {isFetching && (
          <span className="text-xs text-on-surface-variant" aria-live="polite">
            Đang tải...
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setAdvanceOpen(true)}
        >
          <Banknote className="h-4 w-4" />
          Tạm ứng
        </Button>
      </div>

      {!ready ? (
        <div className="rounded-xl border border-dashed border-outline bg-white p-6 text-center text-sm text-on-surface-variant">
          Chọn đầy đủ khoảng ngày để xem bảng lương.
        </div>
      ) : isError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span>Không tải được bảng lương: {getApiErrorMessage(error)}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : isLoading && !data ? (
        <StaffPayrollSkeleton />
      ) : data ? (
        <PayrollContent
          payroll={data}
          staff={staff}
          periodLabel={periodLabel}
          settled={settled}
          canSettle={canSettle}
          isSettling={isSettling}
          onSettle={() => setConfirmSettleOpen(true)}
        />
      ) : null}

      <DashDialog
        open={confirmSettleOpen}
        onOpenChange={setConfirmSettleOpen}
        title="Chốt lương"
        description={`Chốt bảng lương kỳ tháng ${cycleLabel} của ${staff.full_name}?`}
        footer={
          <DashDialogFooter
            onCancel={() => setConfirmSettleOpen(false)}
            onConfirm={handleSettle}
            cancelText="Hủy"
            confirmText="Chốt lương"
            isLoading={isSettling}
            confirmDisabled={isSettling}
            loadingText="Đang chốt..."
          />
        }
      >
        <p className="text-xs text-on-surface-variant">
          Sau khi chốt, bảng lương được ghi nhận theo số liệu hiện tại và không thể tạo lại cho kỳ
          này. Các khoản thưởng/phạt trong kỳ cũng sẽ chuyển sang trạng thái Đã chốt.
        </p>
      </DashDialog>

      <StaffAdvanceDialog
        open={advanceOpen}
        onOpenChange={setAdvanceOpen}
        staffName={staff.full_name}
      />
    </div>
  );
}
