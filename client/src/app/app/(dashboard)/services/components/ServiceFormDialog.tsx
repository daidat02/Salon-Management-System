'use client';

import * as React from 'react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { useCreateService, useUpdateService } from '@/hooks/service';
import { useCategory } from '@/hooks/category';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/components/ui/toast';
import type { Service } from '@/types/service';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Truyền vào để chuyển sang chế độ cập nhật; bỏ trống để tạo mới. */
  service?: Service | null;
  onSuccess?: () => void;
};

export function ServiceFormDialog({ open, onOpenChange, service, onSuccess }: Props) {
  const formId = React.useId();
  const isEdit = !!service?.id;
  const [isActive, setIsActive] = React.useState(true);
  const [categoryId, setCategoryId] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [syncedKey, setSyncedKey] = React.useState<string | null>(null);

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: categoryData } = useCategory({ page: 1, pageSize: 100 });
  const categoryOptions = (categoryData?.data ?? [])
    .filter((c) => c.type === 'service')
    .map((c) => ({ value: c.id, label: c.name }));

  const formKey = open ? (service?.id ?? 'new') : null;
  if (open && formKey !== syncedKey) {
    setSyncedKey(formKey);
    setIsActive(service?.is_active ?? true);
    setCategoryId(service?.category_id ?? '');
    setError(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    const payload = {
      category_id: categoryId || null,
      name: data.name?.trim(),
      description: data.description?.trim() || '',
      duration_minutes: Number(data.duration_minutes || 0),
      buffer_minutes: Number(data.buffer_minutes || 0),
      price: Number(data.price || 0),
      is_active: isActive,
    };

    if (!payload.name || !payload.duration_minutes || !payload.price) {
      setError('Vui lòng nhập tên, thời lượng và giá');
      return;
    }

    const onSuccessHandler = () => {
      toast.add({
        title: isEdit ? 'Cập nhật dịch vụ thành công' : 'Tạo dịch vụ thành công',
        description: isEdit ? `Đã cập nhật ${payload.name}` : `Đã thêm ${payload.name}`,
        type: 'success',
      });
      onSuccess?.();
      onOpenChange(false);
    };
    const onErrorHandler = (err: unknown) => {
      const msg = getApiErrorMessage(err);
      setError(msg);
      toast.add({
        title: isEdit ? 'Cập nhật dịch vụ thất bại' : 'Tạo dịch vụ thất bại',
        description: msg,
        type: 'error',
      });
    };

    if (isEdit) {
      updateMutation.mutate(
        { id: service!.id, payload },
        { onSuccess: onSuccessHandler, onError: onErrorHandler },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: onSuccessHandler, onError: onErrorHandler });
    }
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Cập nhật dịch vụ' : 'Thêm mới dịch vụ'}
      description={
        isEdit
          ? 'Chỉnh sửa thông tin dịch vụ, bảng giá và thời lượng'
          : 'Nhập thông tin dịch vụ để quản lý bảng giá và thời lượng'
      }
      footer={
        <DashDialogFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={() => (document.getElementById(formId) as HTMLFormElement)?.requestSubmit()}
          cancelText="Hủy"
          confirmText={isEdit ? 'Lưu thay đổi' : 'Lưu dịch vụ'}
          isLoading={isPending}
          confirmDisabled={isPending}
        />
      }
    >
      <form
        key={formKey ?? 'closed'}
        id={formId}
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Tên dịch vụ <span className="text-error">*</span>
            </Label>
            <DashInput
              name="name"
              placeholder="VD: Cắt tóc nam cao cấp"
              defaultValue={service?.name ?? ''}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">Mô tả</Label>
            <Textarea
              name="description"
              placeholder="Mô tả chi tiết dịch vụ..."
              defaultValue={service?.description ?? ''}
              rows={2}
              className="bg-surface border-outline focus-visible:border-primary"
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Thời lượng (phút) <span className="text-error">*</span>
            </Label>
            <DashInput
              name="duration_minutes"
              type="number"
              placeholder="45"
              defaultValue={service?.duration_minutes ?? ''}
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Thời gian đệm (phút)
            </Label>
            <DashInput
              name="buffer_minutes"
              type="number"
              placeholder="10"
              defaultValue={service?.buffer_minutes ?? ''}
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Giá (đ) <span className="text-error">*</span>
            </Label>
            <DashInput
              name="price"
              type="number"
              placeholder="150000"
              defaultValue={service?.price ?? ''}
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">Danh mục</Label>
            <DashSelect
              placeholder="Chọn danh mục"
              value={categoryId || null}
              onValueChange={setCategoryId}
              options={categoryOptions}
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-outline bg-surface-container-low px-3 py-2">
          <div>
            <p className="text-xs font-semibold text-on-surface">Đang hoạt động</p>
            <p className="text-[11px] text-on-surface-variant">Tắt nếu tạm ngưng dịch vụ</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </form>
    </DashDialog>
  );
}
