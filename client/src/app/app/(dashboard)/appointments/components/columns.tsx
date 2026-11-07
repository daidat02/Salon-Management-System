import { Tag } from "@/components/ui/tag"
import type { DashColumn } from "@/components/dashboard/DashTable"
import type { Appointment, AppointmentStatus } from "@/types/appointment"
import { formatShortDateTime as formatTime } from '@/lib/format';

type StatusVariant = "warning" | "blue" | "teal" | "primary" | "success" | "gray" | "error" | "slate"

const STATUS_META: Record<AppointmentStatus, { variant: Exclude<StatusVariant, "slate">; label: string }> = {
  pending: { variant: "warning", label: "Chờ xác nhận" },
  confirmed: { variant: "blue", label: "Đã xác nhận" },
  checked_in: { variant: "teal", label: "Đã check-in" },
  in_progress: { variant: "primary", label: "Đang phục vụ" },
  completed: { variant: "success", label: "Hoàn thành" },
  cancelled: { variant: "gray", label: "Đã hủy" },
  no_show: { variant: "error", label: "Không đến" },
}

const SOURCE_LABEL: Record<string, string> = {
  online: "Online",
  walk_in: "Khách lẻ",
  phone: "Điện thoại",
}

function durationMinutes(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  if (Number.isNaN(diff) || diff <= 0) return "—"
  return `${Math.round(diff / 60000)}p`
}

export function buildAppointmentColumns(): DashColumn<Appointment>[] {
  return [
    {
      id: "time",
      header: "Giờ hẹn",
      className: "whitespace-nowrap font-medium",
      cell: (row) => (
        <div>
          <div className="font-semibold text-on-surface">{formatTime(row.start_time)}</div>
          <div className="text-[11px] text-on-surface-variant">
            {durationMinutes(row.start_time, row.end_time)}
          </div>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Khách hàng",
      className: "min-w-[180px]",
      cell: (row) => (
        <div>
          <div className="font-semibold text-on-surface">{row.customer_name || "Khách lẻ"}</div>
          {row.customer_phone && (
            <div className="text-[11px] text-on-surface-variant">{row.customer_phone}</div>
          )}
        </div>
      ),
    },
    {
      id: "info",
      header: "Thông tin",
      className: "min-w-[180px]",
      cell: (row) => (
        <div>
          <div className="font-medium text-on-surface">{row.code}</div>
          <div className="text-[11px] text-on-surface-variant">
            {SOURCE_LABEL[row.source] ?? row.source}
          </div>
        </div>
      ),
    },
    {
      id: "staff",
      header: "Nhân viên",
      cell: (row) => row.staff_name || "—",
    },
    {
      id: "total",
      header: "Tạm tính",
      className: "whitespace-nowrap text-right font-semibold",
      cell: (row) => `${row.total_amount.toLocaleString("vi-VN")} đ`,
    },
    {
      id: "status",
      header: "Trạng thái",
      className: "text-center",
      cell: (row) => {
        const meta: { variant: StatusVariant; label: string } =
          STATUS_META[row.status] ?? { variant: "slate", label: row.status }
        return (
          <Tag variant={meta.variant} shape="pill" size="md">
            {meta.label}
          </Tag>
        )
      },
    },
  ]
}
