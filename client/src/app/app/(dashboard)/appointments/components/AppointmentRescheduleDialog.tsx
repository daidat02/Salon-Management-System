'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { DashDatePicker } from '@/components/dashboard/DashDatePicker';
import { DashInput } from '@/components/dashboard/DashInput';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { useBookingSettings, useGeneralSettings } from '@/hooks/settings';
import { useRescheduleAppointment } from '@/hooks/appointment';
import { describeWorkingHours, validateBookingWindow, workingDayFor } from '@/lib/booking';
import type { Appointment } from '@/types/appointment';

const labelClass = 'mb-1.5 block min-w-0 text-xs font-semibold text-on-surface';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
};

export function AppointmentRescheduleDialog({ open, onOpenChange, appointment }: Props) {
  const initialStart = useMemo(() => new Date(appointment.start_time), [appointment.start_time]);
  const initialEnd = useMemo(() => new Date(appointment.end_time), [appointment.end_time]);
  const durationMinutes = useMemo(() => {
    const diff = initialEnd.getTime() - initialStart.getTime();
    return diff > 0 ? Math.round(diff / 60_000) : 30;
  }, [initialStart, initialEnd]);

  const [date, setDate] = useState<Date | undefined>(initialStart);
  const [startTime, setStartTime] = useState(
    Number.isNaN(initialStart.getTime()) ? '09:00' : format(initialStart, 'HH:mm'),
  );
  const [error, setError] = useState('');

  const { data: generalSettings } = useGeneralSettings();
  const { data: bookingSettings } = useBookingSettings();
  const workingHours = generalSettings?.working_hours;
  const rescheduleAppointment = useRescheduleAppointment();

  const selectedWorkingDay = useMemo(
    () => (date ? workingDayFor(date, workingHours) : undefined),
    [date, workingHours],
  );

  const startAt = useMemo(() => {
    if (!date || !startTime) return null;
    const [hours, minutes] = startTime.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    const value = new Date(date);
    value.setHours(hours, minutes, 0, 0);
    return value;
  }, [date, startTime]);

  const endAt = useMemo(() => {
    if (!startAt) return null;
    return new Date(startAt.getTime() + durationMinutes * 60_000);
  }, [startAt, durationMinutes]);

  const handleSubmit = async () => {
    if (!startAt || !endAt) {
      setError('Vui lòng chọn ngày và giờ hẹn hợp lệ.');
      return;
    }
    const bookingError = validateBookingWindow({
      start: startAt,
      end: endAt,
      workingHours,
      settings: bookingSettings,
    });
    if (bookingError) {
      setError(bookingError);
      return;
    }

    setError('');
    try {
      await rescheduleAppointment.mutateAsync({
        id: appointment.id,
        payload: {
          start_time: startAt.toISOString(),
          end_time: endAt.toISOString(),
        },
      });
      toast.add({
        title: 'Đã đổi lịch hẹn',
        description: `${appointment.customer_name || 'Khách'} • ${format(startAt, 'HH:mm dd/MM/yyyy')}`,
        type: 'success',
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đổi lịch hẹn. Vui lòng thử lại.');
    }
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Đổi lịch hẹn"
      description={`${appointment.customer_name || 'Khách'} • ${appointment.code}`}
      maxWidth="max-w-[520px]"
      footer={
        <DashDialogFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={() => void handleSubmit()}
          confirmText="Xác nhận đổi lịch"
          loadingText="Đang lưu..."
          isLoading={rescheduleAppointment.isPending}
        />
      }
    >
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className={labelClass}>Ngày hẹn mới</Label>
            <DashDatePicker value={date} onValueChange={setDate} placeholder="Chọn ngày hẹn..." />
          </div>
          <div>
            <Label htmlFor="reschedule-start-time" className={labelClass}>
              Giờ bắt đầu
            </Label>
            <DashInput
              id="reschedule-start-time"
              type="time"
              step={Math.max(bookingSettings?.slot_step_minutes ?? 15, 1) * 60}
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-outline bg-surface-container px-4 py-3 text-xs">
          <span className="font-semibold text-on-surface-variant">Thời lượng giữ nguyên</span>
          <span className="font-bold text-primary">
            {durationMinutes} phút
            {endAt ? ` • kết thúc ${format(endAt, 'HH:mm')}` : ''}
          </span>
        </div>

        {workingHours && selectedWorkingDay && (
          <p className="text-[11px] text-on-surface-variant">
            {describeWorkingHours(workingHours, selectedWorkingDay)}
          </p>
        )}

        {error && <p className="text-[11px] text-error">{error}</p>}
      </div>
    </DashDialog>
  );
}
