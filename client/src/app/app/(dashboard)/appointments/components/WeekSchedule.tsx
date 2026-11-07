'use client';

import * as React from 'react';
import { CalendarClock, Clock3, MapPin } from 'lucide-react';
import { cn } from 'cn';
import useWeeklySchedule from '@/hooks/use-weekly-schedule';
import { getApiErrorMessage } from '@/services/apiClient';
import type { Appointment, AppointmentStatus } from '@/types/appointment';

const ROW_H = 80; // chiều cao tối thiểu 1 hàng giờ
const GRID_START_HOUR = 8;
const GRID_END_HOUR = 19; // exclusive
const HOUR_COUNT = GRID_END_HOUR - GRID_START_HOUR;
const CARD_MIN_H = 40;
const CARD_GAP = 4;
const CELL_PADDING = 8;

type WeekViewEvent = {
  id: string;
  /** 0 = Thứ 2 ... 6 = Chủ nhật */
  day: number;
  /** phút bắt đầu tính từ 00:00 */
  startMin: number;
  /** giờ bắt đầu (0–23) — dùng để xếp vào hàng giờ */
  startHour: number;
  customer: string;
  /** API list không trả tên dịch vụ — hiện mã lịch */
  code: string;
  timeRange: string;
  staff: string;
  status: AppointmentStatus;
  appointment: Appointment;
};

const STATUS_STYLE: Record<
  AppointmentStatus,
  { card: string; time: string; badge: string; badgeLabel: string }
> = {
  completed: {
    card: 'bg-emerald-50 hover:bg-emerald-100/90',
    time: 'text-emerald-700',
    badge: 'bg-white text-emerald-700',
    badgeLabel: 'Xong',
  },
  in_progress: {
    card: 'bg-primary hover:bg-primary/90 text-white',
    time: 'text-blue-100',
    badge: 'bg-white/20 text-white',
    badgeLabel: 'Đang làm',
  },
  pending: {
    card: 'bg-amber-50 hover:bg-amber-100/90',
    time: 'text-amber-700',
    badge: 'bg-amber-200/70 text-amber-800',
    badgeLabel: 'Chờ',
  },
  confirmed: {
    card: 'bg-indigo-50 hover:bg-indigo-100',
    time: 'text-indigo-700',
    badge: 'bg-indigo-200/70 text-indigo-800',
    badgeLabel: 'Đã hẹn',
  },
  checked_in: {
    card: 'bg-teal-50 hover:bg-teal-100',
    time: 'text-teal-700',
    badge: 'bg-teal-200/70 text-teal-800',
    badgeLabel: 'Check-in',
  },
  cancelled: {
    card: 'bg-slate-100 hover:bg-slate-200/80',
    time: 'text-slate-500',
    badge: 'bg-white text-slate-500',
    badgeLabel: 'Đã hủy',
  },
  no_show: {
    card: 'bg-red-50 hover:bg-red-100/90',
    time: 'text-red-700',
    badge: 'bg-red-200/70 text-red-800',
    badgeLabel: 'Vắng',
  },
};

const LEGEND: { dot: string; label: string }[] = [
  { dot: 'bg-emerald-500', label: 'Đã hoàn thành' },
  { dot: 'bg-primary', label: 'Đang phục vụ' },
  { dot: 'bg-amber-500', label: 'Chờ phục vụ' },
  { dot: 'bg-indigo-400', label: 'Đã xác nhận' },
  { dot: 'bg-teal-500', label: 'Đã check-in' },
  { dot: 'bg-slate-400', label: 'Đã hủy' },
  { dot: 'bg-red-500', label: 'Không đến' },
];

const VI_WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

