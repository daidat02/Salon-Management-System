"use client";

import * as React from "react";
import { CalendarRange, ChevronLeft, ChevronRight, List } from "lucide-react";
import { cn } from "cn";
import type { Appointment } from "@/types/appointment";
import { AppointmentDetailDrawer } from "./AppointmentDetailDrawer";
import AppointmentsTable from "./AppointmentsTable";
import WeekSchedule from "./WeekSchedule";

type View = "list" | "week";

function startOfWeekMonday(base: Date): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function fmtDM(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export default function AppointmentsView() {
  const [view, setView] = React.useState<View>("week");
  const [weekStart, setWeekStart] = React.useState(() => startOfWeekMonday(new Date()));
  const [selected, setSelected] = React.useState<Appointment | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const handleSelect = React.useCallback((appointment: Appointment) => {
    setSelected(appointment);
    setDrawerOpen(true);
  }, []);
  const shiftWeek = React.useCallback((delta: number) => {
    setWeekStart((prev) => addDays(prev, delta * 7));
  }, []);
  const goToCurrentWeek = React.useCallback(() => {
    setWeekStart(startOfWeekMonday(new Date()));
  }, []);
  const weekLabel = React.useMemo(
    () => `${fmtDM(weekStart)} – ${fmtDM(addDays(weekStart, 6))}`,
    [weekStart],
  );
  const todayLabel = React.useMemo(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const weekday = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][now.getDay()];
    return `${weekday}, ${dd}/${mo}/${yyyy}`;
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="rounded-lg bg-surface-container px-3 py-1.5">{todayLabel}</span>
        <div className="flex items-center gap-1 rounded-lg bg-surface-container p-1">
          <button
            type="button"
            onClick={() => setView("week")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all",
              view === "week"
                ? "bg-primary font-semibold text-white shadow-xs"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            <span>Lịch tuần</span>
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all",
              view === "list"
                ? "bg-primary font-semibold text-white shadow-xs"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <List className="h-3.5 w-3.5" />
            <span>Danh sách</span>
          </button>
        </div>

        {view === "week" && (
          <div className="ml-auto flex items-center gap-1 rounded-lg bg-surface-container p-1">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              aria-label="Tuần trước"
              className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface hover:text-on-surface"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-28 text-center font-semibold text-on-surface">{weekLabel}</span>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              aria-label="Tuần sau"
              className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface hover:text-on-surface"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToCurrentWeek}
              className="ml-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-surface"
            >
              Tuần này
            </button>
          </div>
        )}
      </div>

      {view === "list" ? (
        <AppointmentsTable onSelect={handleSelect} />
      ) : (
        <WeekSchedule weekStart={weekStart} onSelect={handleSelect} />
      )}

      <AppointmentDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        appointment={selected}
      />
    </div>
  );
}
