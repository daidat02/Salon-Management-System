'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DashTable, { type DashColumn } from '@/components/dashboard/DashTable';
import { Tag } from '@/components/ui/tag';
import { Button } from '@/components/ui/button';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { DashDialog } from '@/components/dashboard/DashDialog';
import { Field } from '../../components/StaffFormParts';
import {
  SHIFT_OPTIONS,
  mockLeaveBalance,
  mockLeaves,
  mockWeek,
  type LeaveRow,
  type WeekShift,
} from './mock';

// Tab Ngày nghỉ & Ca: lịch phân ca theo tuần + quản lý ngày phép + dialog thêm ngày nghỉ.

const WEEK_BASE = new Date(2026, 9, 12);
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
const fmtDay = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
const fmtInputDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export default function StaffScheduleTab() {
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [week, setWeek] = React.useState(mockWeek);
  const [editingWeek, setEditingWeek] = React.useState(false);
  const weekDate = (i: number) => fmtDay(addDays(WEEK_BASE, weekOffset * 7 + i));
  const weekRange = `${weekDate(0)} – ${weekDate(6)}/2026`;
  const setWeekShift = (i: number, shift: WeekShift) =>
    setWeek((prev) =>
      prev.map((d, j) =>
        j === i
          ? {
              ...d,
              shift,
              shiftLabel:
                shift === 'morning' ? 'Ca sáng' : shift === 'afternoon' ? 'Ca chiều' : 'Nghỉ',
              time:
                shift === 'morning'
                  ? '08:00 – 16:00'
                  : shift === 'afternoon'
                    ? '13:00 – 21:00'
                    : '—',
            }
          : d,
      ),
    );

  const [leaves, setLeaves] = React.useState(mockLeaves);
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const [leaveStart, setLeaveStart] = React.useState('');
  const [leaveEnd, setLeaveEnd] = React.useState('');
  const [leaveReason, setLeaveReason] = React.useState('');
  const [leaveError, setLeaveError] = React.useState('');
  const handleAddLeave = () => {
    if (!leaveStart || !leaveEnd || !leaveReason.trim()) {
      setLeaveError('Vui lòng nhập đủ ngày bắt đầu, ngày kết thúc và lý do.');
      return;
    }
    const s = new Date(`${leaveStart}T00:00`);
    const e = new Date(`${leaveEnd}T00:00`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
      setLeaveError('Khoảng ngày không hợp lệ.');
      return;
    }
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    const dateLabel =
      days > 1 ? `${fmtInputDate(leaveStart)} – ${fmtInputDate(leaveEnd)}` : fmtInputDate(leaveStart);
    setLeaves((prev) => [
      {
        id: `l-${Date.now()}`,
        date: dateLabel,
        days: `${days} ngày`,
        type: 'paid',
        reason: leaveReason.trim(),
        status: 'approved',
      },
      ...prev,
    ]);
    setLeaveStart('');
    setLeaveEnd('');
    setLeaveReason('');
    setLeaveError('');
    setLeaveOpen(false);
  };

  const setLeaveStatus = (id: string, status: 'approved') =>
    setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));

  const leaveColumns: DashColumn<LeaveRow>[] = [
    {
      id: 'date',
      header: 'Ngày nghỉ',
      cell: (row) => <span className="font-bold">{row.date}</span>,
    },
    {
      id: 'type',
      header: 'Loại',
      cell: (row) => (
        <Tag variant={row.type === 'paid' ? 'error' : 'warning'} shape="rounded" size="md">
          {row.type === 'paid' ? 'Phép năm' : 'Nghỉ ốm'}
        </Tag>
      ),
    },
    { id: 'reason', header: 'Lý do', className: 'text-on-surface-variant' },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (row) =>
        row.status === 'approved' ? (
          <Tag variant="success" shape="pill" size="md">
            Đã duyệt
          </Tag>
        ) : (
          <Tag variant="warning" shape="pill" size="md">
            Chờ duyệt
          </Tag>
        ),
    },
    {
      id: 'action',
      header: 'Thao tác',
      className: 'text-right',
      cell: (row) =>
        row.status === 'pending' ? (
          <span className="inline-flex gap-2">
            <button
              type="button"
              onClick={() => setLeaveStatus(row.id, 'approved')}
              className="text-[11px] font-bold text-emerald-600 hover:underline"
            >
              Duyệt
            </button>
            <button
              type="button"
              onClick={() => setLeaves((prev) => prev.filter((l) => l.id !== row.id))}
              className="text-[11px] font-bold text-error hover:underline"
            >
              Từ chối
            </button>
          </span>
        ) : (
          <span className="text-outline">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Lịch phân ca</h2>
          <p className="text-[13px] text-on-surface-variant">Lịch làm việc của nhân viên trong tuần.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditingWeek((v) => !v)}>
          {editingWeek ? 'Lưu lịch' : 'Chỉnh sửa ca'}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          aria-label="Tuần trước"
          onClick={() => setWeekOffset((o) => o - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-semibold text-on-surface">{weekRange}</span>
        <Button
          variant="outline"
          size="sm"
          aria-label="Tuần sau"
          onClick={() => setWeekOffset((o) => o + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
        {week.map((d, i) => (
          <div key={d.weekday} className="min-h-28 rounded-xl border border-outline bg-white p-3">
            <p className="text-[11px] font-bold text-on-surface-variant">{d.weekday}</p>
            <p className="text-xs font-medium text-on-surface">{weekDate(i)}</p>
            <div className="mt-2">
              {editingWeek ? (
                <DashSelect
                  value={d.shift}
                  onValueChange={(v) => setWeekShift(i, v as WeekShift)}
                  options={SHIFT_OPTIONS}
                />
              ) : (
                <>
                  <span
                    className={`block rounded-md px-1 py-2 text-center text-[10px] font-semibold ${
                      d.shift === 'off'
                        ? 'bg-surface-container text-on-surface-variant'
                        : 'bg-brand-light/60 text-primary'
                    }`}
                  >
                    {d.shiftLabel}
                  </span>
                  <p className="mt-1.5 text-center text-[9px] text-on-surface-variant">{d.time}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">Quản lý ngày phép & nghỉ</h3>
            <span className="text-[11px] font-medium text-on-surface-variant">
              Còn lại:{' '}
              <b className="text-primary">
                {mockLeaveBalance.used} / {mockLeaveBalance.total}
              </b>{' '}
              ngày phép năm
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setLeaveOpen(true)}>
            Thêm ngày nghỉ
          </Button>
        </div>
        <DashTable columns={leaveColumns} data={leaves} getRowId={(r) => r.id} />
      </div>

      <DashDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Thêm ngày nghỉ"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setLeaveOpen(false)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleAddLeave}>
              Lưu ngày nghỉ
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-4">
          <Field label="Từ ngày">
            <DashInput
              type="date"
              value={leaveStart}
              onChange={(e) => setLeaveStart(e.target.value)}
            />
          </Field>
          <Field label="Đến ngày">
            <DashInput
              type="date"
              value={leaveEnd}
              onChange={(e) => setLeaveEnd(e.target.value)}
            />
          </Field>
          <Field label="Lý do">
            <DashInput
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Ví dụ: Việc gia đình"
            />
          </Field>
          {leaveError && <p className="text-xs font-medium text-error">{leaveError}</p>}
        </div>
      </DashDialog>
    </div>
  );
}
