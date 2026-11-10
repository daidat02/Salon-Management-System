"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  Clock3,
  MessageCircle,
  Pencil,
  Phone,
  Scissors,
  StickyNote,
  Timer,
  Trash2,
  Wallet,
} from "lucide-react";
import { DashDialog, DashDialogFooter } from "@/components/dashboard/DashDialog";
import { DashDrawer } from "@/components/dashboard/DashDrawer";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import useAppointmentDetail from "@/hooks/use-appointment-detail";
import { useCancelAppointment } from "@/hooks/use-cancel-appointment";
import { useBookingSettings } from "@/hooks/use-settings";
import { formatDateTime, formatVND } from "@/lib/format";
import type { Appointment, AppointmentStatus } from "@/types/appointment";
import { AppointmentCreateDialog } from "./AppointmentCreateDialog";
import { AppointmentRescheduleDialog } from "./AppointmentRescheduleDialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
};

type StatusMeta = {
  variant: "warning" | "blue" | "teal" | "primary" | "success" | "gray" | "error";
  label: string;
};

const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  pending: { variant: "warning", label: "Chờ xác nhận" },
  confirmed: { variant: "blue", label: "Đã xác nhận" },
  checked_in: { variant: "teal", label: "Đã check-in" },
  in_progress: { variant: "primary", label: "Đang phục vụ" },
  completed: { variant: "success", label: "Hoàn thành" },
  cancelled: { variant: "gray", label: "Đã hủy" },
  no_show: { variant: "error", label: "Không đến" },
};

/** Lịch ở các trạng thái này không được tạo đơn tại POS. */
const PAYMENT_BLOCKED_REASON: Partial<Record<AppointmentStatus, string>> = {
  completed: "Lịch đã hoàn thành — không thể tạo đơn.",
  cancelled: "Lịch đã hủy — không thể tạo đơn.",
  no_show: "Khách không đến — không thể tạo đơn.",
};

const CANCELLABLE_STATUSES: AppointmentStatus[] = ["pending", "confirmed"];

const SOURCE_LABEL: Record<string, string> = {
  online: "Đặt online",
  walk_in: "Khách đến trực tiếp",
  phone: "Đặt qua điện thoại",
};

