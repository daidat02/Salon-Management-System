'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DashTable, { type DashColumn } from '@/components/dashboard/DashTable';
import { Tag } from '@/components/ui/tag';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DashDatePicker } from '@/components/dashboard/DashDatePicker';
import { DashOptionPills } from '@/components/dashboard/DashOptionPills';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { DashDialog } from '@/components/dashboard/DashDialog';
import { toast } from '@/components/ui/toast';
import { useCreateStaffLeave, useStaffLeaves } from '@/hooks/staff';
import { getApiErrorMessage } from '@/services/apiClient';
import type { StaffLeave, StaffLeaveType } from '@/types/staff';
import useAuth from '@/hooks/use-auth';
import { Field } from '../../components/StaffFormParts';
import { SHIFT_OPTIONS, mockWeek, type WeekShift } from './mock';

// Tab Ngày nghỉ & Ca: lịch phân ca theo tuần + quản lý ngày nghỉ + dialog thêm ngày nghỉ.

const WEEK_BASE = new Date(2026, 9, 12);
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
const fmtDay = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

const LEAVE_TYPE_OPTIONS: { value: StaffLeaveType; label: string }[] = [
  { value: 'ANNUAL', label: 'Nghỉ phép năm' },
  { value: 'EXCUSED', label: 'Phép' },
  { value: 'LATE', label: 'Đi trễ' },
];

const LEAVE_TYPE_LABEL: Record<StaffLeaveType, string> = {
  ANNUAL: 'Nghỉ phép năm',
  EXCUSED: 'Phép',
  LATE: 'Đi trễ',
};

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function leaveDays(leave: StaffLeave): number {
  const start = parseDateOnly(leave.start_date).getTime();
  const end = parseDateOnly(leave.end_date).getTime();
  return Math.round((end - start) / 86400000) + 1;
}

function leaveDateLabel(leave: StaffLeave): string {
  const start = format(parseDateOnly(leave.start_date), 'dd/MM/yyyy');
  const end = format(parseDateOnly(leave.end_date), 'dd/MM/yyyy');
  return start === end ? start : `${start} – ${end}`;
}

type StaffScheduleTabProps = {
  staffId: string;
  leaveDialogOpen?: boolean;
  onLeaveDialogOpenChange?: (open: boolean) => void;
};

