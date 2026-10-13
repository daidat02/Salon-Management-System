'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { Field, FormSection, RadioPills } from './StaffFormParts';
import type { StaffContact } from './StaffProfileCard';
import {
  BANK_OPTIONS,
  BRANCH_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  ROLE_OPTIONS,
  mockPersonalForm,
  mockSalaryConfig,
} from './mock';

// Tab Thông tin chung: form cá nhân / công việc / lương / thanh toán.
// Lưu sẽ đẩy hồ sơ rút gọn lên page qua onSave.

type StaffGeneralTabProps = {
  profile: StaffContact;
  onSave: (profile: StaffContact) => void;
};

export default function StaffGeneralTab({ profile, onSave }: StaffGeneralTabProps) {
  const [draft, setDraft] = React.useState({ ...mockPersonalForm });
  const [salaryDraft, setSalaryDraft] = React.useState({
    base: mockSalaryConfig.base,
    serviceRate: mockSalaryConfig.serviceRate,
    productRate: mockSalaryConfig.productRate,
    bank: mockSalaryConfig.bank,
    account: mockSalaryConfig.account,
    holder: mockSalaryConfig.holder,
  });
  const setDraftField = (k: keyof typeof draft) => (v: string) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    onSave({
      name: draft.name,
      phone: draft.phone,
      email: draft.email,
      position: draft.role,
      branch: draft.branch,
    });
  };
  const handleCancel = () => {
    setDraft({
      ...mockPersonalForm,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      role: profile.position,
      branch: profile.branch,
    });
    setSalaryDraft({
      base: mockSalaryConfig.base,
      serviceRate: mockSalaryConfig.serviceRate,
      productRate: mockSalaryConfig.productRate,
      bank: mockSalaryConfig.bank,
      account: mockSalaryConfig.account,
      holder: mockSalaryConfig.holder,
    });
  };

  return (
    <div className="space-y-6">
      <FormSection
        title="Thông tin cá nhân"
        subtitle="Thông tin liên hệ và hồ sơ cơ bản của nhân viên."
      >
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <Field
            label={
              <>
                Họ và tên <span className="text-error">*</span>
              </>
            }
          >
            <DashInput value={draft.name} onChange={(e) => setDraftField('name')(e.target.value)} />
          </Field>
          <Field
            label={
              <>
                Email <span className="text-error">*</span>
              </>
            }
          >
            <DashInput
              value={draft.email}
              onChange={(e) => setDraftField('email')(e.target.value)}
            />
          </Field>
          <Field
            label={
              <>
                Số điện thoại <span className="text-error">*</span>
              </>
            }
          >
            <DashInput
              value={draft.phone}
              onChange={(e) => setDraftField('phone')(e.target.value)}
            />
          </Field>
          <Field label="Ngày sinh">
            <DashInput
              type="date"
              value={draft.dob}
              onChange={(e) => setDraftField('dob')(e.target.value)}
            />
          </Field>
          <Field label="Giới tính">
            <RadioPills
              options={GENDER_OPTIONS}
              value={draft.gender}
              onChange={setDraftField('gender')}
            />
          </Field>
          <Field label="Địa chỉ">
            <DashInput
              value={draft.address}
              onChange={(e) => setDraftField('address')(e.target.value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Thông tin công việc" subtitle="Vai trò, chi nhánh và hình thức làm việc.">
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <Field label="Vai trò">
            <RadioPills options={ROLE_OPTIONS} value={draft.role} onChange={setDraftField('role')} />
          </Field>
          <Field label="Chi nhánh">
            <DashSelect
              value={draft.branch}
              onValueChange={setDraftField('branch')}
              options={BRANCH_OPTIONS}
            />
          </Field>
          <Field label="Ngày bắt đầu làm việc">
            <DashInput
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraftField('startDate')(e.target.value)}
            />
          </Field>
          <Field label="Hình thức làm việc">
            <RadioPills
              options={EMPLOYMENT_TYPE_OPTIONS}
              value={draft.employmentType}
              onChange={setDraftField('employmentType')}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Lương & hoa hồng"
        subtitle="Cấu hình áp dụng cho các chu kỳ lương tiếp theo."
        badge="Mặc định"
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Field label="Lương cơ bản / tháng">
            <span className="flex items-center gap-1.5">
              <DashInput
                type="number"
                min={0}
                value={salaryDraft.base}
                onChange={(e) =>
                  setSalaryDraft((p) => ({ ...p, base: Number(e.target.value) }))
                }
              />
              <span className="text-xs font-semibold text-on-surface-variant">₫</span>
            </span>
          </Field>
          <Field label="Hoa hồng dịch vụ">
            <span className="flex items-center gap-1.5">
              <DashInput
                type="number"
                min={0}
                max={100}
                value={salaryDraft.serviceRate}
                onChange={(e) =>
                  setSalaryDraft((p) => ({ ...p, serviceRate: Number(e.target.value) }))
                }
              />
              <span className="text-xs font-semibold text-on-surface-variant">%</span>
            </span>
          </Field>
          <Field label="Hoa hồng sản phẩm">
            <span className="flex items-center gap-1.5">
              <DashInput
                type="number"
                min={0}
                max={100}
                value={salaryDraft.productRate}
                onChange={(e) =>
                  setSalaryDraft((p) => ({ ...p, productRate: Number(e.target.value) }))
                }
              />
              <span className="text-xs font-semibold text-on-surface-variant">%</span>
            </span>
          </Field>
        </div>
        <p className="mt-2 text-[11px] text-on-surface-variant">
          Hoa hồng được tính trên giá trị dịch vụ và sản phẩm do nhân viên thực hiện.
        </p>
      </FormSection>

      <FormSection
        title="Thông tin thanh toán"
        subtitle="Tài khoản ngân hàng nhận lương của nhân viên."
      >
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          <Field label="Ngân hàng">
            <DashSelect
              value={salaryDraft.bank}
              onValueChange={(v) => setSalaryDraft((p) => ({ ...p, bank: v }))}
              options={BANK_OPTIONS}
            />
          </Field>
          <Field label="Số tài khoản">
            <DashInput
              value={salaryDraft.account}
              onChange={(e) => setSalaryDraft((p) => ({ ...p, account: e.target.value }))}
            />
          </Field>
          <Field label="Tên chủ tài khoản">
            <DashInput
              value={salaryDraft.holder}
              onChange={(e) => setSalaryDraft((p) => ({ ...p, holder: e.target.value }))}
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline pt-4">
        <span className="text-[11px] text-on-surface-variant">Cập nhật lần cuối: 12/10/2026</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Hủy thay đổi
          </Button>
          <Button size="sm" onClick={handleSave}>
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}
