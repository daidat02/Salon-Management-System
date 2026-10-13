"use client";

import * as React from "react";
import { CalendarClock, Clock3, MapPin } from "lucide-react";
import { cn } from "cn";
import useAppointments from "@/hooks/use-appointments";
import useCustomer from "@/hooks/use-customer";
import useStaff from "@/hooks/use-staff";
import { getApiErrorMessage } from "@/services/apiClient";
import type { Appointment, AppointmentStatus } from "@/types/appointment";

const ROW_H = 80; // h-20 — 1 dòng giờ
const GRID_START_HOUR = 8;
const GRID_END_HOUR = 19; // exclusive

type WeekViewEvent = {
  id: string;
  /** 0 = Thứ 2 ... 6 = Chủ nhật */
  day: number;
  /** giờ bắt đầu (khớp 1 dòng giờ trong lưới) */
  startHour: number;
  /** chiếm bao nhiêu dòng giờ (mặc định 1) */
  span?: number;
  customer: string;
  /** API list không trả tên dịch vụ — hiện mã lịch */
  code: string;
  timeRange: string;
  staff: string;
  status: AppointmentStatus;
};

const STATUS_STYLE: Record<AppointmentStatus, { card: string; time: string; badge: string; badgeLabel: string }> = {
  completed: {
    card: "bg-emerald-50 hover:bg-emerald-100/90",
    time: "text-emerald-700",
    badge: "bg-white text-emerald-700",
    badgeLabel: "Xong",
  },
  in_progress: {
    card: "bg-primary hover:bg-primary/90 text-white",
    time: "text-blue-100",
    badge: "bg-white/20 text-white",
    badgeLabel: "Đang làm",
  },
  pending: {
    card: "bg-amber-50 hover:bg-amber-100/90",
    time: "text-amber-700",
    badge: "bg-amber-200/70 text-amber-800",
    badgeLabel: "Chờ",
  },
  confirmed: {
    card: "bg-indigo-50 hover:bg-indigo-100",
    time: "text-indigo-700",
    badge: "bg-indigo-200/70 text-indigo-800",
    badgeLabel: "Đã hẹn",
  },
  checked_in: {
    card: "bg-teal-50 hover:bg-teal-100",
    time: "text-teal-700",
    badge: "bg-teal-200/70 text-teal-800",
    badgeLabel: "Check-in",
  },
  cancelled: {
    card: "bg-slate-100 hover:bg-slate-200/80",
    time: "text-slate-500",
    badge: "bg-white text-slate-500",
    badgeLabel: "Đã hủy",
  },
  no_show: {
    card: "bg-red-50 hover:bg-red-100/90",
    time: "text-red-700",
    badge: "bg-red-200/70 text-red-800",
    badgeLabel: "Vắng",
  },
};

const LEGEND: { dot: string; label: string }[] = [
  { dot: "bg-emerald-500", label: "Đã hoàn thành" },
  { dot: "bg-primary", label: "Đang phục vụ" },
  { dot: "bg-amber-500", label: "Chờ phục vụ" },
  { dot: "bg-indigo-400", label: "Đã xác nhận" },
  { dot: "bg-teal-500", label: "Đã check-in" },
  { dot: "bg-slate-400", label: "Đã hủy" },
  { dot: "bg-red-500", label: "Không đến" },
];

const VI_WEEKDAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

