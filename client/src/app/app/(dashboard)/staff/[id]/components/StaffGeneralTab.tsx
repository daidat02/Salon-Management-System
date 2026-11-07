'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { Staff, StaffEmploymentType, StaffGender } from '@/types/staff';
import { getApiErrorMessage } from '@/services/apiClient';
import useUpdateStaff from '@/hooks/use-update-staff';
import {
  StaffForm,
  emptyStaffFormValues,
  validateStaffForm,
  type StaffFormValues,
} from '../../components/StaffForm';
import { mockStaffProfile } from './mock';

type StaffGeneralTabProps = {
  staff: Staff;
  onSave: (staff: Staff) => void;
};

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildInitialValues(staff: Staff): StaffFormValues {
  return {
    ...emptyStaffFormValues,
    full_name: staff.full_name,
    phone: staff.phone,
    email: staff.email,
    birth_date: toDateInput(staff.birth_date),
    gender: staff.gender as StaffGender,
    address: staff.address,
    branch: mockStaffProfile.branch,
    position: staff.position,
    employment_type: staff.employment_type as StaffEmploymentType,
    commission_rate: String(staff.commission_rate),
    base_salary: String(staff.base_salary),
    bank_name: staff.bank_name,
    bank_account_number: staff.bank_account_number,
    bank_account_holder: staff.bank_account_holder,
    status: staff.status,
    hire_date: toDateInput(staff.hire_date),
  };
}

export default function StaffGeneralTab({ staff, onSave }: StaffGeneralTabProps) {
  const [draft, setDraft] = React.useState<StaffFormValues>(() => buildInitialValues(staff));
  const [error, setError] = React.useState<string | null>(null);
  const { mutateAsync, isPending } = useUpdateStaff(staff.id);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validateStaffForm(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const updated = await mutateAsync({
        code: staff.code,
        full_name: draft.full_name.trim(),
        phone: draft.phone.trim().replace(/\s+/g, ''),
        email: draft.email.trim(),
        birth_date: draft.birth_date || null,
        gender: draft.gender,
        address: draft.address.trim(),
        position: draft.position,
        employment_type: draft.employment_type,
        commission_rate: toNumber(draft.commission_rate),
        base_salary: toNumber(draft.base_salary),
        bank_name: draft.bank_name,
        bank_account_number: draft.bank_account_number.trim(),
        bank_account_holder: draft.bank_account_holder.trim().toUpperCase(),
        status: draft.status,
        hire_date: draft.hire_date || null,
      });
      setDraft(buildInitialValues(updated));
      onSave(updated);
      toast.add({
        title: 'Cập nhật nhân viên thành công',
        description: `Đã lưu thông tin của ${updated.full_name}`,
        type: 'success',
      });
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      toast.add({ title: 'Cập nhật nhân viên thất bại', description: message, type: 'error' });
    }
  };

  const handleCancel = () => {
    setDraft(buildInitialValues(staff));
    setError(null);
  };

  return (
    <StaffForm
      id="staff-general-form"
      value={draft}
      onChange={setDraft}
      onSubmit={handleSave}
      error={error}
      showBranch
      showStatus
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-on-surface-variant">
            Cập nhật lần cuối: {staff.updated_at ? toDateInput(staff.updated_at) : '—'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>
              Hủy thay đổi
            </Button>
            <Button size="sm" type="submit" disabled={isPending}>
              {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </div>
      }
    />
  );
}
