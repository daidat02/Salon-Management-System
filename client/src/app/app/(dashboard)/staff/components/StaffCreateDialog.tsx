'use client';

import * as React from 'react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { useCreateStaff } from '@/hooks/staff';
import { getApiErrorMessage } from '@/services/apiClient';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import {
  StaffForm,
  emptyStaffFormValues,
  toCreateStaffPayload,
  validateStaffForm,
  type StaffFormValues,
} from './StaffForm';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function StaffCreateDialog({ open, onOpenChange, onSuccess }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = React.useState<StaffFormValues>(() => ({ ...emptyStaffFormValues }));
  const [error, setError] = React.useState<string | null>(null);
  const { mutate, isPending } = useCreateStaff();

  const resetForm = () => {
    setError(null);
    setValues({ ...emptyStaffFormValues });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateStaffForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = toCreateStaffPayload(values);
    mutate(payload, {
      onSuccess: () => {
        toast.add({
          title: 'Tạo nhân viên thành công',
          description: `Đã thêm ${payload.full_name} vào hệ thống`,
          type: 'success',
        });
        onSuccess?.();
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');
        router.push(`?${params.toString()}`);
        handleOpenChange(false);
      },
      onError: (err) => {
        const msg = getApiErrorMessage(err);
        setError(msg);
        toast.add({
          title: 'Tạo nhân viên thất bại',
          description: msg,
          type: 'error',
        });
      },
    });
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Thêm mới nhân viên"
      description="Nhập đầy đủ thông tin để lưu vào hệ thống quản lý Salon"
      maxWidth="sm:max-w-[760px]"
      footer={
        <DashDialogFooter
          onCancel={() => handleOpenChange(false)}
          onConfirm={() =>
            (document.getElementById('staff-create-form') as HTMLFormElement)?.requestSubmit()
          }
          cancelText="Hủy"
          confirmText="Lưu nhân viên"
          isLoading={isPending}
          confirmDisabled={isPending}
        />
      }
    >
      <StaffForm
        id="staff-create-form"
        value={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        error={error}
        showStatus
      />
    </DashDialog>
  );
}
