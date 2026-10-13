'use client';

import * as React from 'react';
import {
  Briefcase,
  Camera,
  Mail,
  Phone,
  Store,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { cn } from 'cn';

// Header thông tin nhân viên — port từ
// preview/admin_preview/content/components/staff-header.html
// (avatar + tên + Tag vai trò/mã/trạng thái + liên hệ + nút hành động,
//  bên dưới là khối Thông tin nhanh dạng biểu mẫu text thường).
// Chỉ dùng component có sẵn: Button (outline/default), Switch, Tag.

export type StaffHeaderStatus = 'active' | 'leave';

export type StaffHeaderData = {
  code: string;
  name: string;
  position: string;
  level?: string;
  levelProgress?: string;
  avatarUrl?: string;
  phone: string;
  email?: string;
  branch?: string;
  experience?: string;
  status: StaffHeaderStatus;
  hireDate?: string;
  contract?: string;
  manager?: string;
  skills?: string[];
  performance?: { label: string; value: string; valueClass?: string }[];
  documents?: string[];
  baseSalary?: string;
  allowance?: string;
  commService?: number;
  commProduct?: number;
};

type StaffDetailHeaderProps = {
  staff: StaffHeaderData;
  onAdvance?: () => void;
  onEdit?: () => void;
  onAvatarEdit?: () => void;
  className?: string;
};

const STATUS_META: Record<StaffHeaderStatus, { variant: 'success' | 'warning'; label: string }> = {
  active: { variant: 'success', label: 'ĐANG LÀM VIỆC' },
  leave: { variant: 'warning', label: 'NGHỈ PHÉP' },
};

function ContactItem({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {children}
    </span>
  );
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-on-surface-variant">{label}</p>
      <div className="mt-0.5 text-[13px] font-medium text-on-surface">{children}</div>
    </div>
  );
}

const DEFAULT_PERFORMANCE = [
  { label: 'KPI doanh số', value: '92%', valueClass: 'text-primary' },
  { label: 'Upsell sản phẩm', value: '78%', valueClass: 'text-emerald-600' },
  { label: 'Đúng giờ', value: '96%', valueClass: 'text-amber-600' },
];

const DEFAULT_DOCUMENTS = ['HĐLĐ_2024.pdf', 'CCCD_scan.pdf', 'Chứng chỉ nghề.jpg'];

export default function StaffDetailHeader({
  staff,
  onAdvance,
  onEdit,
  onAvatarEdit,
  className,
}: StaffDetailHeaderProps) {
  const status = STATUS_META[staff.status];
  const performance = staff.performance ?? DEFAULT_PERFORMANCE;
  const documents = staff.documents ?? DEFAULT_DOCUMENTS;
  const initials = staff.name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className={cn('rounded-xl border border-outline bg-surface p-5 shadow-sm', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative shrink-0">
            {staff.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staff.avatarUrl}
                alt={`Ảnh đại diện nhân viên ${staff.name}`}
                className="h-20 w-20 rounded-2xl border border-outline bg-white object-cover shadow-sm"
              />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-2xl border border-outline bg-primary-container text-xl font-bold text-primary shadow-sm">
                {initials}
              </span>
            )}
            <button
              type="button"
              title="Đổi avatar"
              onClick={onAvatarEdit}
              className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-on-surface text-white transition-colors hover:bg-primary"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-w-0 flex-1 pb-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-on-surface">{staff.name}</h2>
              <Tag variant="blue" shape="rounded" size="md">
                {staff.position}
              </Tag>
              {staff.level && (
                <Tag variant="purple" shape="rounded" size="md" className="font-semibold">
                  {staff.level}
                </Tag>
              )}
              <Tag variant="default" shape="rounded" size="md" className="font-mono">
                {staff.code}
              </Tag>
              <Tag variant={status.variant} shape="pill" size="md" dot className="font-bold">
                {status.label}
              </Tag>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-on-surface-variant">
              <ContactItem icon={Phone}>{staff.phone}</ContactItem>
              {staff.email && <ContactItem icon={Mail}>{staff.email}</ContactItem>}
              {staff.branch && <ContactItem icon={Store}>{staff.branch}</ContactItem>}
              {staff.experience && <ContactItem icon={Briefcase}>{staff.experience}</ContactItem>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:pb-0.5">
          <Button
            variant="outline"
            onClick={onAdvance}
            className="h-auto rounded-lg bg-surface px-3.5 py-2 text-xs font-semibold text-on-surface shadow-sm hover:bg-surface-container"
          >
            <Wallet className="h-4 w-4 text-primary" />
            <span>Tạm ứng</span>
          </Button>
          <Button
            onClick={onEdit}
            className="h-auto rounded-lg bg-on-surface px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <span>Chỉnh sửa</span>
          </Button>
        </div>
      </div>

      {/* Thông tin chi tiết — text biểu mẫu thường */}
      <div className="mt-4 border-t border-outline pt-4">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          Thông tin chi tiết
        </h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {staff.hireDate && <InfoField label="Ngày vào làm">{staff.hireDate}</InfoField>}
          {staff.contract && <InfoField label="Loại hợp đồng">{staff.contract}</InfoField>}
          {staff.branch && <InfoField label="Chi nhánh">{staff.branch}</InfoField>}
          {staff.manager && <InfoField label="Quản lý trực tiếp">{staff.manager}</InfoField>}
          {staff.skills && staff.skills.length > 0 && (
            <InfoField label="Chuyên môn">{staff.skills.join(', ')}</InfoField>
          )}
          {staff.levelProgress && <InfoField label="Mục tiêu lên level">{staff.levelProgress}</InfoField>}
          {staff.baseSalary && <InfoField label="Lương cơ bản">{staff.baseSalary} đ</InfoField>}
          {staff.commService !== undefined && <InfoField label="Hoa hồng dịch vụ">{staff.commService}%</InfoField>}
          {staff.commProduct !== undefined && <InfoField label="Hoa hồng bán sản phẩm">{staff.commProduct}%</InfoField>}
          {staff.allowance && <InfoField label="Phụ cấp">{staff.allowance} đ</InfoField>}
        </div>

        {/* Hiệu suất & Tài liệu gộp trong header */}
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-outline pt-4 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Hiệu suất tháng
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
              {performance.map((p) => (
                <span key={p.label} className="text-on-surface-variant">
                  {p.label}:{' '}
                  <strong className={`font-semibold ${p.valueClass ?? 'text-on-surface'}`}>
                    {p.value}
                  </strong>
                </span>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Tài liệu
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {documents.map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <span className="font-medium text-on-surface">{f}</span>
                  <button type="button" className="shrink-0 text-[11px] font-semibold text-primary hover:underline">
                    Tải xuống
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
