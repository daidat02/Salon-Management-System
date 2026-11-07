'use client';

import * as React from 'react';
import DashTable, { type DashColumn } from '@/components/dashboard/DashTable';
import { TableSkeleton } from '@/components/dashboard/DashboardSkeletons';
import useStaffServiceHistory from '@/hooks/use-staff-service-history';
import { getApiErrorMessage } from '@/services/apiClient';
import { formatVND } from '@/lib/format';
import type { StaffServiceHistoryItem } from '@/types/staff';

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
}

function commissionTypeLabel(type: StaffServiceHistoryItem['type']): string {
  switch (type) {
    case 'fixed':
      return 'Cố định';
    case 'profit':
      return 'Theo lợi nhuận';
    default:
      return 'Theo %';
  }
}

const historyColumns: DashColumn<StaffServiceHistoryItem>[] = [
  {
    id: 'order_code',
    header: 'Mã đơn',
    cell: (row) => <span className=" font-medium text-primary text-[11px]">{row.order_code}</span>,
  },
  {
    id: 'service',
    header: 'Dịch vụ',
    cell: (row) => (
      <span className="block max-w-[240px] font-semibold text-on-surface">{row.service_name}</span>
    ),
  },
  {
    id: 'customer',
    header: 'Khách hàng',
    cell: (row) => <span className="font-semibold">{row.customer_name}</span>,
  },
  {
    id: 'created_at',
    header: 'Ngày thực hiện',
    className: 'whitespace-nowrap text-on-surface-variant',
    cell: (row) => formatDate(row.created_at),
  },
  {
    id: 'line_total',
    header: 'Giá trị',
    className: 'whitespace-nowrap text-right font-bold',
    cell: (row) => formatVND(row.line_total),
  },
  {
    id: 'commission',
    header: 'Hoa hồng',
    className: 'whitespace-nowrap text-right',
    cell: (row) => (
      <span>
        <span className="block font-bold text-emerald-600">{formatVND(row.commission_amount)}</span>
        <span className="block text-[10px] text-on-surface-variant">
          {commissionTypeLabel(row.type)}
          {row.type !== 'fixed' ? ` • ${row.share_pct}%` : ''}
        </span>
      </span>
    ),
  },
  {
    id: 'quality',
    header: 'Chất lượng ca',
    className: 'whitespace-nowrap text-right',
    cell: () => <span className="text-[11px] text-on-surface-variant">Chưa có dữ liệu</span>,
  },
];

type StaffHistoryTabProps = {
  staffId: string;
  staffName: string;
};

export default function StaffHistoryTab({ staffId, staffName }: StaffHistoryTabProps) {
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError, error } = useStaffServiceHistory(staffId, {
    page,
    pageSize: PAGE_SIZE,
  });

  const summary = data?.summary;
  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Lịch sử dịch vụ</h2>
        <p className="text-[13px] text-on-surface-variant">
          Các dịch vụ đã hoàn thành bởi {staffName}.
        </p>
      </div>

      {!isError && (
        <div className="grid grid-cols-3 gap-3">
          <div className="border-r border-outline pr-3">
            <p className="text-xs text-on-surface-variant">Đã hoàn thành</p>
            <p className="mt-2 text-xl font-semibold text-on-surface">
              {summary ? summary.total_orders : '—'}{' '}
              <span className="text-xs font-normal text-on-surface-variant">đơn</span>
            </p>
          </div>
          <div className="border-r border-outline pr-3">
            <p className="text-xs text-on-surface-variant">Tổng giá trị</p>
            <p className="mt-2 font-semibold text-on-surface">
              {summary ? formatVND(summary.total_amount_value) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant">Hoa hồng nhận được</p>
            <p className="mt-2 font-semibold text-success">
              {summary ? formatVND(summary.total_commission) : '—'}
            </p>
          </div>
        </div>
      )}

      {isError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Không tải được lịch sử dịch vụ: {getApiErrorMessage(error)}
        </div>
      ) : isLoading && !data ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <>
          <DashTable
            columns={historyColumns}
            data={rows}
            getRowId={(row) => row.id}
            selectable={false}
            emptyText="Chưa có lịch sử dịch vụ trong kỳ này"
            pagination={
              data && data.total > 0
                ? {
                    page: data.page,
                    pageSize: data.page_size,
                    total: data.total,
                    totalPages: data.total_pages,
                    itemLabel: 'dịch vụ',
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        </>
      )}
    </div>
  );
}
