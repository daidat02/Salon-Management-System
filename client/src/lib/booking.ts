import type { BookingSettingsResponse, WorkingHourDay, WorkingHours } from '@/types/setting';

const MINUTE_MS = 60_000;

function formatMinutes(value: number): string {
  const clamped = Math.max(0, Math.min(Math.round(value), 24 * 60));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** ISO weekday: 1 = Thứ 2 ... 7 = Chủ nhật (khớp business_hours của server). */
export function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function workingDayFor(
  date: Date,
  workingHours?: WorkingHours | null,
): WorkingHourDay | undefined {
  if (!workingHours?.days?.length) return undefined;
  const weekday = isoWeekday(date);
  return workingHours.days.find((entry) => entry.weekday === weekday);
}

/** Mô tả khung giờ mở cửa dùng chung, kèm trạng thái đóng/mở của ngày. */
export function describeWorkingHours(
  workingHours?: WorkingHours | null,
  day?: WorkingHourDay,
): string {
  if (!workingHours) return '';
  if (day && !day.is_open) return 'Salon đóng cửa ngày này.';
  const breakLabel =
    workingHours.break_start_minutes != null && workingHours.break_end_minutes != null
      ? ` • nghỉ ${formatMinutes(workingHours.break_start_minutes)}–${formatMinutes(workingHours.break_end_minutes)}`
      : '';
  return `Mở cửa ${formatMinutes(workingHours.open_time_minutes)}–${formatMinutes(workingHours.close_time_minutes)}${breakLabel}`;
}

export type BookingValidationInput = {
  start: Date;
  end: Date;
  workingHours?: WorkingHours | null;
  settings?: BookingSettingsResponse;
  now?: Date;
};

/**
 * Kiểm tra khung giờ hẹn theo business hours + booking settings.
 * Trả về thông báo lỗi (tiếng Việt) hoặc null nếu hợp lệ.
 * Bỏ qua kiểm tra khi chưa tải được settings để không chặn nhầm.
 */
export function validateBookingWindow({
  start,
  end,
  workingHours,
  settings,
  now = new Date(),
}: BookingValidationInput): string | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Thời gian hẹn không hợp lệ.';
  }
  if (end <= start) {
    return 'Giờ kết thúc phải sau giờ bắt đầu.';
  }
  if (start.getTime() < now.getTime()) {
    return 'Không thể đặt lịch trong quá khứ.';
  }

  if (settings) {
    const leadMinutes = settings.min_lead_minutes ?? 0;
    if (leadMinutes > 0 && start.getTime() - now.getTime() < leadMinutes * MINUTE_MS) {
      return `Lịch hẹn cần đặt trước ít nhất ${leadMinutes} phút.`;
    }
    const advanceDays = settings.max_advance_days ?? 0;
    if (
      advanceDays > 0 &&
      start.getTime() - now.getTime() > advanceDays * 24 * 60 * MINUTE_MS
    ) {
      return `Chỉ nhận đặt lịch trước tối đa ${advanceDays} ngày.`;
    }
  }

  const day = workingDayFor(start, workingHours);
  if (workingHours && day) {
    if (!day.is_open) {
      return 'Salon đóng cửa vào ngày đã chọn.';
    }
    const openMinutes = workingHours.open_time_minutes;
    const closeMinutes = workingHours.close_time_minutes;
    const startMinutes = minutesOfDay(start);
    const endMinutes = minutesOfDay(end);
    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
      return `Giờ hẹn nằm ngoài khung mở cửa ${formatMinutes(openMinutes)}–${formatMinutes(closeMinutes)}.`;
    }
    const breakStart = workingHours.break_start_minutes;
    const breakEnd = workingHours.break_end_minutes;
    if (
      breakStart != null &&
      breakEnd != null &&
      startMinutes < breakEnd &&
      endMinutes > breakStart
    ) {
      return `Giờ hẹn trùng giờ nghỉ ${formatMinutes(breakStart)}–${formatMinutes(breakEnd)}.`;
    }
  }

  return null;
}
