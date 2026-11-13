'use client';

import * as React from 'react';
import {
  BellRing,
  Cake,
  Clock3,
  Info,
  MessageSquare,
  Package,
  RotateCcw,
  Save,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { DashInput } from '@/components/dashboard/DashInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tag } from '@/components/ui/tag';
import { toast } from '@/components/ui/toast';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/settings';
import type { NotificationSettingsResponse } from '@/types/setting';
import {
  createDefaultNotificationSettings,
  type CustomerNotificationKey,
  type InternalNotificationKey,
  type NotificationSettings,
} from './mock-data';

type FormErrors = {
  reminderHours?: string;
  lowStock?: string;
  reportTime?: string;
};

const labelClass = 'text-on-surface mb-1.5 block text-xs font-semibold';

function validate(settings: NotificationSettings): FormErrors {
  const errors: FormErrors = {};

  if (settings.customer.reminder) {
    if (settings.reminderHoursBefore < 0 || settings.reminderHoursBefore > 168) {
      errors.reminderHours = 'Thời gian nhắc trước phải nằm trong khoảng 0–168 giờ.';
    }
  }

  if (settings.internal.lowStock && settings.lowStockThreshold < 1) {
    errors.lowStock = 'Ngưỡng cảnh báo phải lớn hơn 0.';
  }

  if (settings.internal.dailyReport && !settings.reportTime) {
    errors.reportTime = 'Chọn giờ gửi báo cáo.';
  }

  return errors;
}

function hasAnyError(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border-outline rounded-xl border p-6 shadow-sm">
      <div className="border-outline mb-5 flex items-start gap-2 border-b pb-4">
        <Icon className="text-primary mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h3 className="text-on-surface text-base font-bold">{title}</h3>
          <p className="text-on-surface-variant mt-0.5 max-w-2xl text-xs leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function NotificationRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-outline rounded-lg border p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="bg-primary-container text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-on-surface text-xs font-semibold">{title}</p>
            <p className="text-on-surface-variant mt-0.5 text-[11px] leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
      </div>
      {checked && children && <div className="mt-3 ml-10">{children}</div>}
    </div>
  );
}

function mapNotificationSettings(data: NotificationSettingsResponse): NotificationSettings {
  return {
    customer: {
      reminder: data.appointment_reminder,
      birthday: data.birthday_voucher,
    },
    internal: {
      newBooking: data.new_booking_alert,
      lowStock: data.low_stock_alert,
      dailyReport: data.daily_revenue_report,
    },
    reminderHoursBefore: data.reminder_hours_before,
    lowStockThreshold: data.low_stock_threshold,
    reportTime: data.daily_report_time.slice(0, 5),
  };
}

function toPayload(settings: NotificationSettings): NotificationSettingsResponse {
  return {
    appointment_reminder: settings.customer.reminder,
    new_booking_alert: settings.internal.newBooking,
    low_stock_alert: settings.internal.lowStock,
    daily_revenue_report: settings.internal.dailyReport,
    birthday_voucher: settings.customer.birthday,
    reminder_hours_before: settings.reminderHoursBefore,
    low_stock_threshold: settings.lowStockThreshold,
    daily_report_time: settings.reportTime,
  };
}