/** ISO8601 kèm offset địa phương (server so sánh timestamp chính xác). */
function toLocalISO(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

function startOfWeekMonday(now: Date): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function EventCard({ event, tall }: { event: WeekViewEvent; tall?: boolean }) {
  const s = STATUS_STYLE[event.status];
  const serving = event.status === "in_progress";
  return (
    <div
      className={cn(
        "flex h-full cursor-pointer flex-col justify-between rounded-lg p-2 shadow-xs transition-all",
        s.card,
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-1">
        <span className={cn("min-w-0 flex-1 truncate text-[11px] font-bold", serving ? "text-white" : "text-on-surface")}>
          {event.customer}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className={cn("rounded px-1 py-px text-[9px] font-semibold", s.badge)}>
            {serving && <span className="mr-0.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />}
            {s.badgeLabel}
          </span>
        </span>
      </div>
      <div className={cn("truncate font-mono text-[10px]", serving ? "text-blue-100" : "text-on-surface-variant")}>
        {event.code}
      </div>
      <div className={cn("flex items-center gap-1 text-[9px] font-medium", s.time)}>
        <Clock3 className="h-3 w-3" />
        <span className="truncate font-mono">{event.timeRange}</span>
      </div>
      {tall && (
        <div className={cn("truncate text-[10px] font-semibold", serving ? "text-white" : "text-on-surface")}>
          {event.staff}
        </div>
      )}
    </div>
  );
}

export default function WeekSchedule() {
  const nowRef = React.useRef<HTMLDivElement>(null);
  const now = React.useMemo(() => new Date(), []);

  const weekStart = React.useMemo(() => startOfWeekMonday(now), [now]);
  const weekEnd = React.useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 0);
    return d;
  }, [weekStart]);

  const { data, isLoading, isError, error } = useAppointments({
    page: 1,
    pageSize: 100,
    from: toLocalISO(weekStart),
    to: toLocalISO(weekEnd),
  });

  // Lookup tên khách / nhân viên (API lịch chỉ trả id).
  const { data: customerData } = useCustomer({ page: 1, pageSize: 100 });
  const { data: staffData } = useStaff({ page: 1, pageSize: 100 });
  const customerMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customerData?.data ?? []) {
      if (c) map.set(c.id, c.full_name);
    }
    return map;
  }, [customerData]);
  const staffMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of staffData?.data ?? []) {
      if (s) map.set(s.id, s.full_name);
    }
    return map;
  }, [staffData]);

  const appointments = React.useMemo(
    () =>
      (data?.data || []).filter(
        (a): a is Appointment => a !== null && a !== undefined,
      ),
    [data],
  );

  // Dựng 7 ngày của tuần hiện tại + đếm lịch mỗi ngày.
  const days = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const count = appointments.filter((a) => sameDay(new Date(a.start_time), date)).length;
      const isToday = sameDay(date, now);
      return {
        weekday: VI_WEEKDAYS[i],
        dateNum: date.getDate(),
        countLabel: isToday ? `Hôm nay • ${count} lịch` : `${count} lịch`,
        isToday,
        isWeekend: i >= 5,
      };
    });
  }, [weekStart, appointments, now]);

  const events: WeekViewEvent[] = React.useMemo(
    () =>
      appointments.flatMap((a) => {
        const start = new Date(a.start_time);
        const end = new Date(a.end_time);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
        const day = (start.getDay() + 6) % 7;
        const startHour = start.getHours();
        if (startHour < GRID_START_HOUR || startHour >= GRID_END_HOUR) return [];
        const span = Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600000));
        return [
          {
            id: a.id,
            day,
            startHour,
            span,
            customer: (a.customer_id && customerMap.get(a.customer_id)) || "Khách lẻ",
            code: a.code,
            timeRange: `${fmtHM(start)} - ${fmtHM(end)}`,
            staff: (a.staff_id && staffMap.get(a.staff_id)) || "—",
            status: a.status,
          },
        ];
      }),
    [appointments, customerMap, staffMap],
  );

  // Ô (day, hour) đã bị event span phủ thì không render cell trống đè lên
  const covered = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      const span = e.span ?? 1;
      for (let h = e.startHour + 1; h < e.startHour + span; h++) set.add(`${e.day}-${h}`);
    }
    return set;
  }, [events]);

  const eventAt = (day: number, hour: number) =>
    events.find((e) => e.day === day && e.startHour === hour);

  const scrollToNow = () => {
    nowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const hours = React.useMemo(
    () => Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i),
    [],
  );
  const nowOffset = now.getHours() + now.getMinutes() / 60 - GRID_START_HOUR;
  const showNowLine = nowOffset >= 0 && nowOffset <= GRID_END_HOUR - GRID_START_HOUR;
  const weekLabel = `${String(weekStart.getDate()).padStart(2, "0")}/${String(weekStart.getMonth() + 1).padStart(2, "0")} – ${String(weekEnd.getDate()).padStart(2, "0")}/${String(weekEnd.getMonth() + 1).padStart(2, "0")}`;

  if (isError) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Không tải được lịch tuần: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc kiểm tra
        kết nối API.
      </div>
    );
  }

  if (isLoading && appointments.length === 0) {
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
              <span className={cn("h-2.5 w-2.5 rounded-full", l.dot)} />
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
                  key={d.weekday}
                  className={cn(
                    "relative p-3 text-center",
                    d.isToday && "bg-brand-light/60",
                  )}
                >
                  {d.isToday && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                  )}
                  <div
                    className={cn(
                      "text-[11px] font-semibold uppercase",
                      d.isToday ? "font-bold text-brand" : d.isWeekend ? "font-bold text-amber-800" : "text-on-surface-variant",
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
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                      d.isToday
                        ? "bg-white font-bold text-brand shadow-2xs"
                        : d.isWeekend
                          ? "bg-amber-100 font-semibold text-amber-700"
                          : "bg-surface-container text-on-surface-variant",
                    )}
                  >
                    {d.countLabel}
                  </span>
                </div>
              ))}
            </div>

            {/* Lưới giờ — relative để ghim vạch "hiện tại" */}
            <div className="relative grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
              {/* Vạch giờ hiện tại */}
              {showNowLine && (
                <div
                  ref={nowRef}
                  className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
                  style={{ top: nowOffset * ROW_H + 4 }}
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

              {hours.map((hour) => (
                <React.Fragment key={hour}>
                  <div className="flex flex-col justify-start bg-surface-container/60 p-2 text-right font-mono text-[11px] font-semibold text-on-surface-variant" style={{ height: ROW_H }}>
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {days.map((d, dayIdx) => {
                    const isToday = !!d.isToday;
                    if (covered.has(`${dayIdx}-${hour}`)) {
                      return (
                        <div
                          key={dayIdx}
                          style={{ height: ROW_H }}
                          className={cn(isToday && "bg-brand-light/20")}
                        />
                      );
                    }
                    const event = eventAt(dayIdx, hour);
                    const span = event?.span ?? 1;
                    return (
                      <div
                        key={dayIdx}
                        style={{ height: ROW_H }}
                        className={cn(
                          "relative p-1 transition-colors",
                          isToday
                            ? "bg-brand-light/20 hover:bg-brand-light/40"
                            : d.isWeekend
                              ? "bg-amber-50/20 hover:bg-amber-50/50"
                              : "bg-surface hover:bg-surface-container-low",
                        )}
                      >
                        {event &&
                          (span > 1 ? (
                            <div
                              className="absolute top-1 right-1 left-1 z-10"
                              style={{ height: span * ROW_H - 8 }}
                            >
                              <EventCard event={event} tall />
                            </div>
                          ) : (
                            <EventCard event={event} />
                          ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Footer mini giống footer bảng */}
        <div className="flex items-center gap-1.5 border-t border-outline bg-surface px-6 py-3 text-xs text-on-surface-variant">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>
            Tuần {weekLabel} • <span className="font-semibold text-on-surface">{events.length}</span> lịch hẹn
          </span>
        </div>
      </div>
    </div>
  );
}