const WEEKDAY_LABEL = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDay(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${WEEKDAY_LABEL[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function durationMinutes(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(diff) || diff <= 0) return 0;
  return Math.round(diff / 60000);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function InfoTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-outline bg-surface-container-low p-3">
      <span className="mb-1 block text-[10px] font-medium text-on-surface-variant uppercase">
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
        {icon}
        {value}
      </span>
    </div>
  );
}

export function AppointmentDetailDrawer({ open, onOpenChange, appointment }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSession, setEditSession] = React.useState(0);
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelError, setCancelError] = React.useState("");
  const {
    data: detail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useAppointmentDetail(appointment?.id);
  const { data: bookingSettings } = useBookingSettings();
  const cancelAppointment = useCancelAppointment();

  const current = detail?.appointment ?? appointment;
  const items = detail?.items ?? [];

  const status = current ? STATUS_META[current.status] : null;
  const customerName = current?.customer_name || "Khách lẻ";
  const customerPhone = current?.customer_phone || "";
  const staffName = current?.staff_name || "Chưa phân công";
  const duration = current
    ? durationMinutes(current.start_time, current.end_time)
    : 0;
  const itemsTotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const total = items.length > 0 ? itemsTotal : (current?.total_amount ?? 0);
  const note = current?.note || "Không có ghi chú";
  const paymentBlockReason = current ? PAYMENT_BLOCKED_REASON[current.status] : undefined;
  const canStartPayment = !!current && !paymentBlockReason && !isDetailLoading;
  const cancellableByStatus = current
    ? CANCELLABLE_STATUSES.includes(current.status)
    : false;
  const canCancel = !!current && cancellableByStatus && bookingSettings?.allow_cancel !== false;
  const canReschedule =
    !!current && cancellableByStatus && bookingSettings?.allow_reschedule !== false;

  const handleCancel = async () => {
    if (!current || !canCancel) return;
    setCancelError("");
    try {
      await cancelAppointment.mutateAsync({
        id: current.id,
        reason: cancelReason.trim() || undefined,
      });
      toast.add({
        title: "Đã hủy lịch hẹn",
        description: `${current.customer_name || "Khách"} • ${current.code}`,
        type: "success",
      });
      setCancelOpen(false);
      setCancelReason("");
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Không thể hủy lịch hẹn. Vui lòng thử lại.",
      );
    }
  };

  const startPayment = () => {
    if (!current || !canStartPayment) return;
    onOpenChange(false);
    router.push(`/app/cashier/pos?appointmentId=${current.id}`);
  };

  const mockAction = (title: string) => {
    toast.add({
      title,
      description: "Chức năng đang được hoàn thiện.",
      type: "info",
    });
  };

  return (
    <>
      <DashDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={`Mã lịch hẹn: ${current?.code ?? "—"}`}
      subtitle={`Tạo lúc ${current ? formatDateTime(current.created_at) : "—"}`}
      badge={
        status && (
          <Tag variant={status.variant} shape="pill" size="md" dot>
            {status.label}
          </Tag>
        )
      }
      footer={
        <>
          <Button
            className="flex-1 bg-primary text-on-primary hover:bg-[#436b95]"
            disabled={!canStartPayment}
            title={paymentBlockReason}
            onClick={startPayment}
          >
            <Wallet className="h-4 w-4" />
            Bắt đầu thanh toán
          </Button>
          <Button
            variant="outline"
            className="border-outline text-slate-700"
            disabled={isDetailLoading}
            onClick={() => {
              setEditSession((session) => session + 1);
              setEditOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Cập nhật
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Đổi lịch"
            title={canReschedule ? "Đổi lịch hẹn" : "Lịch này không thể đổi"}
            className="border-outline text-slate-700"
            disabled={!canReschedule}
            onClick={() => setRescheduleOpen(true)}
          >
            <CalendarClock className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Hủy lịch"
            title={canCancel ? "Hủy lịch hẹn" : "Lịch này không thể hủy"}
            className="border-red-200 text-error hover:bg-red-50"
            disabled={!canCancel}
            onClick={() => {
              setCancelError("");
              setCancelOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      }
      widthClass="!w-[480px] !max-w-[480px]"
    >
      {current && (
        <>
      {paymentBlockReason && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          {paymentBlockReason}
        </div>
      )}

      {/* Khách hàng */}
      <section className="rounded-xl border border-outline bg-surface-container-low p-4">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-container text-lg font-bold text-primary ring-2 ring-primary/20">
            {initials(customerName) || "K"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <h4 className="truncate text-base font-bold text-slate-900">{customerName}</h4>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">
                {customerPhone ? (
                  <>
                    SĐT: <span className="font-medium text-on-surface">{customerPhone}</span>
                  </>
                ) : (
                  "Chưa có SĐT khách hàng"
                )}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!customerPhone}
                className="border-outline bg-white text-primary hover:bg-primary-container/40"
                onClick={() => {
                  if (customerPhone) window.location.href = `tel:${customerPhone}`;
                }}
              >
                <Phone className="h-3.5 w-3.5" />
                Gọi điện
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!customerPhone}
                className="border-outline bg-white text-slate-700"
                onClick={() => mockAction("Nhắn Zalo")}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Nhắn Zalo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Thông tin lịch */}
      <section className="space-y-3 rounded-xl border border-outline bg-surface-container-low p-4">
        <h5 className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
          Thông tin lịch xếp
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <InfoTile
            label="Thời gian phục vụ"
            icon={<Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" />}
            value={`${formatTime(current.start_time)} - ${formatTime(current.end_time)} (${duration} phút)`}
          />
          <InfoTile
            label="Ngày hẹn"
            icon={<CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />}
            value={formatDay(current.start_time)}
          />
          <InfoTile
            label="Nguồn đặt"
            icon={<Timer className="h-3.5 w-3.5 shrink-0 text-primary" />}
            value={SOURCE_LABEL[current.source] ?? current.source}
          />
          <InfoTile
            label="Tổng tạm tính"
            icon={<Wallet className="h-3.5 w-3.5 shrink-0 text-primary" />}
            value={formatVND(total)}
          />
        </div>
      </section>

      {/* Nhân viên phụ trách */}
      <section className="rounded-xl border border-outline bg-surface-container-low p-4">
        <div className="mb-3 flex items-center justify-between">
          <h5 className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
            Kỹ thuật viên phụ trách
          </h5>
          <button
            type="button"
            className="text-[11px] font-semibold text-primary hover:underline"
            onClick={() => mockAction("Đổi kỹ thuật viên")}
          >
            Đổi thợ
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-primary">
            {initials(staffName) || "NV"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-on-surface">{staffName}</p>
          </div>
        </div>
      </section>

      {/* Dịch vụ */}
      <section className="rounded-xl border border-outline bg-surface-container-low p-4">
        <div className="mb-3 flex items-center justify-between">
          <h5 className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
            Dịch vụ đã chọn ({items.length})
          </h5>
          <Scissors className="h-3.5 w-3.5 text-on-surface-variant" />
        </div>
        {isDetailLoading ? (
          <p className="py-2 text-xs text-on-surface-variant">Đang tải chi tiết...</p>
        ) : isDetailError ? (
          <p className="py-2 text-xs text-on-surface-variant">
            Không tải được chi tiết lịch hẹn.
          </p>
        ) : items.length === 0 ? (
          <p className="py-2 text-xs text-on-surface-variant">Chưa có dịch vụ/sản phẩm.</p>
        ) : (
          <div className="divide-y divide-outline/60">
            {items.map((item) => {
              const name =
                item.service_name ||
                item.product_name ||
                (item.item_type === "service" ? "Dịch vụ" : "Sản phẩm");
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{name}</p>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">
                      SL: {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-on-surface">
                    {formatVND(item.line_total)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-dashed border-outline pt-3">
          <span className="text-[11px] text-on-surface-variant">Tổng tạm tính:</span>
          <span className="text-base font-bold text-primary">{formatVND(total)}</span>
        </div>
      </section>

      {/* Ghi chú */}
      <section className="rounded-xl border border-outline bg-surface-container-low p-4">
        <h5 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
          <StickyNote className="h-3.5 w-3.5" />
          Ghi chú phục vụ
        </h5>
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>{note}</span>
        </div>
      </section>
        </>
      )}
      </DashDrawer>

      <AppointmentCreateDialog
        key={editSession}
        open={editOpen}
        onOpenChange={setEditOpen}
        appointment={current}
        customerName={current?.customer_name}
        customerPhone={current?.customer_phone}
        items={items}
      />

      {current && (
        <AppointmentRescheduleDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          appointment={current}
        />
      )}

      <DashDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Hủy lịch hẹn"
        description={`${current?.customer_name || "Khách"} • ${current?.code ?? ""}`}
        maxWidth="max-w-[460px]"
        footer={
          <DashDialogFooter
            onCancel={() => setCancelOpen(false)}
            onConfirm={() => void handleCancel()}
            confirmText="Xác nhận hủy"
            loadingText="Đang hủy..."
            isLoading={cancelAppointment.isPending}
          />
        }
      >
        <div className="space-y-3 py-4">
          <p className="text-xs text-on-surface-variant">
            Lịch hẹn sẽ chuyển sang trạng thái đã hủy. Thao tác này không thể hoàn tác.
          </p>
          <div>
            <label
              htmlFor="cancel-reason"
              className="mb-1.5 block text-xs font-semibold text-on-surface"
            >
              Lý do hủy (không bắt buộc)
            </label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Ví dụ: Khách bận, đổi sang tuần sau..."
              rows={2}
              className="text-sm"
            />
          </div>
          {cancelError && <p className="text-[11px] text-error">{cancelError}</p>}
        </div>
      </DashDialog>
    </>
  );
}
