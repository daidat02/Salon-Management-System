'use client';

import * as React from 'react';
import {
  CalendarDays,
  CalendarX2,
  Clock3,
  Info,
  RotateCcw,
  Save,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tag } from '@/components/ui/tag';
import { toast } from '@/components/ui/toast';
import { useBookingSettings, useUpdateBookingSettings } from '@/hooks/use-settings';
import type { BookingSettingsResponse } from '@/types/setting';
import {
  createDefaultBookingSettings,
  SLOT_STEP_OPTIONS,
  type BookingSettings,
} from './mock-data';

type FormErrors = {
  maxPerSlot?: string;
  minLead?: string;
  maxAdvance?: string;
  cancelBefore?: string;
  maxCancellations?: string;
  rescheduleBefore?: string;
  depositPercent?: string;
  depositMaxAmount?: string;
  noShowThreshold?: string;
  noShowLookback?: string;
};

function validate(settings: BookingSettings): FormErrors {
  const errors: FormErrors = {};

  if (settings.maxPerSlot < 1) {
    errors.maxPerSlot = 'Số khách mỗi khung giờ phải lớn hơn 0.';
  }

  if (settings.minLeadMinutes < 0) {
    errors.minLead = 'Thời gian đặt trước tối thiểu không được âm.';
  }

  if (settings.maxAdvanceDays < 1) {
    errors.maxAdvance = 'Số ngày đặt trước tối đa phải lớn hơn 0.';
  }

  if (settings.allowCancel) {
    if (settings.cancelBeforeHours < 0) {
      errors.cancelBefore = 'Hạn hủy trước không được âm.';
    }
    if (settings.maxCancellationsPerMonth < 0) {
      errors.maxCancellations = 'Số lần hủy tối đa không được âm.';
    }
  }

  if (settings.allowReschedule && settings.rescheduleBeforeHours < 0) {
    errors.rescheduleBefore = 'Hạn đổi lịch trước không được âm.';
  }

  if (settings.depositPercent < 0 || settings.depositPercent > 100) {
    errors.depositPercent = 'Tỷ lệ cọc phải nằm trong khoảng 0–100%.';
  } else if (settings.depositEnabled && settings.depositPercent <= 0) {
    errors.depositPercent = 'Tỷ lệ cọc phải lớn hơn 0 khi bật cọc.';
  }

  if (settings.depositMaxAmount < 0) {
    errors.depositMaxAmount = 'Mức cọc tối đa không được âm.';
  }

  if (settings.noShowThreshold < 1) {
    errors.noShowThreshold = 'Ngưỡng số lần không đến phải lớn hơn 0.';
  }

  if (settings.noShowLookbackDays < 1) {
    errors.noShowLookback = 'Số ngày tra cứu no-show phải lớn hơn 0.';
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

const labelClass = 'text-on-surface mb-1.5 block text-xs font-semibold';

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-outline flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <div>
        <p className="text-on-surface text-xs font-semibold">{title}</p>
        <p className="text-on-surface-variant mt-0.5 text-[11px] leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  unit,
  min = 0,
  max,
  disabled,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  error?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      <div className="relative">
        <DashInput
          id={id}
          type="number"
          min={min}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-invalid={Boolean(error) || undefined}
          className="pr-14"
        />
        <span className="text-on-surface-variant pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px]">
          {unit}
        </span>
      </div>
      {error && <p className="text-error mt-1 text-[11px]">{error}</p>}
    </div>
  );
}

function mapBookingSettings(data: BookingSettingsResponse): BookingSettings {
  const defaults = createDefaultBookingSettings();

  return {
    ...defaults,
    slotStepMinutes: String(data.slot_step_minutes),
    maxPerSlot: data.max_per_slot,
    minLeadMinutes: data.min_lead_minutes,
    maxAdvanceDays: data.max_advance_days,
    allowOnlineBooking: data.allow_online_booking,
    autoConfirm: data.auto_confirm,
    allowCancel: data.allow_cancel,
    cancelBeforeHours: data.cancel_before_hours,
    maxCancellationsPerMonth: data.max_cancellations_per_month,
    allowReschedule: data.allow_reschedule,
    rescheduleBeforeHours: data.reschedule_before_hours,
    depositEnabled: data.deposit_enabled,
    depositPercent: data.deposit_percent,
    depositMaxAmount: data.deposit_max_amount,
    noShowThreshold: data.no_show_threshold,
    noShowLookbackDays: data.no_show_lookback_days,
  };
}

