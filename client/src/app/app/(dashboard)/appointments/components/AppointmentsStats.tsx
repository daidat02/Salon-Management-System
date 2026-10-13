'use client';

import * as React from 'react';
import { Clock, Users, Wallet } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import useAppointments from '@/hooks/use-appointments';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d;
}

/** ISO8601 kèm offset địa phương (server so sánh timestamp chính xác). */
function toLocalISO(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** 4 thẻ số liệu lịch hẹn hôm nay từ API thật. */
export default function AppointmentsStats() {
  const { data, isLoading } = useAppointments({
    page: 1,
    pageSize: 100,
    from: toLocalISO(startOfToday()),
    to: toLocalISO(endOfToday()),
  });

  const list = React.useMemo(
    () => (data?.data ?? []).filter((a) => a !== null && a !== undefined),
    [data],
  );
  const loading = isLoading && list.length === 0;
  const pending = list.filter((a) => a.status === 'pending').length;
  const serving = list.filter((a) => a.status === 'in_progress' || a.status === 'checked_in').length;
  const done = list.filter((a) => a.status === 'completed').length;
  const cancelled = list.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length;
  const doneRate = list.length > 0 ? Math.round((done / list.length) * 100) : 0;
  const cancelRate = list.length > 0 ? ((cancelled / list.length) * 100).toFixed(1) : '0.0';
  const val = (v: string) => (loading ? '—' : v);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Tổng hôm nay"
        value={
          <>
            {val(String(list.length))}{' '}
            <span className="text-xs font-normal text-on-surface-variant">lịch</span>
          </>
        }
        sub={<span className="font-medium text-warning">● {loading ? '…' : `${pending} đang chờ tiếp nhận`}</span>}
        icon={Clock}
      />
      <StatCard
        label="Đang phục vụ"
        value={
          <>
            {val(String(serving))}{' '}
            <span className="text-xs font-normal text-on-surface-variant">khách</span>
          </>
        }
        sub={<span className="font-medium text-primary">● Đang bận</span>}
        icon={Users}
        iconWrapClassName="bg-blue-50 text-primary"
      />
      <StatCard
        label="Đã hoàn thành"
        value={
          <>
            {val(String(done))}{' '}
            <span className="text-xs font-normal text-on-surface-variant">lịch</span>
          </>
        }
        sub={<span className="font-medium text-success">● {loading ? '…' : `${doneRate}% trong ngày`}</span>}
        icon={Clock}
        iconWrapClassName="bg-emerald-50 text-success"
      />
      <StatCard
        label="Đã hủy / Vắng"
        value={
          <>
            {val(String(cancelled))}{' '}
            <span className="text-xs font-normal text-on-surface-variant">lịch</span>
          </>
        }
        sub={<span className="font-medium text-error">● Tỷ lệ hủy {loading ? '…' : `${cancelRate}%`}</span>}
        icon={Wallet}
        iconWrapClassName="bg-red-50 text-error"
      />
    </section>
  );
}
