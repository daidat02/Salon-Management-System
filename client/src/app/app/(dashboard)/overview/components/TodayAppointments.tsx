'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import DashTable, { type DashColumn } from '@/components/dashboard/DashTable';
import { cn } from '@/lib/utils';
import type { OverviewAppointment } from '@/types/overview';

const STATUS_META: Record<string, { label: string; className: string }> = {
  in_progress: {
    label: 'Đang làm',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  checked_in: {
    label: 'Đã check-in',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  pending: {
    label: 'Chờ',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  confirmed: {
    label: 'Đã xác nhận',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  completed: {
    label: 'Hoàn thành',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const columns: DashColumn<OverviewAppointment>[] = [
  {
    id: 'time',
    header: 'Giờ',
    className: 'px-4 py-3.5 font-semibold text-on-surface whitespace-nowrap',
    cell: (row) => formatTime(row.startTime),
  },
  {
    id: 'customer',
    header: 'Khách hàng',
    className: 'px-4 py-3.5 font-medium text-on-surface',
    cell: (row) => row.customerName || '—',
  },
  {
    id: 'service',
    header: 'Dịch vụ',
    className: 'px-4 py-3.5 text-on-surface-variant max-w-[160px] truncate',
    cell: (row) => row.serviceSummary || '—',
  },
  {
    id: 'staff',
    header: 'Nhân viên',
    className: 'px-4 py-3.5 font-medium text-on-surface',
    cell: (row) => row.staffName || '—',
  },
  {
    id: 'status',
    header: 'Trạng thái',
    className: 'px-4 py-3.5',
    cell: (row) => {
      const meta = STATUS_META[row.status] ?? {
        label: row.status,
        className: 'bg-surface-container text-on-surface-variant border-outline',
      };
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
            meta.className,
          )}
        >
          {meta.label}
        </span>
      );
    },
  },
];

type TodayAppointmentsProps = {
  appointments: OverviewAppointment[];
  total: number;
};

export default function TodayAppointments({ appointments, total }: TodayAppointmentsProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-outline p-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Lịch hẹn hôm nay</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Danh sách khách đặt hẹn theo khung giờ thực tế
          </p>
        </div>
        <Link
          href="/app/appointments"
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
        >
          Xem tất cả ({total})
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="[&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
        <DashTable
          columns={columns}
          data={appointments}
          getRowId={(row) => row.id}
          selectable={false}
          emptyText="Hôm nay chưa có lịch hẹn"
          footer={
            <div className="text-right">
              Hiển thị {appointments.length}/{total} lịch hẹn sắp tới trong ca sáng
            </div>
          }
        />
      </div>
    </div>
  );
}