function toBookingPayload(settings: BookingSettings): BookingSettingsResponse {
  return {
    allow_online_booking: settings.allowOnlineBooking,
    auto_confirm: settings.autoConfirm,
    slot_step_minutes: Number(settings.slotStepMinutes),
    max_per_slot: settings.maxPerSlot,
    min_lead_minutes: settings.minLeadMinutes,
    max_advance_days: settings.maxAdvanceDays,
    allow_cancel: settings.allowCancel,
    cancel_before_hours: settings.cancelBeforeHours,
    max_cancellations_per_month: settings.maxCancellationsPerMonth,
    allow_reschedule: settings.allowReschedule,
    reschedule_before_hours: settings.rescheduleBeforeHours,
    deposit_enabled: settings.depositEnabled,
    no_show_threshold: settings.noShowThreshold,
    no_show_lookback_days: settings.noShowLookbackDays,
    deposit_percent: settings.depositPercent,
    deposit_max_amount: settings.depositMaxAmount,
  };
}

export default function BookingSettingsView() {
  const { data, isLoading, isError } = useBookingSettings();
  const updateMutation = useUpdateBookingSettings();
  const hydrated = React.useRef(false);
  const [saved, setSaved] = React.useState<BookingSettings>(() => createDefaultBookingSettings());
  const [draft, setDraft] = React.useState<BookingSettings>(saved);

  React.useEffect(() => {
    if (!data || hydrated.current) return;
    const mapped = mapBookingSettings(data);
    hydrated.current = true;
    setSaved(mapped);
    setDraft(mapped);
  }, [data]);

  const errors = validate(draft);
  const invalid = hasAnyError(errors);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const update = React.useCallback(<K extends keyof BookingSettings>(
    key: K,
    value: BookingSettings[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const handleSave = async () => {
    if (invalid) return;
    try {
      const result = await updateMutation.mutateAsync(toBookingPayload(draft));
      const mapped = mapBookingSettings(result);
      setSaved(mapped);
      setDraft(mapped);
      toast.add({
        title: 'Đã lưu cài đặt lịch hẹn',
        description: 'Quy tắc đặt lịch đã được cập nhật.',
        type: 'success',
      });
    } catch {
      toast.add({
        title: 'Không lưu được cài đặt',
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
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-on-surface text-base font-bold">Lịch hẹn</h2>
            <p className="text-on-surface-variant mt-1 max-w-2xl text-xs leading-relaxed">
              Quy tắc đặt lịch, hủy/đổi và đặt cọc. Cấu hình đặt lịch được
              tải trực tiếp từ hệ thống.
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
        icon={Clock3}
        title="Quy tắc đặt lịch"
        description="Cấu hình khung giờ, sức chứa và thời gian khách có thể đặt trước."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className={labelClass}>Bước thời gian đặt lịch</Label>
            <DashSelect
              value={draft.slotStepMinutes}
              onValueChange={(value) => update('slotStepMinutes', value)}
              options={SLOT_STEP_OPTIONS}
            />
          </div>

          <NumberField
            id="booking-max-per-slot"
            label="Số khách tối đa / khung giờ"
            value={draft.maxPerSlot}
            unit="khách"
            min={1}
            error={errors.maxPerSlot}
            onChange={(value) => update('maxPerSlot', value)}
          />

          <NumberField
            id="booking-min-lead"
            label="Đặt trước tối thiểu"
            value={draft.minLeadMinutes}
            unit="phút"
            error={errors.minLead}
            onChange={(value) => update('minLeadMinutes', value)}
          />

          <NumberField
            id="booking-max-advance"
            label="Đặt trước tối đa"
            value={draft.maxAdvanceDays}
            unit="ngày"
            min={1}
            error={errors.maxAdvance}
            onChange={(value) => update('maxAdvanceDays', value)}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ToggleRow
            title="Cho phép khách đặt lịch online"
            description="Khách có thể tự chọn dịch vụ, nhân viên và khung giờ trên trang đặt lịch."
            checked={draft.allowOnlineBooking}
            onCheckedChange={(checked) => update('allowOnlineBooking', checked)}
          />
          <ToggleRow
            title="Tự động xác nhận lịch hẹn"
            description="Lịch đặt online được xác nhận ngay, không cần lễ tân duyệt lại."
            checked={draft.autoConfirm}
            onCheckedChange={(checked) => update('autoConfirm', checked)}
          />
        </div>

        <p className="text-on-surface-variant mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Bước thời gian càng nhỏ thì khách chọn giờ càng linh hoạt, nhưng lịch có thể bị vụn hơn.
        </p>
      </SettingsCard>

      <SettingsCard
        icon={CalendarX2}
        title="Hủy & đổi lịch"
        description="Giới hạn và thời hạn khách được tự hủy hoặc dời lịch hẹn."
      >
        <div className="space-y-3">
          <ToggleRow
            title="Cho phép khách tự hủy lịch"
            description="Khách có thể hủy trên trang đặt lịch thay vì gọi điện cho salon."
            checked={draft.allowCancel}
            onCheckedChange={(checked) => update('allowCancel', checked)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="booking-cancel-before"
              label="Hủy trước ít nhất"
              value={draft.cancelBeforeHours}
              unit="giờ"
              disabled={!draft.allowCancel}
              error={errors.cancelBefore}
              onChange={(value) => update('cancelBeforeHours', value)}
            />
            <NumberField
              id="booking-max-cancellations"
              label="Số lần hủy tối đa / tháng"
              value={draft.maxCancellationsPerMonth}
              unit="lần"
              disabled={!draft.allowCancel}
              error={errors.maxCancellations}
              onChange={(value) => update('maxCancellationsPerMonth', value)}
            />
          </div>

          <ToggleRow
            title="Cho phép khách đổi lịch"
            description="Khách có thể chuyển lịch sang khung giờ khác nếu còn trống."
            checked={draft.allowReschedule}
            onCheckedChange={(checked) => update('allowReschedule', checked)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="booking-reschedule-before"
              label="Đổi lịch trước ít nhất"
              value={draft.rescheduleBeforeHours}
              unit="giờ"
              disabled={!draft.allowReschedule}
              error={errors.rescheduleBefore}
              onChange={(value) => update('rescheduleBeforeHours', value)}
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Wallet}
        title="Đặt cọc & chống no-show"
        description="Khách có nhiều lần không đến sẽ phải đặt cọc cho lần hẹn kế tiếp."
      >
        <div className="space-y-3">
          <ToggleRow
            title="Bật đặt cọc cho khách no-show"
            description="Chỉ áp dụng khi khách đã vượt ngưỡng số lần không đến bên dưới."
            checked={draft.depositEnabled}
            onCheckedChange={(checked) => update('depositEnabled', checked)}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              id="booking-deposit-percent"
              label="Tỷ lệ cọc theo giá trị đơn"
              value={draft.depositPercent}
              unit="%"
              min={0}
              max={100}
              disabled={!draft.depositEnabled}
              error={errors.depositPercent}
              onChange={(value) => update('depositPercent', value)}
            />

            <NumberField
              id="booking-deposit-max"
              label="Mức cọc tối đa"
              value={draft.depositMaxAmount}
              unit="đ"
              min={0}
              disabled={!draft.depositEnabled}
              error={errors.depositMaxAmount}
              onChange={(value) => update('depositMaxAmount', value)}
            />

            <NumberField
              id="booking-no-show-threshold"
              label="Ngưỡng số lần không đến"
              value={draft.noShowThreshold}
              unit="lần"
              min={1}
              disabled={!draft.depositEnabled}
              error={errors.noShowThreshold}
              onChange={(value) => update('noShowThreshold', value)}
            />

            <NumberField
              id="booking-no-show-lookback"
              label="Tra cứu no-show trong"
              value={draft.noShowLookbackDays}
              unit="ngày"
              min={1}
              disabled={!draft.depositEnabled}
              error={errors.noShowLookback}
              onChange={(value) => update('noShowLookbackDays', value)}
            />
          </div>

          <p className="text-on-surface-variant flex items-start gap-1.5 text-[11px] leading-relaxed">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Ví dụ: cọc 10% giá trị đơn và tối đa 300.000đ — khách chỉ cần cọc tối đa 300.000đ dù
            đơn lớn hơn. Nhập 0 cho mức tối đa nếu không muốn giới hạn.
          </p>
        </div>
      </SettingsCard>

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
