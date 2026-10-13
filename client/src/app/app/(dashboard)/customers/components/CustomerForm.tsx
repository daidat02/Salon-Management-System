'use client';

import * as React from 'react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { useCreateCustomer } from '@/hooks/use-create-customer';
import { useUpdateCustomer } from '@/hooks/use-update-customer';
import { getApiErrorMessage } from '@/services/apiClient';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toast';

export type CustomerFormInitialData = {
  id: string;
  full_name: string;
  phone: string;
  gender?: string | null;
  birth_date?: string | null;
  note?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** create: thêm mới · edit: cập nhật (cần initialData). */
  mode?: 'create' | 'edit';
  initialData?: CustomerFormInitialData | null;
};

/** Lấy YYYY-MM-DD từ chuỗi ISO để điền input date. */
function toDateInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mo}-${dd}`;
}

export function CustomerForm({ open, onOpenChange, onSuccess, mode = 'create', initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = mode === 'edit';
  const [gender, setGender] = React.useState('female');
  const [error, setError] = React.useState<string | null>(null);
  const { mutate: createMutate, isPending: isCreating } = useCreateCustomer();
  const { mutate: updateMutate, isPending: isUpdating } = useUpdateCustomer();
  const isPending = isCreating || isUpdating;

  React.useEffect(() => {
    if (open) {
      setError(null);
      setGender(initialData?.gender || 'female');
    }
  }, [open, initialData?.gender, initialData?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const payload = {
      full_name: data.full_name?.trim(),
      phone: data.phone?.trim().replace(/\s+/g, ''),
      gender,
      birth_date: data.birth_date || null,
      note: data.note?.trim() || '',
    } as const;
    if (!payload.full_name || !payload.phone) {
      setError('Vui lòng nhập họ tên và số điện thoại');
      return;
    }
    const done = (name: string, verb: string) => {
      toast.add({
        title: `${verb} khách hàng thành công`,
        description: `Đã ${verb.toLowerCase()} ${name} ${isEdit ? 'trong' : 'vào'} hệ thống`,
        type: 'success',
      });
      onSuccess?.();
      if (!isEdit) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');
        router.push(`?${params.toString()}`);
      }
      onOpenChange(false);
      form.reset();
      setGender('female');
    };
    const failed = (verb: string) => (err: unknown) => {
      const msg = getApiErrorMessage(err);
      setError(msg);
      toast.add({ title: `${verb} khách hàng thất bại`, description: msg, type: 'error' });
    };
    if (isEdit) {
      if (!initialData?.id) {
        setError('Thiếu id khách hàng cần cập nhật');
        return;
      }
      updateMutate(
        { id: initialData.id, payload: payload as any },
        { onSuccess: () => done(payload.full_name, 'Cập nhật'), onError: failed('Cập nhật') },
      );
    } else {
      createMutate(payload as any, {
        onSuccess: () => done(payload.full_name, 'Tạo'),
        onError: failed('Tạo'),
      });
    }
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Cập nhật khách hàng' : 'Thêm mới khách hàng'}
      description={
        isEdit
          ? 'Chỉnh sửa thông tin và lưu lại vào hệ thống quản lý Salon'
          : 'Nhập đầy đủ thông tin để lưu vào hệ thống quản lý Salon'
      }
      footer={
        <DashDialogFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={() =>
            (document.getElementById('customer-form') as HTMLFormElement)?.requestSubmit()
          }
          cancelText="Hủy"
          confirmText={isEdit ? 'Lưu thay đổi' : 'Lưu khách hàng'}
          isLoading={isPending}
          confirmDisabled={isPending}
        />
      }
    >
      <form
        key={isEdit ? (initialData?.id ?? 'edit') : 'create'}
        id="customer-form"
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="block font-semibold text-slate-700 mb-1">
              Họ và tên <span className="text-error">*</span>
            </Label>
            <DashInput
              name="full_name"
              placeholder="Ví dụ: Nguyễn Thị Mai"
              required
              defaultValue={initialData?.full_name ?? ''}
            />
          </div>
          <div>
            <Label className="block font-semibold text-slate-700 mb-1">
              Số điện thoại <span className="text-error">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-slate-500 text-xs">
                +84
              </span>
              <DashInput
                name="phone"
                placeholder="0901 234 567"
                required
                className="pl-12"
                defaultValue={initialData?.phone ?? ''}
              />
            </div>
          </div>
          <div>
            <Label className="block font-semibold text-slate-700 mb-1">Email</Label>
            <DashInput name="email" type="email" placeholder="khachhang@example.com" />
          </div>
          <div>
            <Label className="block font-semibold text-slate-700 mb-1">Ngày sinh</Label>
            <DashInput
              name="birth_date"
              type="date"
              className="text-slate-600"
              defaultValue={toDateInput(initialData?.birth_date)}
            />
          </div>
          <div>
            <Label className="block font-semibold text-slate-700 mb-2">Giới tính</Label>
            <div className="flex h-9 items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === 'female'}
                  onChange={() => setGender('female')}
                  className="text-primary focus:ring-primary"
                />
                <span>Nữ</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={gender === 'male'}
                  onChange={() => setGender('male')}
                  className="text-primary focus:ring-primary"
                />
                <span>Nam</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="other"
                  checked={gender === 'other'}
                  onChange={() => setGender('other')}
                  className="text-primary focus:ring-primary"
                />
                <span>Khác</span>
              </label>
            </div>
          </div>
          <div>
            <Label className="block font-semibold text-slate-700 mb-1">Nhóm / Phân hạng</Label>
            <DashSelect
              placeholder="Chọn nhóm"
              defaultValue="new"
              options={[
                { label: 'Khách hàng mới (Mặc định)', value: 'new' },
                { label: 'Thành viên thân thiết', value: 'loyal' },
                { label: 'Khách hàng VIP Hạng Bạc', value: 'vip_silver' },
                { label: 'Khách hàng VIP Hạng Vàng', value: 'vip_gold' },
              ]}
            />
          </div>
        </div>
        <div>
          <Label className="block font-semibold text-slate-700 mb-1">Địa chỉ liên hệ</Label>
          <DashInput name="address" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố" />
        </div>
        <div>
          <Label className="block font-semibold text-slate-700 mb-1">
            Ghi chú sở thích & Lưu ý dịch vụ
          </Label>
          <Textarea
            name="note"
            placeholder="Đặc điểm chất tóc, da đầu nhạy cảm, màu nhuộm yêu thích, thức uống ưa thích..."
            rows={3}
            className="bg-surface border-outline focus-visible:border-primary"
            defaultValue={initialData?.note ?? ''}
          />
        </div>
      </form>
    </DashDialog>
  );
}
