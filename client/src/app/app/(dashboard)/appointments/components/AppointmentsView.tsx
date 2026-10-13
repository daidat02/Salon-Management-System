"use client";

import * as React from "react";
import { CalendarRange, List } from "lucide-react";
import { cn } from "cn";
import AppointmentsTable from "./AppointmentsTable";
import WeekSchedule from "./WeekSchedule";

type View = "list" | "week";

export default function AppointmentsView() {
  const [view, setView] = React.useState<View>("list");
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
        </div>
      </div>

      {view === "list" ? <AppointmentsTable /> : <WeekSchedule />}
    </div>
  );
}