export default function NotificationsSettingsView() {
  const { data, isLoading, isError } = useNotificationSettings();
  const updateMutation = useUpdateNotificationSettings();
  const hydrated = React.useRef(false);
  const [saved, setSaved] = React.useState<NotificationSettings>(() =>
    createDefaultNotificationSettings(),
  );
  const [draft, setDraft] = React.useState<NotificationSettings>(saved);

  React.useEffect(() => {
    if (!data || hydrated.current) return;
    const mapped = mapNotificationSettings(data);
    hydrated.current = true;
    setSaved(mapped);
    setDraft(mapped);
  }, [data]);

  const errors = validate(draft);
  const invalid = hasAnyError(errors);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const update = React.useCallback(<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const toggleCustomer = (key: CustomerNotificationKey) => {
    setDraft((current) => ({
      ...current,
      customer: { ...current.customer, [key]: !current.customer[key] },
    }));
  };

  const toggleInternal = (key: InternalNotificationKey) => {
    setDraft((current) => ({
      ...current,
      internal: { ...current.internal, [key]: !current.internal[key] },
    }));
  };

  const handleSave = async () => {
    if (invalid) return;
    try {
      const result = await updateMutation.mutateAsync(toPayload(draft));
      const mapped = mapNotificationSettings(result);
      setSaved(mapped);
      setDraft(mapped);
      toast.add({
        title: 'Đã lưu cấu hình thông báo',
        description: 'Cấu hình đã được cập nhật vào hệ thống.',
        type: 'success',
      });
    } catch {
      toast.add({
        title: 'Không lưu được cấu hình',
        description: 'Vui lòng thử lại sau.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface border-outline flex flex-wrap items-start justify-between gap-3 rounded-xl border p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="bg-primary-container text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <BellRing className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-on-surface text-base font-bold">Thông báo</h2>
            <p className="text-on-surface-variant mt-1 max-w-2xl text-xs leading-relaxed">
              Bật/tắt nhắc lịch cho khách và các cảnh báo vận hành nội bộ. Cấu hình được tải trực
              tiếp từ hệ thống.
            </p>
          </div>
        </div>
        {isLoading ? (
          <Tag variant="blue" size="md" shape="pill">
            Đang tải...
          </Tag>
        ) : isError ? (
          <Tag variant="error" size="md" shape="pill">
            Không tải được dữ liệu
          </Tag>
        ) : (
          <Tag variant="success" size="md" shape="pill" dot>
            Đã kết nối
          </Tag>
        )}
      </div>

      <SettingsCard
        icon={MessageSquare}
        title="Thông báo cho khách hàng"
        description="Tin nhắn tự động gửi cho khách theo từng thời điểm trong vòng đời phục vụ."
      >
        <div className="space-y-3">
          <NotificationRow
            icon={Clock3}
            title="Nhắc lịch hẹn trước giờ"
            description="Gửi SMS / Zalo ZNS nhắc khách trước giờ hẹn để giảm tỷ lệ quên lịch."
            checked={draft.customer.reminder}
            onCheckedChange={() => toggleCustomer('reminder')}
          >
            <div className="max-w-[220px]">
              <Label htmlFor="notification-reminder-hours" className={labelClass}>
                Nhắc trước
              </Label>
              <div className="relative">
                <DashInput
                  id="notification-reminder-hours"
                  type="number"
                  min={0}
                  max={168}
                  value={draft.reminderHoursBefore}
                  onChange={(event) => update('reminderHoursBefore', Number(event.target.value))}
                  aria-invalid={Boolean(errors.reminderHours) || undefined}
                  className="pr-16"
                />
                <span className="text-on-surface-variant pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px]">
                  giờ
                </span>
              </div>
              {errors.reminderHours && (
                <p className="text-error mt-1 text-[11px]">{errors.reminderHours}</p>
              )}
            </div>
          </NotificationRow>

          <NotificationRow
            icon={Cake}
            title="Chúc mừng sinh nhật kèm voucher"
            description="Tự động gửi lời chúc và mã ưu đãi cho khách có sinh nhật trong tháng."
            checked={draft.customer.birthday}
            onCheckedChange={() => toggleCustomer('birthday')}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={ShieldCheck}
        title="Thông báo vận hành nội bộ"
        description="Cảnh báo cho lễ tân, quản lý và thu ngân ngay trên hệ thống."
      >
        <div className="space-y-3">
          <NotificationRow
            icon={BellRing}
            title="Chuông & push khi có lịch đặt online mới"
            description="Phát âm thanh và hiển thị thông báo trên máy thu ngân, tablet lễ tân."
            checked={draft.internal.newBooking}
            onCheckedChange={() => toggleInternal('newBooking')}
          />

          <NotificationRow
            icon={Package}
            title="Cảnh báo tồn kho thấp"
            description="Thông báo khi số lượng sản phẩm chạm ngưỡng an toàn."
            checked={draft.internal.lowStock}
            onCheckedChange={() => toggleInternal('lowStock')}
          >
            <div className="max-w-[220px]">
              <Label htmlFor="notification-low-stock" className={labelClass}>
                Ngưỡng cảnh báo
              </Label>
              <div className="relative">
                <DashInput
                  id="notification-low-stock"
                  type="number"
                  min={1}
                  value={draft.lowStockThreshold}
                  onChange={(event) => update('lowStockThreshold', Number(event.target.value))}
                  aria-invalid={Boolean(errors.lowStock) || undefined}
                  className="pr-16"
                />
                <span className="text-on-surface-variant pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px]">
                  sản phẩm
                </span>
              </div>
              {errors.lowStock && <p className="text-error mt-1 text-[11px]">{errors.lowStock}</p>}
            </div>
          </NotificationRow>

          <NotificationRow
            icon={Clock3}
            title="Báo cáo doanh thu cuối ngày"
            description="Gửi báo cáo tổng kết đơn hàng, doanh thu và hoa hồng cho quản lý."
            checked={draft.internal.dailyReport}
            onCheckedChange={() => toggleInternal('dailyReport')}
          >
            <div className="max-w-[160px]">
              <Label htmlFor="notification-report-time" className={labelClass}>
                Giờ gửi
              </Label>
              <DashInput
                id="notification-report-time"
                type="time"
                value={draft.reportTime}
                onChange={(event) => update('reportTime', event.target.value)}
                aria-invalid={Boolean(errors.reportTime) || undefined}
              />
              {errors.reportTime && <p className="text-error mt-1 text-[11px]">{errors.reportTime}</p>}
            </div>
          </NotificationRow>
        </div>
      </SettingsCard>

      <p className="text-on-surface-variant flex items-start gap-1.5 px-1 text-[11px] leading-relaxed">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Việc gửi thật qua SMS/Zalo/Email sẽ được nối ở giai đoạn thông báo; tab này lưu cấu hình
        bật/tắt và tham số gửi.
      </p>

      {dirty && (
        <div className="sticky bottom-4 z-20">
          <div className="bg-surface border-outline flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg">
            <div>
              <p className="text-on-surface text-xs font-semibold">Có thay đổi chưa lưu</p>
              <p className="text-on-surface-variant mt-0.5 text-[11px]">
                {invalid
                  ? 'Vui lòng sửa các trường báo lỗi trước khi lưu.'
                  : 'Bấm Lưu để cập nhật cấu hình vào hệ thống.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setDraft(saved)}
                className="border-outline text-slate-600 hover:bg-surface-container px-3 py-2 text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Khôi phục
              </Button>
              <Button
                onClick={handleSave}
                disabled={invalid || updateMutation.isPending}
                className="bg-primary hover:bg-[#436b95] text-on-primary px-4 py-2 text-xs font-semibold shadow-sm"
              >
                <Save className="h-3.5 w-3.5" />
                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
