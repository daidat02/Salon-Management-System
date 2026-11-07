'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { DashDatePicker } from '@/components/dashboard/DashDatePicker';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashOptionPills } from '@/components/dashboard/DashOptionPills';
import { DashSelect } from '@/components/dashboard/DashSelect';
import type { CreateStaffPayload } from '@/services/staff';
import type { StaffEmploymentType, StaffGender } from '@/types/staff';
import { Field, FormSection } from './StaffFormParts';

const POSITION_OPTIONS = [
  { label: 'Master Stylist', value: 'Master Stylist' },
  { label: 'Stylist', value: 'Stylist' },
  { label: 'Kỹ thuật viên', value: 'Kỹ thuật viên' },
  { label: 'Lễ tân', value: 'Lễ tân' },
  { label: 'Quản lý salon', value: 'Quản lý salon' },
];

const GENDER_OPTIONS = [
  { label: 'Nữ', value: 'female' },
  { label: 'Nam', value: 'male' },
  { label: 'Khác', value: 'other' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { label: 'Toàn thời gian', value: 'fulltime' },
  { label: 'Bán thời gian', value: 'parttime' },
];

const BANK_OPTIONS = ['Vietcombank', 'Techcombank', 'ACB', 'MB Bank'];

const BRANCH_OPTIONS = ['Lumi Spa · Quận 1', 'Lumi Spa · Quận 3'];

const STATUS_OPTIONS = [
  { label: 'Đang hoạt động', value: 'active' },
  { label: 'Tạm ngưng', value: 'inactive' },
];

export type StaffFormValues = {
  full_name: string;
  phone: string;
  email: string;
  birth_date: string;
  gender: StaffGender | '';
  address: string;
  branch: string;
  position: string;
  employment_type: StaffEmploymentType | '';
  commission_rate: string;
  base_salary: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  status: 'active' | 'inactive';
  hire_date: string;
};

export const emptyStaffFormValues: StaffFormValues = {
  full_name: '',
  phone: '',
  email: '',
  birth_date: '',
  gender: '',
  address: '',
  branch: '',
  position: '',
  employment_type: '',
  commission_rate: '',
  base_salary: '',
  bank_name: '',
  bank_account_number: '',
  bank_account_holder: '',
  status: 'active',
  hire_date: '',
};

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Chuyển YYYY-MM-DD sang Date để hiển thị trên date picker. */
function toDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function validateStaffForm(values: StaffFormValues): string | null {
  if (!values.full_name.trim() || !values.phone.trim() || !values.position) {
    return 'Vui lòng nhập họ tên, số điện thoại và vị trí';
  }

  const commission = toNumber(values.commission_rate);
  if (commission < 0 || commission > 100) {
    return 'Tỷ lệ hoa hồng phải nằm trong khoảng từ 0 đến 100';
  }

  if (toNumber(values.base_salary) < 0) {
    return 'Lương cơ bản không được âm';
  }

  return null;
}

export function toCreateStaffPayload(values: StaffFormValues): CreateStaffPayload {
  return {
    full_name: values.full_name.trim(),
    phone: values.phone.trim().replace(/\s+/g, ''),
    email: values.email.trim(),
    birth_date: values.birth_date || null,
    gender: values.gender,
    address: values.address.trim(),
    position: values.position,
    employment_type: values.employment_type,
    commission_rate: toNumber(values.commission_rate),
    base_salary: toNumber(values.base_salary),
    bank_name: values.bank_name,
    bank_account_number: values.bank_account_number.trim(),
    bank_account_holder: values.bank_account_holder.trim().toUpperCase(),
    status: values.status,
    hire_date: values.hire_date || new Date().toISOString().slice(0, 10),
  };
}

type StaffFormProps = {
  id?: string;
  value: StaffFormValues;
  onChange: (value: StaffFormValues) => void;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  error?: string | null;
  showBranch?: boolean;
  showStatus?: boolean;
  footer?: React.ReactNode;
  className?: string;
};

export function StaffForm({
  id,
  value,
  onChange,
  onSubmit,
  error,
  showBranch = false,
  showStatus = false,
  footer,
  className,
}: StaffFormProps) {
  const setField = <K extends keyof StaffFormValues>(key: K, next: StaffFormValues[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <form id={id} onSubmit={onSubmit} className={className ?? 'space-y-6 text-xs'}>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

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
            <DashInput
              name="full_name"
              value={value.full_name}
              placeholder="Ví dụ: Nguyễn Anh Tuấn"
              onChange={(e) => setField('full_name', e.target.value)}
            />
          </Field>
          <Field label="Email">
            <DashInput
              name="email"
              type="email"
              value={value.email}
              placeholder="nhanvien@salon.vn"
              onChange={(e) => setField('email', e.target.value)}
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
              name="phone"
              value={value.phone}
              placeholder="0901 234 567"
              onChange={(e) => setField('phone', e.target.value)}
            />
          </Field>
          <Field label="Ngày sinh">
            <DashDatePicker
              value={toDateValue(value.birth_date)}
              onValueChange={(date) =>
                setField('birth_date', date ? format(date, 'yyyy-MM-dd') : '')
              }
              placeholder="Chọn ngày sinh"
              disableFuture
            />
          </Field>
          <Field label="Giới tính">
            <DashOptionPills
              options={GENDER_OPTIONS}
              value={value.gender}
              onChange={(next) => setField('gender', next as StaffGender)}
            />
          </Field>
          <Field label="Địa chỉ">
            <DashInput
              name="address"
              value={value.address}
              placeholder="Số nhà, đường, phường, quận, tỉnh/thành phố"
              onChange={(e) => setField('address', e.target.value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Thông tin công việc" subtitle="Vai trò, chi nhánh và hình thức làm việc.">
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <Field
            label={
              <>
                Vị trí <span className="text-error">*</span>
              </>
            }
          >
            <DashSelect
              placeholder="Chọn vị trí"
              value={value.position}
              onValueChange={(next) => setField('position', next)}
              options={POSITION_OPTIONS}
            />
          </Field>
          {showBranch && (
            <Field label="Chi nhánh">
              <DashSelect
                value={value.branch}
                onValueChange={(next) => setField('branch', next)}
                options={BRANCH_OPTIONS}
              />
            </Field>
          )}
          <Field label="Ngày bắt đầu làm việc">
            <DashDatePicker
              value={toDateValue(value.hire_date)}
              onValueChange={(date) =>
                setField('hire_date', date ? format(date, 'yyyy-MM-dd') : '')
              }
              placeholder="Chọn ngày bắt đầu"
            />
          </Field>
          <Field label="Hình thức làm việc">
            <DashOptionPills
              options={EMPLOYMENT_TYPE_OPTIONS}
              value={value.employment_type}
              onChange={(next) => setField('employment_type', next as StaffEmploymentType)}
            />
          </Field>
          {showStatus && (
            <Field label="Trạng thái">
              <DashOptionPills
                options={STATUS_OPTIONS}
                value={value.status}
                onChange={(next) => setField('status', next as StaffFormValues['status'])}
              />
            </Field>
          )}
        </div>
      </FormSection>

      <FormSection
        title="Lương & hoa hồng"
        subtitle="Cấu hình áp dụng cho các chu kỳ lương tiếp theo."
        badge="Mặc định"
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Lương cơ bản / tháng">
            <span className="flex items-center gap-1.5">
              <DashInput
                name="base_salary"
                type="number"
                min={0}
                step={100000}
                value={value.base_salary}
                placeholder="Ví dụ: 8000000"
                onChange={(e) => setField('base_salary', e.target.value)}
              />
              <span className="text-xs font-semibold text-on-surface-variant">₫</span>
            </span>
          </Field>
          <Field label="Hoa hồng">
            <span className="flex items-center gap-1.5">
              <DashInput
                name="commission_rate"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={value.commission_rate}
                placeholder="Ví dụ: 10"
                onChange={(e) => setField('commission_rate', e.target.value)}
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
              placeholder="Chọn ngân hàng"
              value={value.bank_name}
              onValueChange={(next) => setField('bank_name', next)}
              options={BANK_OPTIONS}
            />
          </Field>
          <Field label="Số tài khoản">
            <DashInput
              name="bank_account_number"
              value={value.bank_account_number}
              placeholder="Ví dụ: 0071008821"
              onChange={(e) => setField('bank_account_number', e.target.value)}
            />
          </Field>
          <Field label="Tên chủ tài khoản">
            <DashInput
              name="bank_account_holder"
              value={value.bank_account_holder}
              placeholder="NGUYEN VAN A"
              onChange={(e) => setField('bank_account_holder', e.target.value)}
            />
          </Field>
        </div>
      </FormSection>

      {footer && <div className="border-t border-outline pt-4">{footer}</div>}
    </form>
  );
}