/** YYYY-MM-DD theo giờ địa phương. */
function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function fmtDM(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function fmtHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function EventCard({
  event,
  onSelect,
}: {
  event: WeekViewEvent;
  onSelect?: (appointment: Appointment) => void;
}) {
  const s = STATUS_STYLE[event.status];
  const serving = event.status === 'in_progress';
  return (
    <button
      type="button"
      onClick={() => onSelect?.(event.appointment)}
      title={`${event.customer} • ${event.code} • ${event.timeRange} • ${event.staff}`}
      className={cn(
        'flex h-full min-h-0 w-full cursor-pointer flex-col justify-center gap-1 overflow-hidden rounded-md px-2 py-2 text-left shadow-xs transition-all',
        s.card,
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-1">
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-[11px] font-bold',
            serving ? 'text-white' : 'text-on-surface',
          )}
        >
          {event.customer}
        </span>
        <span className={cn('shrink-0 rounded px-1 py-px text-[9px] font-semibold', s.badge)}>
          {serving && (
            <span className="mr-0.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
          )}
          {s.badgeLabel}
        </span>
      </div>
      <div className={cn('flex items-center gap-1 text-[9px] font-medium', s.time)}>
        <Clock3 className="h-3 w-3 shrink-0" />
        <span className="truncate font-mono">{event.timeRange}</span>
      </div>
    </button>
  );
}

type Props = {
  /** Thứ 2 đầu tuần cần hiển thị. */
  weekStart: Date;
  onSelect?: (appointment: Appointment) => void;
};

type DisplayDay = {
  date: string;
  dateNum: number;
  weekday: string;
  total: number;
  appointments: Appointment[];
  isToday: boolean;
  isWeekend: boolean;
};

export default function WeekSchedule({ weekStart, onSelect }: Props) {
  const nowRef = React.useRef<HTMLDivElement>(null);
  const now = React.useMemo(() => new Date(), []);

  const { data, isLoading, isError, error } = useWeeklySchedule(toDateKey(weekStart));

  // Server đã tách sẵn 7 ngày; fallback dựng khung 7 ngày khi chưa có dữ liệu.
  const days: DisplayDay[] = React.useMemo(() => {
    if (data?.days?.length) {
      return data.days.map((d, i) => {
        const date = new Date(`${d.date}T00:00:00`);
        return {
          date: d.date,
          dateNum: date.getDate(),
          weekday: d.weekday || VI_WEEKDAYS[i],
          total: d.total,
          appointments: d.appointments ?? [],
          isToday: sameDay(date, now),
          isWeekend: i >= 5,
        };
      });
    }

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date: toDateKey(date),
        dateNum: date.getDate(),
        weekday: VI_WEEKDAYS[i],
        total: 0,
        appointments: [],
        isToday: sameDay(date, now),
        isWeekend: i >= 5,
      };
    });
  }, [data, weekStart, now]);

  const events: WeekViewEvent[] = React.useMemo(
    () =>
      days.flatMap((d, dayIdx) =>
        d.appointments.flatMap((a) => {
          const start = new Date(a.start_time);
          const end = new Date(a.end_time);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
          const startMin = start.getHours() * 60 + start.getMinutes();
          const startHour = Math.floor(startMin / 60);
          if (startHour < GRID_START_HOUR || startHour >= GRID_END_HOUR) return [];
          return [
            {
              id: a.id,
              day: dayIdx,
              startMin,
              startHour,
              customer: a.customer_name || 'Khách lẻ',
              code: a.code,
              timeRange: `${fmtHM(start)} - ${fmtHM(end)}`,
              staff: a.staff_name || '—',
              status: a.status,
              appointment: a,
            },
          ];
        }),
      ),
    [days],
  );

  // Mỗi ngày: 7 ngày × các hàng giờ, chỉ dựa vào giờ bắt đầu.
  const eventsByDayHour = React.useMemo(() => {
    const grouped: WeekViewEvent[][][] = Array.from({ length: 7 }, () =>
      Array.from({ length: HOUR_COUNT }, () => [] as WeekViewEvent[]),
    );
    for (const event of events) {
      grouped[event.day]?.[event.startHour - GRID_START_HOUR]?.push(event);
    }
    for (const day of grouped) {
      for (const bucket of day) {
        bucket.sort((a, b) => a.startMin - b.startMin || a.code.localeCompare(b.code));
      }
    }
    return grouped;
  }, [events]);

  // Hàng giờ giãn đủ cho ngày có nhiều lịch nhất; dùng chung để các mốc giờ thẳng hàng.
  const rowHeights = React.useMemo(
    () =>
      Array.from({ length: HOUR_COUNT }, (_, hourIdx) => {
        const maxCount = Math.max(1, ...eventsByDayHour.map((day) => day[hourIdx].length));
        if (maxCount <= 1) return ROW_H;
        return Math.max(ROW_H, maxCount * CARD_MIN_H + (maxCount - 1) * CARD_GAP + CELL_PADDING);
      }),
    [eventsByDayHour],
  );

  const rowTops = React.useMemo(() => {
    let top = 0;
    return rowHeights.map((height) => {
      const current = top;
      top += height;
      return current;
    });
  }, [rowHeights]);

  const gridHeight = React.useMemo(
    () => rowHeights.reduce((sum, height) => sum + height, 0),
    [rowHeights],
  );

  const scrollToNow = () => {
    nowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const hours = React.useMemo(
    () => Array.from({ length: HOUR_COUNT }, (_, i) => GRID_START_HOUR + i),
    [],
  );
  const nowHourIdx = now.getHours() - GRID_START_HOUR;
  const showNowLine = nowHourIdx >= 0 && nowHourIdx < HOUR_COUNT;
  const nowLineTop = showNowLine
    ? rowTops[nowHourIdx] + (now.getMinutes() / 60) * rowHeights[nowHourIdx]
    : 0;
  const weekLabel = `${fmtDM(weekStart)} – ${fmtDM(addDays(weekStart, 6))}`;
  const weekTotal = data?.total ?? days.reduce((sum, d) => sum + d.total, 0);

  if (isError) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Không tải được lịch tuần: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc kiểm tra kết
        nối API.
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="rounded-md border border-outline bg-surface p-10 text-center text-xs text-on-surface-variant shadow-sm">
        Đang tải lịch tuần...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend + jump-to-now */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
            Trạng thái:
          </span>
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-full', l.dot)} />
              <span className="text-on-surface-variant">{l.label}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={scrollToNow}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>Đến khung giờ hiện tại ({fmtHM(now)})</span>
        </button>
      </div>

      {/* Card lịch tuần — cùng width với bảng (overflow-x-auto bên trong, không tràn) */}
      <div className="overflow-hidden rounded-md border border-outline bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1024px]">
            {/* Header 7 ngày */}
            <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] bg-surface-container select-none">
              <div className="flex flex-col items-center justify-center bg-surface-container p-3">
                <Clock3 className="h-[18px] w-[18px] text-on-surface-variant" />
                <span className="mt-0.5 text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
                  Giờ
                </span>
              </div>
              {days.map((d) => (
                <div
                  key={d.date}
                  className={cn('relative p-3 text-center', d.isToday && 'bg-brand-light/60')}
                >
                  {d.isToday && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                  )}
                  <div
                    className={cn(
                      'text-[11px] font-semibold uppercase',
                      d.isToday
                        ? 'font-bold text-brand'
                        : d.isWeekend
                          ? 'font-bold text-amber-800'
                          : 'text-on-surface-variant',
                    )}
                  >
                    {d.weekday}
                  </div>
                  {d.isToday ? (
                    <div className="mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-base font-bold text-white shadow-sm">
                      {d.dateNum}
                    </div>
                  ) : (
                    <div className="mt-0.5 text-base font-bold text-on-surface">{d.dateNum}</div>
                  )}
                  <span
                    className={cn(
                      'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                      d.isToday
                        ? 'bg-white font-bold text-brand shadow-2xs'
                        : d.isWeekend
                          ? 'bg-amber-100 font-semibold text-amber-700'
                          : 'bg-surface-container text-on-surface-variant',
                    )}
                  >
                    {d.isToday ? `Hôm nay • ${d.total} lịch` : `${d.total} lịch`}
                  </span>
                </div>
              ))}
            </div>

            {/* Lưới giờ — lịch nằm ở hàng giờ bắt đầu, cùng giờ thì xếp dọc trong 1 card */}
            <div className="relative grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
              {/* Vạch giờ hiện tại */}
              {showNowLine && (
                <div
                  ref={nowRef}
                  className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
                  style={{ top: nowLineTop + 4 }}
                >
                  <div className="w-[64px] pr-1 text-right">
                    <span className="rounded bg-error px-1 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm">
                      {fmtHM(now)}
                    </span>
                  </div>
                  <div className="relative flex flex-1 items-center">
                    <div className="h-0.5 w-full bg-error/80" />
                    <div className="absolute left-[46%] h-3 w-3 rounded-full bg-error shadow ring-4 ring-red-100" />
                  </div>
                </div>
              )}

              {/* Cột giờ */}
              <div className="bg-surface-container/60" style={{ height: gridHeight }}>
                {hours.map((hour, hourIdx) => (
                  <div
                    key={hour}
                    className="flex justify-end border-t border-outline/30 p-2 font-mono text-[11px] font-semibold text-on-surface-variant first:border-t-0"
                    style={{ height: rowHeights[hourIdx] }}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* 7 cột ngày — mỗi hàng giờ chứa lịch bắt đầu trong giờ đó */}
              {days.map((d, dayIdx) => (
                <div
                  key={d.date}
                  className={cn(
                    'relative border-l border-outline/30',
                    d.isToday ? 'bg-brand-light/20' : d.isWeekend ? 'bg-amber-50/20' : 'bg-surface',
                  )}
                  style={{ height: gridHeight }}
                >
                  {hours.map((hour, hourIdx) => {
                    const bucket = eventsByDayHour[dayIdx][hourIdx];
                    return (
                      <div
                        key={hour}
                        className="flex flex-col gap-1 border-t border-outline/30 p-1 first:border-t-0"
                        style={{ height: rowHeights[hourIdx] }}
                      >
                        {bucket.map((event) => (
                          <EventCard key={event.id} event={event} onSelect={onSelect} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer mini giống footer bảng */}
        <div className="flex items-center gap-1.5 border-t border-outline bg-surface px-6 py-3 text-xs text-on-surface-variant">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>
            Tuần {weekLabel} •{' '}
            <span className="font-semibold text-on-surface">{weekTotal}</span> lịch hẹn
          </span>
        </div>
      </div>
    </div>
  );
}