export default function StaffScheduleTab({
  staffId,
  leaveDialogOpen = false,
  onLeaveDialogOpenChange = () => {},
}: StaffScheduleTabProps) {
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

  const { data, isLoading, isError, error, refetch } = useStaffLeaves(staffId);
  const leaves = React.useMemo(() => data ?? [], [data]);
  const { mutateAsync, isPending } = useCreateStaffLeave();

  const [leaveStart, setLeaveStart] = React.useState<Date | undefined>(undefined);
  const [leaveEnd, setLeaveEnd] = React.useState<Date | undefined>(undefined);
  const [leaveType, setLeaveType] = React.useState<StaffLeaveType | null>(null);
  const [leaveNote, setLeaveNote] = React.useState('');
  const [leaveError, setLeaveError] = React.useState('');

  const annualUsedDays = React.useMemo(() => {
    const year = new Date().getFullYear();
    return leaves
      .filter((leave) => leave.leave_type === 'ANNUAL')
      .filter((leave) => parseDateOnly(leave.start_date).getFullYear() === year)
      .reduce((total, leave) => total + leaveDays(leave), 0);
  }, [leaves]);

  const resetLeaveForm = () => {
    setLeaveStart(undefined);
    setLeaveEnd(undefined);
    setLeaveType(null);
    setLeaveNote('');
    setLeaveError('');
  };

  const handleLeaveDialogOpenChange = (open: boolean) => {
    if (!open) resetLeaveForm();
    onLeaveDialogOpenChange(open);
  };

  const handleAddLeave = async () => {
    setLeaveError('');
    if (!leaveStart || !leaveEnd) {
      setLeaveError('Vui lòng chọn ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (!leaveType) {
      setLeaveError('Vui lòng chọn loại ngày nghỉ.');
      return;
    }
    if (leaveEnd < leaveStart) {
      setLeaveError('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
      return;
    }

    try {
      await mutateAsync({
        id: staffId,
        payload: {
          leave_type: leaveType,
          start_date: format(leaveStart, 'yyyy-MM-dd'),
          end_date: format(leaveEnd, 'yyyy-MM-dd'),
          note: leaveNote.trim() || undefined,
        },
      });
      toast.add({ title: 'Đã thêm ngày nghỉ', type: 'success' });
      resetLeaveForm();
      onLeaveDialogOpenChange(false);
    } catch (err) {
      setLeaveError(getApiErrorMessage(err));
    }
  };

  const leaveColumns: DashColumn<StaffLeave>[] = [
    {
      id: 'date',
      header: 'Ngày nghỉ',
      cell: (row) => <span className="font-bold">{leaveDateLabel(row)}</span>,
    },
    {
      id: 'days',
      header: 'Số ngày',
      cell: (row) => <span className="text-on-surface-variant">{leaveDays(row)} ngày</span>,
    },
    {
      id: 'type',
      header: 'Loại',
      cell: (row) => (
        <Tag
          variant={row.leave_type === 'ANNUAL' ? 'success' : row.leave_type === 'LATE' ? 'error' : 'warning'}
          shape="rounded"
          size="md"
        >
          {LEAVE_TYPE_LABEL[row.leave_type]}
        </Tag>
      ),
    },
    {
      id: 'note',
      header: 'Ghi chú',
      className: 'text-on-surface-variant',
      cell: (row) => row.note || '—',
    },
  ];

  const { can } = useAuth();
  const canWrite = can('staff:write');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Lịch phân ca</h2>
          <p className="text-[13px] text-on-surface-variant">Lịch làm việc của nhân viên trong tuần.</p>
        </div>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setEditingWeek((v) => !v)}>
            {editingWeek ? 'Lưu lịch' : 'Chỉnh sửa ca'}
          </Button>
        )}
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
              Đã dùng:{' '}
              <b className="text-primary">{annualUsedDays}</b> / 12 ngày phép năm
            </span>
          </div>
          {canWrite && (
            <Button size="sm" variant="outline" onClick={() => onLeaveDialogOpenChange(true)}>
              Thêm ngày nghỉ
            </Button>
          )}
        </div>

        {isError && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-xs font-medium text-error">
            <span>Không tải được ngày nghỉ: {getApiErrorMessage(error)}</span>
            <button type="button" onClick={() => refetch()} className="font-bold hover:underline">
              Thử lại
            </button>
          </div>
        )}

        <DashTable
          columns={leaveColumns}
          data={leaves}
          getRowId={(r) => r.id}
          selectable={false}
          emptyText={isLoading ? 'Đang tải ngày nghỉ…' : 'Chưa có ngày nghỉ nào.'}
        />
      </div>

      <DashDialog
        open={leaveDialogOpen}
        onOpenChange={handleLeaveDialogOpenChange}
        title="Thêm ngày nghỉ"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => handleLeaveDialogOpenChange(false)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleAddLeave} disabled={isPending}>
              {isPending ? 'Đang lưu…' : 'Lưu ngày nghỉ'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Từ ngày">
              <DashDatePicker
                value={leaveStart}
                onValueChange={setLeaveStart}
                placeholder="Chọn ngày bắt đầu"
              />
            </Field>
            <Field label="Đến ngày">
              <DashDatePicker
                value={leaveEnd}
                onValueChange={setLeaveEnd}
                placeholder="Chọn ngày kết thúc"
              />
            </Field>
          </div>

          <Field label="Loại nghỉ">
            <DashOptionPills
              value={leaveType ?? undefined}
              onChange={(value) => setLeaveType(value as StaffLeaveType)}
              options={LEAVE_TYPE_OPTIONS}
            />
          </Field>

          <Field label="Ghi chú">
            <Textarea
              value={leaveNote}
              onChange={(e) => setLeaveNote(e.target.value)}
              placeholder="Ví dụ: Việc gia đình"
              rows={3}
              className="min-h-20 resize-none text-sm"
            />
          </Field>

          {leaveError && <p className="text-xs font-medium text-error">{leaveError}</p>}
        </div>
      </DashDialog>
    </div>
  );
}
