'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { endOfDay, startOfDay } from 'date-fns';
import DashTable from '@/components/dashboard/DashTable';
import { TableSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { getApiErrorMessage } from '@/services/apiClient';
import useAppointments from '@/hooks/use-appointments';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { buildAppointmentColumns } from './columns';

const PAGE_SIZE = 20;

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

type Props = {
  onSelect?: (appointment: Appointment) => void;
};

export default function AppointmentsTable({ onSelect }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search')?.trim() || '';
  const rawStatus = searchParams.get('status')?.trim() || '';
  const status: AppointmentStatus | '' = APPOINTMENT_STATUSES.includes(rawStatus as AppointmentStatus)
    ? (rawStatus as AppointmentStatus)
    : '';
  const dateParam = searchParams.get('date')?.trim() || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const selectedDate = React.useMemo(() => {
    if (!dateParam) return null;
    const date = new Date(dateParam);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [dateParam]);

  const from = selectedDate ? startOfDay(selectedDate).toISOString() : '';
  const to = selectedDate ? endOfDay(selectedDate).toISOString() : '';

  const { data, isLoading, isError, error } = useAppointments({
    page,
    pageSize: PAGE_SIZE,
    search,
    status,
    from,
    to,
  });

  const columns = React.useMemo(() => buildAppointmentColumns(), []);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const rows = (data?.data || []).filter(
    (r): r is NonNullable<typeof r> => r !== null && r !== undefined,
  );

  if (isError) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Không tải được danh sách lịch hẹn: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc kiểm
        tra kết nối API.
      </div>
    );
  }

  if (isLoading && rows.length === 0) {
    return <TableSkeleton />;
  }

  return (
    <DashTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      onRowClick={onSelect}
      emptyText={
        search || status || selectedDate
          ? 'Không tìm thấy lịch hẹn phù hợp'
          : 'Chưa có lịch hẹn nào'
      }
      pagination={{
        page,
        pageSize: PAGE_SIZE,
        total: data?.total || 0,
        itemLabel: 'lịch hẹn',
        onPageChange: handlePageChange,
      }}
    />
  );
}
