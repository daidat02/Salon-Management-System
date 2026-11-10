'use client';

import { useMemo, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { CheckCircle2, Loader2, Search, UserRound, X } from 'lucide-react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { DashCombobox } from '@/components/dashboard/DashCombobox';
import { DashDatePicker } from '@/components/dashboard/DashDatePicker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import useService from '@/hooks/use-service';
import useStaff from '@/hooks/use-staff';
import { useCreateAppointment } from '@/hooks/use-create-appointment';
import { useUpdateAppointment } from '@/hooks/use-update-appointment';
import { getCustomerByPhone, normalizePhone } from '@/services/customer';
import { getApiErrorMessage } from '@/services/apiClient';
import { useBookingSettings, useGeneralSettings } from '@/hooks/use-settings';
import { describeWorkingHours, validateBookingWindow, workingDayFor } from '@/lib/booking';
import type { CreateAppointmentPayload } from '@/services/appointment';
import type { Customer } from '@/types/customer';
import type { Service } from '@/types/service';
import type {
  Appointment,
  AppointmentItem,
  AppointmentSource,
  AppointmentStatus,
} from '@/types/appointment';

const labelClass = 'mb-1.5 block min-w-0 text-xs font-semibold text-on-surface';
const errorClass = 'mt-1 text-[11px] text-error';

const sourceOptions = [
  { label: 'Tại salon', value: 'walk_in' },
  { label: 'Điện thoại', value: 'phone' },
  { label: 'Online', value: 'online' },
];

const statusOptions = [
  { label: 'Chờ xác nhận', value: 'pending' },
  { label: 'Đã xác nhận', value: 'confirmed' },
];

const editStatusOptions = [
  ...statusOptions,
  { label: 'Đã check-in', value: 'checked_in' },
  { label: 'Đang phục vụ', value: 'in_progress' },
  { label: 'Hoàn thành', value: 'completed' },
  { label: 'Đã hủy', value: 'cancelled' },
  { label: 'Không đến', value: 'no_show' },
];

const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

type AppointmentCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có giá trị thì dialog chuyển sang chế độ cập nhật. */
  appointment?: Appointment | null;
  customerName?: string;
  customerPhone?: string;
  items?: AppointmentItem[];
};

