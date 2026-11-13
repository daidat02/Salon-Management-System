'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import DashTable, { type DashColumn } from '@/components/dashboard/DashTable';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { TableSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { toast } from '@/components/ui/toast';
import { useStaffSalaryAdjustments, useDeleteStaffSalaryAdjustment } from '@/hooks/staff';
import { formatDateTime, formatVND } from '@/lib/format';
import { getApiErrorMessage } from '@/services/apiClient';
import type { StaffSalaryAdjustment } from '@/types/staff';

function isAllowance(row: StaffSalaryAdjustment): boolean {
  return row.adjustment_type === 'ALLOWANCE';
}

function isSettled(row: StaffSalaryAdjustment): boolean {
  return !!row.payroll_id;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

type StaffRewardPenaltyTabProps = {
  staffId: string;
  onAddRewardPenalty?: () => void;
};

export default function StaffRewardPenaltyTab({
  staffId,
  onAddRewardPenalty,
}: StaffRewardPenaltyTabProps) {
  const [period, setPeriod] = React.useState(() => format(new Date(), 'yyyy-MM'));
  const [deleting, setDeleting] = React.useState<StaffSalaryAdjustment | null>(null);

  const monthOptions = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      return { value: format(date, 'yyyy-MM'), label: `Tháng ${format(date, 'MM/yyyy')}` };
    });
  }, []);

  const { data = [], isLoading, isFetching, isError, error, refetch } = useStaffSalaryAdjustments(
    staffId,
    period,
  );

  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteStaffSalaryAdjustment();

  const columns = React.useMemo<DashColumn<StaffSalaryAdjustment>[]>(
    () => [
      {
        id: 'effective_date',
        header: 'Ngày áp dụng',
        className: 'whitespace-nowrap',
        cell: (row) => <span className="font-semibold">{formatDate(row.effective_date)}</span>,
      },
      {
        id: 'adjustment_type',
        header: 'Loại',
        cell: (row) =>
          isAllowance(row) ? (
            <Tag variant="success" shape="pill" size="md">
              Thưởng
            </Tag>
          ) : (
            <Tag variant="error" shape="pill" size="md">
              Phạt
            </Tag>
          ),
      },
      {
        id: 'reason',
        header: 'Lý do',
        cell: (row) => (
          <span className="block max-w-[280px] font-semibold text-on-surface">
            {row.reason || '—'}
          </span>
        ),
      },
      {
        id: 'amount',
        header: 'Số tiền',
        className: 'whitespace-nowrap text-right',
        cell: (row) => (
          <span className={`font-bold ${isAllowance(row) ? 'text-emerald-600' : 'text-error'}`}>
            {isAllowance(row) ? '+' : '-'}
            {formatVND(row.amount)}
          </span>
        ),
      },
      {
        id: 'created_at',
        header: 'Ngày tạo',
        className: 'whitespace-nowrap text-on-surface-variant',
        cell: (row) => formatDateTime(row.created_at),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: (row) =>
          isSettled(row) ? (
            <Tag variant="success" shape="pill" size="md">
              Đã chốt
            </Tag>
          ) : (
            <Tag variant="warning" shape="pill" size="md">
              Chờ chốt
            </Tag>
          ),
      },
      {
        id: 'action',
        header: 'Thao tác',
        headerClassName: 'text-right',
        className: 'whitespace-nowrap text-right',
        cell: (row) =>
          isSettled(row) ? (
            <span className="text-outline">—</span>
          ) : (
            <button
              type="button"
              title="Hủy khoản điều chỉnh"
              aria-label="Hủy khoản điều chỉnh"
              onClick={() => setDeleting(row)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-error hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hủy
            </button>
          ),
      },
    ],
    [],
  );

  const totalBonus = data.filter(isAllowance).reduce((sum, row) => sum + row.amount, 0);
  const totalPenalty = data
    .filter((row) => !isAllowance(row))
    .reduce((sum, row) => sum + row.amount, 0);

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutate(deleting.id, {
      onSuccess: () => {
        toast.add({ title: 'Đã hủy khoản điều chỉnh', type: 'success' });
        setDeleting(null);
      },
      onError: (err) => {
        toast.add({ title: 'Hủy thất bại', description: getApiErrorMessage(err), type: 'error' });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Lịch sử Thưởng/Phạt</h2>
        <p className="text-[13px] text-on-surface-variant">
          Các khoản thưởng và phạt phát sinh của nhân viên theo tháng.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-outline bg-surface-container-low p-2">
        <span className="px-1 text-xs text-on-surface-variant">Kỳ lương</span>
        <DashSelect
          value={period}
          onValueChange={setPeriod}
          triggerClassName="w-40"
          options={monthOptions}
        />
        {isFetching && (
          <span className="text-xs text-on-surface-variant" aria-live="polite">
            Đang tải...
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onAddRewardPenalty && (
            <Button variant="outline" size="sm" onClick={onAddRewardPenalty}>
              <Plus className="h-4 w-4" />
              Thêm thưởng phạt
            </Button>
          )}
        </div>
      </div>

      {isError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span>Không tải được lịch sử thưởng/phạt: {getApiErrorMessage(error)}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : isLoading && data.length === 0 ? (
        <TableSkeleton rows={4} cols={7} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="border-r border-outline pr-3">
              <p className="text-xs text-on-surface-variant">Tổng thưởng</p>
              <p className="mt-2 font-semibold text-emerald-600">{formatVND(totalBonus)}</p>
            </div>
            <div className="border-r border-outline pr-3">
              <p className="text-xs text-on-surface-variant">Tổng phạt</p>
              <p className="mt-2 font-semibold text-error">{formatVND(totalPenalty)}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Chênh lệch</p>
              <p className="mt-2 text-xl font-semibold text-primary">
                {formatVND(totalBonus - totalPenalty)}
              </p>
            </div>
          </div>

          <DashTable
            columns={columns}
            data={data}
            getRowId={(row) => row.id}
            selectable={false}
            emptyText="Chưa có khoản thưởng/phạt nào trong tháng này"
          />
        </>
      )}

      <DashDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hủy khoản thưởng/phạt"
        description={
          deleting
            ? `Bạn có chắc muốn hủy khoản ${isAllowance(deleting) ? 'thưởng' : 'phạt'} ${formatVND(
                deleting.amount,
              )}${deleting.reason ? ` — "${deleting.reason}"` : ''}?`
            : undefined
        }
        footer={
          <DashDialogFooter
            onCancel={() => setDeleting(null)}
            onConfirm={handleDelete}
            cancelText="Không"
            confirmText="Hủy khoản này"
            isLoading={isDeleting}
            confirmDisabled={isDeleting}
            loadingText="Đang hủy..."
          />
        }
      >
        <p className="text-xs text-on-surface-variant">
          Khoản điều chỉnh sẽ bị xóa khỏi kỳ lương và không thể hoàn tác.
        </p>
      </DashDialog>
    </div>
  );
}
