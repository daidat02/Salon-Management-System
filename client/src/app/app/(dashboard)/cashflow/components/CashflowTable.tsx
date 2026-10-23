'use client';

import * as React from 'react';
import DashTable from '@/components/dashboard/DashTable';
import { TableSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { getApiErrorMessage } from '@/services/apiClient';
import { formatVND } from '@/lib/format';
import { useRouter, useSearchParams } from 'next/navigation';
import useCashFlows from '@/hooks/use-cashflows';
import useApproveCashFlow from '@/hooks/use-approve-cashflow';
import { toast } from '@/components/ui/toast';
import { buildCashflowColumns } from './columns';
import { CashflowApproveDialog } from './CashflowApproveDialog';
import { mapCashflow } from './cashflowUtils';
import type { CashflowVoucher } from './types';

const PAGE_SIZE = 20;

export default function CashflowTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') || '';
  const kind = searchParams.get('kind') || '';
  const categoryId = searchParams.get('category_id') || '';
  const fundId = searchParams.get('fund_id') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sort_by') || '';
  const dateFrom = searchParams.get('date_from') || undefined;
  const dateTo = searchParams.get('date_to') || undefined;
  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10) || 1;

  const page = pageFromUrl || 1;

  const { data, isLoading, isError, error } = useCashFlows({
    search,
    kind,
    categoryId,
    fundId,
    status,
    sortBy,
    dateFrom,
    dateTo,
    page,
    pageSize: PAGE_SIZE,
  });

  const [approveTarget, setApproveTarget] = React.useState<CashflowVoucher | null>(null);
  const [approveError, setApproveError] = React.useState<string | null>(null);
  const { mutate: approveCashflow, isPending: isApproving } = useApproveCashFlow();

  const handleApprove = React.useCallback((row: CashflowVoucher) => {
    setApproveError(null);
    setApproveTarget(row);
  }, []);

  const columns = React.useMemo(
    () => buildCashflowColumns({ onApprove: handleApprove }),
    [handleApprove],
  );
  const rows = React.useMemo(() => (data?.data ?? []).map(mapCashflow), [data]);
  const total = data?.total ?? 0;

  const pageIncome = rows
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);
  const pageExpense = rows
    .filter((r) => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);
  const net = pageIncome - pageExpense;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleConfirmApprove = () => {
    if (!approveTarget) return;

    approveCashflow(approveTarget.id, {
      onSuccess: () => {
        toast.add({
          title: 'Duyệt phiếu thành công',
          description: `${approveTarget.code} • ${formatVND(approveTarget.amount)}`,
          type: 'success',
        });
        setApproveTarget(null);
        setApproveError(null);
      },
      onError: (error) => {
        const message = getApiErrorMessage(error);
        setApproveError(message);
        toast.add({ title: 'Duyệt phiếu thất bại', description: message, type: 'error' });
      },
    });
  };

  const handleApproveOpenChange = (open: boolean) => {
    if (!open) {
      setApproveTarget(null);
      setApproveError(null);
    }
  };

  if (isError) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Không tải được phiếu thu chi: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc kiểm tra
        kết nối API.
      </div>
    );
  }

  if (isLoading && rows.length === 0) {
    return <TableSkeleton rows={6} cols={9} />;
  }

  return (
    <>
      <DashTable
        columns={columns}
        data={rows}
        selectable={false}
        getRowId={(r) => r.id}
        emptyText="Không tìm thấy phiếu thu chi nào"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-on-surface-variant">Tổng trang này:</span>
            <div className="flex flex-wrap items-center gap-6 font-semibold">
              <span className="text-success">Thu: +{formatVND(pageIncome)}</span>
              <span className="text-error">Chi: -{formatVND(pageExpense)}</span>
              <span className="rounded bg-primary-container px-2.5 py-0.5 text-primary">
                Chênh lệch ròng: {net >= 0 ? '+' : '-'}
                {formatVND(Math.abs(net))}
              </span>
            </div>
          </div>
        }
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          totalPages: data?.total_pages,
          itemLabel: 'phiếu thu chi',
          onPageChange: handlePageChange,
        }}
      />

      <CashflowApproveDialog
        voucher={approveTarget}
        open={Boolean(approveTarget)}
        isPending={isApproving}
        error={approveError}
        onOpenChange={handleApproveOpenChange}
        onConfirm={handleConfirmApprove}
      />
    </>
  );
}
