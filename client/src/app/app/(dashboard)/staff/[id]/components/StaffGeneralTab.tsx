'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import type { StaffEmploymentType, StaffGender } from '@/types/staff';
import { StaffForm, emptyStaffFormValues, type StaffFormValues } from '../../components/StaffForm';
import type { StaffContact } from './StaffProfileCard';
import { mockPersonalForm, mockSalaryConfig } from './mock';

type StaffGeneralTabProps = {
  profile: StaffContact;
  onSave: (profile: StaffContact) => void;
};

function buildInitialValues(profile: StaffContact): StaffFormValues {
  return {
    ...emptyStaffFormValues,
    full_name: profile.name,
    phone: profile.phone,
    email: profile.email,
    birth_date: mockPersonalForm.dob,
    gender: mockPersonalForm.gender as StaffGender,
    address: mockPersonalForm.address,
    branch: profile.branch,
    position: profile.position,
    employment_type: mockPersonalForm.employmentType as StaffEmploymentType,
    commission_rate: String(mockSalaryConfig.serviceRate),
    base_salary: String(mockSalaryConfig.base),
    bank_name: mockSalaryConfig.bank,
    bank_account_number: mockSalaryConfig.account,
    bank_account_holder: mockSalaryConfig.holder,
    status: 'active',
    hire_date: mockPersonalForm.startDate,
  };
}

export default function StaffGeneralTab({ profile, onSave }: StaffGeneralTabProps) {
  const [draft, setDraft] = React.useState<StaffFormValues>(() => buildInitialValues(profile));

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      name: draft.full_name,
      phone: draft.phone,
      email: draft.email,
      position: draft.position,
      branch: draft.branch,
    });
  };

  const handleCancel = () => setDraft(buildInitialValues(profile));

  return (
    <StaffForm
      id="staff-general-form"
      value={draft}
      onChange={setDraft}
      onSubmit={handleSave}
      showBranch
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-on-surface-variant">
            Cập nhật lần cuối: 12/10/2026
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Hủy thay đổi
            </Button>
            <Button size="sm" type="submit">
              Lưu thay đổi
            </Button>
          </div>
        </div>
      }
    />
  );
}
