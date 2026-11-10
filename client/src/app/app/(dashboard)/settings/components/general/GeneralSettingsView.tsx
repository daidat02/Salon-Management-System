'use client';

import * as React from 'react';
import {
  BadgeCheck,
  Clock,
  Globe,
  Info,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Store,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { cn } from 'cn';
import { DashInput } from '@/components/dashboard/DashInput';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tag } from '@/components/ui/tag';
import { toast } from '@/components/ui/toast';
import useGeneralSettings from '@/hooks/use-general-settings';
import { useUpdateGeneralSettings } from '@/hooks/use-settings';
import type { GeneralSettingsResponse, WorkingHours as ApiWorkingHours } from '@/types/setting';
import {
  createDefaultSettings,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type GeneralSettings,
  type SalonInfo,
  type Weekday,
  type WorkingHours,
} from './mock-data';

type SalonField = 'name' | 'phone' | 'email' | 'address';

type SalonErrors = Partial<Record<SalonField, string>>;

type FormErrors = {
  salon: SalonErrors;
  workingHours?: string;
  days?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(settings: GeneralSettings): FormErrors {
  const salonErrors: SalonErrors = {};

  if (!settings.salon.name.trim()) {
    salonErrors.name = 'Vui lòng nhập tên salon.';
  }

  if (!settings.salon.phone.trim()) {
    salonErrors.phone = 'Vui lòng nhập số điện thoại hotline.';
  }

  if (!settings.salon.email.trim()) {
    salonErrors.email = 'Vui lòng nhập email liên hệ.';
  } else if (!EMAIL_PATTERN.test(settings.salon.email.trim())) {
    salonErrors.email = 'Email không đúng định dạng.';
  }

  if (!settings.salon.address.trim()) {
    salonErrors.address = 'Vui lòng nhập địa chỉ salon.';
  }

  const errors: FormErrors = { salon: salonErrors };

  const workingHours = settings.workingHours;

  if (!workingHours.openTime || !workingHours.closeTime) {
    errors.workingHours = 'Vui lòng nhập đầy đủ giờ mở và giờ đóng.';
  } else if (workingHours.openTime >= workingHours.closeTime) {
    errors.workingHours = 'Giờ đóng phải sau giờ mở.';
  } else if (
    (workingHours.breakStart && !workingHours.breakEnd) ||
    (!workingHours.breakStart && workingHours.breakEnd)
  ) {
    errors.workingHours = 'Giờ nghỉ phải có đủ bắt đầu và kết thúc.';
  } else if (
    workingHours.breakStart &&
    workingHours.breakEnd &&
    (workingHours.breakStart < workingHours.openTime ||
      workingHours.breakEnd > workingHours.closeTime ||
      workingHours.breakStart >= workingHours.breakEnd)
  ) {
    errors.workingHours = 'Giờ nghỉ phải nằm trong giờ mở cửa và bắt đầu trước khi kết thúc.';
  }

  if (workingHours.days.length === 0) {
    errors.days = 'Vui lòng chọn ít nhất một ngày áp dụng.';
  }

  return errors;
}

function hasAnyError(errors: FormErrors): boolean {
  return Boolean(
    Object.keys(errors.salon).length > 0 ||
      errors.workingHours ||
      errors.days,
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border-outline rounded-xl border p-6 shadow-sm">
      <div className="border-outline mb-6 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="flex items-start gap-2">
          <Icon className="text-primary mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h3 className="text-on-surface text-base font-bold">{title}</h3>
            <p className="text-on-surface-variant mt-0.5 max-w-2xl text-xs leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const labelClass = 'text-on-surface mb-1.5 block text-xs font-semibold';

function IconInput({
  icon: Icon,
  error,
  className,
  ...props
}: { icon: LucideIcon; error?: string } & React.ComponentProps<typeof DashInput>) {
  return (
    <div>
      <div className="relative">
        <Icon className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <DashInput
          className={cn('pl-9', className)}
          aria-invalid={Boolean(error) || undefined}
          {...props}
        />
      </div>
      {error && <p className="text-error mt-1 text-[11px]">{error}</p>}
    </div>
  );
}

function SalonInfoCard({
  salon,
  errors,
  onChange,
}: {
  salon: SalonInfo;
  errors: SalonErrors;
  onChange: <K extends keyof SalonInfo>(key: K, value: SalonInfo[K]) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.add({
        title: 'Ảnh quá lớn',
        description: 'Vui lòng chọn ảnh tối đa 2MB.',
        type: 'error',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange('logoUrl', String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <SettingsCard
      icon={Store}
      title="Thông tin salon & thương hiệu"
      description="Thông tin này hiển thị trên phiếu in, tin nhắn SMS/Zalo gửi khách và hệ thống online."
      action={
        <Tag variant="primary" size="md" shape="pill">
          Đang áp dụng
        </Tag>
      }
    >
      <div className="border-outline-variant bg-surface-container-low mb-6 flex flex-col items-start gap-5 rounded-xl border p-4 sm:flex-row sm:items-center">
        <div
          className="border-outline bg-surface text-primary flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-cover bg-center text-xl font-bold shadow-xs"
          style={salon.logoUrl ? { backgroundImage: `url("${salon.logoUrl}")` } : undefined}
          aria-label="Xem trước logo"
        >
          {!salon.logoUrl && <Store className="h-8 w-8" />}
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="border-outline bg-surface text-on-surface hover:bg-surface-container h-8 px-3 text-xs font-semibold shadow-xs"
            >
              <Upload className="text-primary h-3.5 w-3.5" />
              Đổi ảnh logo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!salon.logoUrl}
              onClick={() => onChange('logoUrl', '')}
              className="text-error hover:bg-red-50 h-8 px-2 text-xs font-medium"
            >
              Gỡ ảnh
            </Button>
          </div>
          <p className="text-on-surface-variant text-xs leading-relaxed">
            Hỗ trợ định dạng PNG, JPG, WEBP. Dung lượng tối đa 2MB. Tỉ lệ khuyến nghị 1:1.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="salon-name" className={labelClass}>
            Tên Salon / Thương hiệu <span className="text-error">*</span>
          </Label>
          <DashInput
            id="salon-name"
            value={salon.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="VD: SALON TÓC MỘC"
            className="font-medium"
            aria-invalid={Boolean(errors.name) || undefined}
          />
          {errors.name && <p className="text-error mt-1 text-[11px]">{errors.name}</p>}
        </div>

        <div>
          <Label htmlFor="salon-phone" className={labelClass}>
            Số điện thoại hotline <span className="text-error">*</span>
          </Label>
          <IconInput
            icon={Phone}
            id="salon-phone"
            value={salon.phone}
            onChange={(event) => onChange('phone', event.target.value)}
            placeholder="VD: 0909 888 999"
            error={errors.phone}
          />
        </div>

        <div>
          <Label htmlFor="salon-email" className={labelClass}>
            Email liên hệ <span className="text-error">*</span>
          </Label>
          <IconInput
            icon={Mail}
            id="salon-email"
            type="email"
            value={salon.email}
            onChange={(event) => onChange('email', event.target.value)}
            placeholder="VD: contact@salon.vn"
            error={errors.email}
          />
        </div>

        <div>
          <Label htmlFor="salon-website" className={labelClass}>
            Website / Fanpage
          </Label>
          <IconInput
            icon={Globe}
            id="salon-website"
            value={salon.website}
            onChange={(event) => onChange('website', event.target.value)}
            placeholder="VD: fb.com/salon.vn"
          />
        </div>

        <div>
          <Label htmlFor="salon-tax-code" className={labelClass}>
            Mã số thuế doanh nghiệp
          </Label>
          <IconInput
            icon={BadgeCheck}
            id="salon-tax-code"
            value={salon.taxCode}
            onChange={(event) => onChange('taxCode', event.target.value)}
            placeholder="VD: 0314982736"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="salon-address" className={labelClass}>
            Địa chỉ cơ sở salon <span className="text-error">*</span>
          </Label>
          <IconInput
            icon={MapPin}
            id="salon-address"
            value={salon.address}
            onChange={(event) => onChange('address', event.target.value)}
            placeholder="Số nhà, đường, phường, quận, tỉnh/thành"
            error={errors.address}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="salon-slogan" className={labelClass}>
            Khẩu hiệu / Slogan thương hiệu
          </Label>
          <DashInput
            id="salon-slogan"
            value={salon.slogan}
            onChange={(event) => onChange('slogan', event.target.value)}
            placeholder="VD: Nâng tầm phong cách và nét đẹp rạng ngời"
            className="italic"
          />
        </div>
      </div>
    </SettingsCard>
  );
}

function BusinessHoursCard({
  value,
  errors,
  onChange,
}: {
  value: WorkingHours;
  errors: { workingHours?: string; days?: string };
  onChange: (patch: Partial<WorkingHours>) => void;
}) {
  const toggleDay = (weekday: Weekday) => {
    onChange({
      days: value.days.includes(weekday)
        ? value.days.filter((day) => day !== weekday)
        : [...value.days, weekday].sort((a, b) => a - b),
    });
  };

  const toggleAll = () => {
    onChange({ days: value.days.length === WEEKDAYS.length ? [] : [...WEEKDAYS] });
  };

  return (
    <SettingsCard
      icon={Clock}
      title="Giờ làm việc & mở cửa"
      description="Chọn một khung giờ duy nhất rồi áp dụng cho các ngày làm việc trong tuần."
      action={
        <Tag variant={value.days.length > 0 ? 'success' : 'warning'} size="md" shape="pill" dot>
          {value.days.length > 0
            ? `Áp dụng ${value.days.length}/7 ngày`
            : 'Chưa chọn ngày'}
        </Tag>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="working-open-time" className={labelClass}>
            Giờ mở cửa <span className="text-error">*</span>
          </Label>
          <DashInput
            id="working-open-time"
            type="time"
            value={value.openTime}
            onChange={(event) => onChange({ openTime: event.target.value })}
            aria-invalid={Boolean(errors.workingHours) || undefined}
          />
        </div>
        <div>
          <Label htmlFor="working-close-time" className={labelClass}>
            Giờ đóng cửa <span className="text-error">*</span>
          </Label>
          <DashInput
            id="working-close-time"
            type="time"
            value={value.closeTime}
            onChange={(event) => onChange({ closeTime: event.target.value })}
            aria-invalid={Boolean(errors.workingHours) || undefined}
          />
        </div>
        <div>
          <Label htmlFor="working-break-start" className={labelClass}>
            Nghỉ bắt đầu
          </Label>
          <DashInput
            id="working-break-start"
            type="time"
            value={value.breakStart}
            onChange={(event) => onChange({ breakStart: event.target.value })}
            aria-invalid={Boolean(errors.workingHours) || undefined}
          />
        </div>
        <div>
          <Label htmlFor="working-break-end" className={labelClass}>
            Nghỉ kết thúc
          </Label>
          <DashInput
            id="working-break-end"
            type="time"
            value={value.breakEnd}
            onChange={(event) => onChange({ breakEnd: event.target.value })}
            aria-invalid={Boolean(errors.workingHours) || undefined}
          />
        </div>
      </div>

      {errors.workingHours && (
        <p className="text-error mt-2 text-[11px]">{errors.workingHours}</p>
      )}

      <div className="border-outline mt-5 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-on-surface text-xs font-semibold">Áp dụng cho các ngày</p>
            <p className="text-on-surface-variant mt-0.5 text-[11px]">
              Các ngày được chọn dùng chung khung giờ phía trên.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={toggleAll}
            className="text-primary hover:bg-surface-container h-7 px-2 text-[11px] font-semibold"
          >
            {value.days.length === WEEKDAYS.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </Button>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {WEEKDAYS.map((weekday) => {
            const selected = value.days.includes(weekday);

            return (
              <label
                key={weekday}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors',
                  selected
                    ? 'border-primary bg-primary-container/20 text-primary'
                    : 'border-outline text-on-surface-variant hover:bg-surface-container',
                )}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => toggleDay(weekday)}
                  aria-label={`Áp dụng ${WEEKDAY_LABELS[weekday]}`}
                />
                <span>{WEEKDAY_LABELS[weekday]}</span>
              </label>
            );
          })}
        </div>

        {errors.days && <p className="text-error mt-2 text-[11px]">{errors.days}</p>}
      </div>

      <p className="text-on-surface-variant mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Khung giờ này được áp dụng đồng nhất cho mọi ngày được chọn. Ngoài giờ, hệ thống tự động
        khóa nhận lịch hẹn.
      </p>
    </SettingsCard>
  );
}

function timeToMinutes(value?: string | null): number {
  if (!value) return 0;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

function minutesToTime(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '';
  const clamped = Math.max(0, Math.min(Math.round(value), 24 * 60));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function mapGeneralSettings(data: GeneralSettingsResponse): GeneralSettings {
  const defaults = createDefaultSettings();
  const org = data.organization;
  const workingHours = data.working_hours;
  const apiDays = workingHours?.days ?? [];

  const days = apiDays
    .filter((day) => day.is_open)
    .map((day) => day.weekday)
    .filter((weekday): weekday is Weekday => WEEKDAYS.includes(weekday as Weekday))
    .sort((a, b) => a - b);

  return {
    ...defaults,
    salon: {
      name: org.name ?? '',
      slogan: org.slogan ?? '',
      phone: org.phone ?? '',
      email: org.email ?? '',
      website: org.website ?? '',
      address: org.address ?? '',
      taxCode: org.tax_code ?? '',
      logoUrl: org.logo_url ?? '',
    },
    workingHours: {
      openTime:
        minutesToTime(workingHours?.open_time_minutes) || defaults.workingHours.openTime,
      closeTime:
        minutesToTime(workingHours?.close_time_minutes) || defaults.workingHours.closeTime,
      breakStart: minutesToTime(workingHours?.break_start_minutes),
      breakEnd: minutesToTime(workingHours?.break_end_minutes),
      days: days.length > 0 ? days : defaults.workingHours.days,
    },
  };
}

function buildWorkingHours(settings: GeneralSettings): ApiWorkingHours {
  const value = settings.workingHours;

  return {
    open_time_minutes: timeToMinutes(value.openTime),
    close_time_minutes: timeToMinutes(value.closeTime),
    break_start_minutes: value.breakStart ? timeToMinutes(value.breakStart) : null,
    break_end_minutes: value.breakEnd ? timeToMinutes(value.breakEnd) : null,
    days: WEEKDAYS.map((weekday) => ({
      weekday,
      is_open: value.days.includes(weekday),
    })),
  };
}

function toGeneralPayload(
  settings: GeneralSettings,
  organization: GeneralSettingsResponse['organization'],
): GeneralSettingsResponse {
  return {
    organization: {
      ...organization,
      name: settings.salon.name,
      phone: settings.salon.phone,
      email: settings.salon.email,
      website: settings.salon.website,
      address: settings.salon.address,
      tax_code: settings.salon.taxCode,
      slogan: settings.salon.slogan,
      logo_url: settings.salon.logoUrl,
    },
    working_hours: buildWorkingHours(settings),
  };
}

export default function GeneralSettingsView() {
  const { data, isLoading, isError } = useGeneralSettings();
  const updateMutation = useUpdateGeneralSettings();
  const hydrated = React.useRef(false);
  const [saved, setSaved] = React.useState<GeneralSettings>(() => createDefaultSettings());
  const [draft, setDraft] = React.useState<GeneralSettings>(saved);

  React.useEffect(() => {
    if (!data || hydrated.current) return;
    const mapped = mapGeneralSettings(data);
    hydrated.current = true;
    setSaved(mapped);
    setDraft(mapped);
  }, [data]);

  const errors = validate(draft);
  const invalid = hasAnyError(errors);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const updateSalon = React.useCallback(
    <K extends keyof SalonInfo>(key: K, value: SalonInfo[K]) => {
      setDraft((current) => ({ ...current, salon: { ...current.salon, [key]: value } }));
    },
    [],
  );

  const updateWorkingHours = React.useCallback((patch: Partial<WorkingHours>) => {
    setDraft((current) => ({
      ...current,
      workingHours: { ...current.workingHours, ...patch },
    }));
  }, []);

  const handleSave = async () => {
    if (invalid || !data) return;
    try {
      const result = await updateMutation.mutateAsync(
        toGeneralPayload(draft, data.organization),
      );
      const mapped = mapGeneralSettings(result);
      setSaved(mapped);
      setDraft(mapped);
      toast.add({
        title: 'Đã lưu cài đặt chung',
        description: 'Thông tin salon và giờ làm việc đã được cập nhật.',
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

  const handleReset = () => {
    setDraft(saved);
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface border-outline flex flex-wrap items-start justify-between gap-3 rounded-xl border p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="bg-primary-container text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Store className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-on-surface text-base font-bold">Cửa hàng</h2>
            <p className="text-on-surface-variant mt-1 max-w-2xl text-xs leading-relaxed">
              Thông tin nhận diện salon và giờ hoạt động. Dữ liệu được tải trực tiếp từ hệ
              thống.
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

      <SalonInfoCard salon={draft.salon} errors={errors.salon} onChange={updateSalon} />

      <BusinessHoursCard
        value={draft.workingHours}
        errors={{ workingHours: errors.workingHours, days: errors.days }}
        onChange={updateWorkingHours}
      />

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
                onClick={handleReset}
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