export function AppointmentCreateDialog({
  open,
  onOpenChange,
  appointment,
  customerName: initialCustomerName,
  customerPhone: initialCustomerPhone,
  items,
}: AppointmentCreateDialogProps) {
  const isEdit = !!appointment;
  const initialStart = appointment ? new Date(appointment.start_time) : null;
  const validInitialStart =
    initialStart && !Number.isNaN(initialStart.getTime()) ? initialStart : null;

  const [customerName, setCustomerName] = useState(initialCustomerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone ?? '');
  const [lookupStatus, setLookupStatus] = useState<
    'idle' | 'checking' | 'found' | 'not_found' | 'error'
  >(initialCustomerPhone ? 'found' : 'idle');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [staffId, setStaffId] = useState(appointment?.staff_id || 'auto');
  const [date, setDate] = useState<Date | undefined>(validInitialStart ?? new Date());
  const [startTime, setStartTime] = useState(
    validInitialStart ? format(validInitialStart, 'HH:mm') : '09:00',
  );
  const [source, setSource] = useState<AppointmentSource>(appointment?.source ?? 'walk_in');
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status ?? 'confirmed');
  const [note, setNote] = useState(appointment?.note ?? '');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() =>
    (items ?? [])
      .filter((item) => item.item_type === 'service' && item.service_id)
      .map((item) => item.service_id as string),
  );
  const [serviceToAdd, setServiceToAdd] = useState('');
  const [statusTouched, setStatusTouched] = useState(false);
  const [error, setError] = useState('');

  const createAppointment = useCreateAppointment();
  const updateAppointmentMutation = useUpdateAppointment();
  const { data: servicesData, isLoading: servicesLoading } = useService({
    page: 1,
    pageSize: 100,
    status: 'active',
  });
  const { data: staffData } = useStaff({ page: 1, pageSize: 100, status: 'active' });
  const { data: generalSettings } = useGeneralSettings();
  const { data: bookingSettings } = useBookingSettings();
  const workingHours = generalSettings?.working_hours;
  const selectedWorkingDay = useMemo(
    () => (date ? workingDayFor(date, workingHours) : undefined),
    [date, workingHours],
  );
  const effectiveStatus: AppointmentStatus =
    !isEdit && !statusTouched && bookingSettings
      ? bookingSettings.auto_confirm
        ? 'confirmed'
        : 'pending'
      : status;

  const services = useMemo(
    () => (servicesData?.data ?? []).filter((service) => service.is_active),
    [servicesData],
  );
  const staffs = useMemo(
    () => (staffData?.data ?? []).filter((staff) => staff.status === 'active'),
    [staffData],
  );

  const selectedServices = useMemo(
    () =>
      selectedServiceIds.map((id) => {
        const matched = services.find((service) => service.id === id);
        if (matched) return matched;
        const item = (items ?? []).find((entry) => entry.service_id === id);
        return {
          id,
          organization_id: appointment?.organization_id ?? '',
          category_id: '',
          category_name: null,
          name: item?.service_name || 'Dịch vụ',
          description: '',
          duration_minutes: 0,
          buffer_minutes: 0,
          price: item?.unit_price ?? 0,
          is_active: true,
          sold_this_month: 0,
          revenue_this_month: 0,
          created_at: '',
          updated_at: '',
        } satisfies Service;
      }),
    [selectedServiceIds, services, items, appointment],
  );

  const serviceOptions = useMemo(
    () =>
      services
        .filter((service) => !selectedServiceIds.includes(service.id))
        .map((service) => ({
          label: `${service.name} (${service.duration_minutes}p - ${money(service.price)})`,
          value: service.id,
        })),
    [services, selectedServiceIds],
  );

  const staffOptions = useMemo(
    () => [
      { label: 'Tự động xếp thợ', value: 'auto' },
      ...staffs.map((staff) => ({ label: staff.full_name, value: staff.id })),
    ],
    [staffs],
  );

  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + service.duration_minutes,
    0,
  );
  const totalAmount = selectedServices.reduce((sum, service) => sum + service.price, 0);

  const startAt = useMemo(() => {
    if (!date || !startTime) return null;
    const [hours, minutes] = startTime.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    const value = new Date(date);
    value.setHours(hours, minutes, 0, 0);
    return value;
  }, [date, startTime]);

  const endAt = useMemo(() => {
    if (!startAt || totalDuration <= 0) return null;
    return new Date(startAt.getTime() + totalDuration * 60_000);
  }, [startAt, totalDuration]);

  const handlePhoneChange = (value: string) => {
    setCustomerPhone(value);
    setLookupStatus('idle');
    setFoundCustomer(null);
    setLookupError('');
    setCustomerName('');
    setError('');
  };

  const handleLookupCustomer = async () => {
    const target = normalizePhone(customerPhone);
    if (!target || lookupStatus === 'checking') return;
    setLookupStatus('checking');
    setLookupError('');
    setError('');
    try {
      const found = await getCustomerByPhone(target);
      setFoundCustomer(found);
      setCustomerName(found.full_name);
      setLookupStatus('found');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setFoundCustomer(null);
        setCustomerName('');
        setLookupStatus('not_found');
      } else {
        setLookupStatus('error');
        setLookupError(getApiErrorMessage(err) || 'Tra cứu khách hàng thất bại, thử lại sau.');
      }
    }
  };

  const handleNewCustomer = () => {
    setLookupStatus('not_found');
    setFoundCustomer(null);
    setLookupError('');
    setCustomerName('');
  };

  const handleResetCustomer = () => {
    setLookupStatus('idle');
    setFoundCustomer(null);
    setLookupError('');
    setCustomerName('');
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setLookupStatus('idle');
    setFoundCustomer(null);
    setLookupError('');
    setStaffId('auto');
    setDate(new Date());
    setStartTime('09:00');
    setSource('walk_in');
    setStatusTouched(false);
    setStatus(bookingSettings?.auto_confirm ? 'confirmed' : 'pending');
    setNote('');
    setSelectedServiceIds([]);
    setServiceToAdd('');
    setError('');
  };

  const handleAddService = (value: string) => {
    setServiceToAdd(value);
    const service = services.find((item) => item.id === value);
    if (service && !selectedServiceIds.includes(service.id)) {
      setSelectedServiceIds((prev) => [...prev, service.id]);
    }
    setServiceToAdd('');
  };

  const handleRemoveService = (id: string) => {
    setSelectedServiceIds((prev) => prev.filter((serviceId) => serviceId !== id));
  };

  const handleSubmit = async () => {
    const targetPhone = normalizePhone(customerPhone);
    if (!targetPhone) {
      setError('Vui lòng nhập số điện thoại khách hàng.');
      return;
    }
    const finalCustomerName = foundCustomer?.full_name ?? customerName.trim();
    if (!finalCustomerName) {
      setError(
        lookupStatus === 'idle'
          ? 'Vui lòng bấm Kiểm tra SĐT hoặc chọn Khách mới để nhập tên.'
          : 'Vui lòng nhập tên khách hàng mới.',
      );
      return;
    }
    if (selectedServices.length === 0) {
      setError('Vui lòng chọn ít nhất một dịch vụ.');
      return;
    }
    if (!startAt || !endAt || endAt <= startAt) {
      setError('Vui lòng chọn ngày và giờ hẹn hợp lệ.');
      return;
    }

    const startChanged =
      !appointment ||
      Math.abs(startAt.getTime() - new Date(appointment.start_time).getTime()) > 60_000;
    if (startChanged) {
      const bookingError = validateBookingWindow({
        start: startAt,
        end: endAt,
        workingHours,
        settings: bookingSettings,
      });
      if (bookingError) {
        setError(bookingError);
        return;
      }
    }

    setError('');
    try {
      // Form chỉ quản lý dịch vụ; giữ nguyên các item sản phẩm khi cập nhật.
      const productItems = appointment
        ? (items ?? [])
            .filter((item) => item.item_type === 'product' && item.product_id)
            .map((item) => ({
              item_type: 'product' as const,
              product_id: item.product_id as string,
              quantity: item.quantity,
              unit_price: item.unit_price,
            }))
        : [];

      const payload: CreateAppointmentPayload = {
        customer_name: finalCustomerName,
        customer_phone: targetPhone,
        staff_id: staffId === 'auto' ? undefined : staffId,
        start_time: startAt.toISOString(),
        end_time: endAt.toISOString(),
        status: effectiveStatus,
        source,
        note: note.trim() || undefined,
        items: [
          ...selectedServices.map((service) => ({
            item_type: 'service' as const,
            service_id: service.id,
            quantity: 1,
            unit_price: service.price,
          })),
          ...productItems,
        ],
      };

      if (appointment) {
        await updateAppointmentMutation.mutateAsync({ id: appointment.id, payload });
      } else {
        await createAppointment.mutateAsync(payload);
      }

      toast.add({
        title: appointment ? 'Đã cập nhật lịch hẹn' : 'Đã tạo lịch hẹn',
        description: `${finalCustomerName} • ${format(startAt, 'HH:mm dd/MM/yyyy')}`,
        type: 'success',
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : appointment
            ? 'Không thể cập nhật lịch hẹn. Vui lòng thử lại.'
            : 'Không thể tạo lịch hẹn. Vui lòng thử lại.',
      );
    }
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Cập nhật lịch hẹn' : 'Tạo lịch hẹn mới'}
      description={
        isEdit
          ? 'Chỉnh sửa thông tin khách hàng, dịch vụ và thời gian hẹn.'
          : 'Điền thông tin khách hàng, dịch vụ và thời gian hẹn.'
      }
      maxWidth="max-w-[720px]"
      footer={
        <DashDialogFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={handleSubmit}
          confirmText={isEdit ? 'Lưu thay đổi' : 'Lưu lịch hẹn'}
          loadingText="Đang lưu..."
          isLoading={isEdit ? updateAppointmentMutation.isPending : createAppointment.isPending}
        />
      }
    >
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="appointment-customer-phone" className={labelClass}>
            Số điện thoại khách hàng <span className="text-error">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <DashInput
              id="appointment-customer-phone"
              value={customerPhone}
              onChange={(event) => handlePhoneChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleLookupCustomer();
                }
              }}
              placeholder="Nhập SĐT để kiểm tra khách cũ..."
              inputMode="tel"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleLookupCustomer()}
              disabled={lookupStatus === 'checking' || !customerPhone.trim()}
              className="h-9 shrink-0 border-outline px-3 text-xs font-semibold"
            >
              {lookupStatus === 'checking' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
              Kiểm tra
            </Button>
          </div>

          {lookupStatus === 'found' && (foundCustomer || customerName) ? (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {foundCustomer?.full_name ?? customerName}
                  </p>
                  {foundCustomer && (
                    <p className="text-[11px] text-on-surface-variant">
                      Khách quen • {foundCustomer.total_visits} lượt •{' '}
                      {foundCustomer.reward_points.toLocaleString('vi-VN')} điểm
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetCustomer}
                className="shrink-0 text-xs font-semibold text-primary hover:underline"
              >
                Đổi
              </button>
            </div>
          ) : lookupStatus === 'not_found' ? (
            <div className="mt-2 space-y-2">
              <p className="text-[11px] font-medium text-warning">
                Không tìm thấy khách với SĐT {normalizePhone(customerPhone)} — nhập tên để tạo
                khách mới.
              </p>
              <div>
                <Label htmlFor="appointment-customer-name" className={labelClass}>
                  Tên khách hàng mới <span className="text-error">*</span>
                </Label>
                <DashInput
                  id="appointment-customer-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="VD: Nguyễn Thị Lan"
                  autoFocus
                />
              </div>
            </div>
          ) : lookupStatus === 'error' ? (
            <p className="mt-1 text-[11px] font-medium text-error">{lookupError}</p>
          ) : (
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[11px] text-on-surface-variant">
                Nhập SĐT để kiểm tra khách cũ.
              </span>
              <button
                type="button"
                onClick={handleNewCustomer}
                className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <UserRound className="size-3" />
                Khách mới
              </button>
            </div>
          )}
        </div>

        <div>
          <Label className={labelClass}>
            Dịch vụ yêu cầu <span className="text-error">*</span>
          </Label>
          <DashCombobox
            value={serviceToAdd}
            onValueChange={handleAddService}
            options={serviceOptions}
            placeholder={
              servicesLoading
                ? 'Đang tải dịch vụ...'
                : serviceOptions.length === 0
                  ? 'Không còn dịch vụ để chọn'
                  : 'Tìm và chọn dịch vụ phục vụ...'
            }
            emptyMessage="Không tìm thấy dịch vụ phù hợp."
            disabled={servicesLoading || serviceOptions.length === 0}
          />
          {selectedServices.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedServices.map((service) => (
                <span
                  key={service.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {service.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveService(service.id)}
                    className="rounded-sm p-0.5 transition-colors hover:text-error"
                    aria-label={`Bỏ dịch vụ ${service.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-outline bg-surface-container px-4 py-3">
          <span className="text-xs font-semibold text-on-surface-variant">Tổng tiền dịch vụ</span>
          <span className="text-base font-bold text-primary">{money(totalAmount)}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className={labelClass}>Nhân viên phụ trách</Label>
            <DashSelect value={staffId} onValueChange={setStaffId} options={staffOptions} />
          </div>
          <div>
            <Label className={labelClass}>
              Ngày hẹn <span className="text-error">*</span>
            </Label>
            <DashDatePicker value={date} onValueChange={setDate} placeholder="Chọn ngày hẹn..." />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="appointment-start-time" className={labelClass}>
              Giờ bắt đầu <span className="text-error">*</span>
            </Label>
            <DashInput
              id="appointment-start-time"
              type="time"
              step={Math.max(bookingSettings?.slot_step_minutes ?? 15, 1) * 60}
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
          <div>
            <Label className={labelClass}>Kết thúc dự kiến</Label>
            <div className="flex h-9 items-center rounded-md border border-outline bg-surface-container px-3 text-sm text-on-surface-variant">
              {endAt ? format(endAt, 'HH:mm') : '—'}
            </div>
          </div>
          <div>
            <Label className={labelClass}>Thời lượng</Label>
            <div className="flex h-9 items-center rounded-md border border-outline bg-surface-container px-3 text-sm text-on-surface-variant">
              {totalDuration > 0 ? `${totalDuration} phút` : '—'}
            </div>
          </div>
        </div>

        {workingHours && selectedWorkingDay && (
          <p className="-mt-2 text-[11px] text-on-surface-variant">
            {describeWorkingHours(workingHours, selectedWorkingDay)}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className={labelClass}>Nguồn đặt lịch</Label>
            <DashSelect
              value={source}
              onValueChange={(value) => setSource(value as AppointmentSource)}
              options={sourceOptions}
            />
          </div>
          <div>
            <Label className={labelClass}>Trạng thái</Label>
            <DashSelect
              value={effectiveStatus}
              onValueChange={(value) => {
                setStatusTouched(true);
                setStatus(value as AppointmentStatus);
              }}
              options={isEdit ? editStatusOptions : statusOptions}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="appointment-note" className={labelClass}>
            Ghi chú yêu cầu của khách
          </Label>
          <Textarea
            id="appointment-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ví dụ: Khách làm tóc cô dâu, tóc mỏng yếu cần tư vấn kỹ..."
            rows={2}
            className="text-sm"
          />
        </div>

        {error && <p className={errorClass}>{error}</p>}
      </div>
    </DashDialog>
  );
}
