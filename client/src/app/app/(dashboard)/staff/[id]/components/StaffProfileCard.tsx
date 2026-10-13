'use client';

import { Download, Mail, Phone, Store } from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import { Button } from '@/components/ui/button';
import { mockMonthStats, mockStaffProfile } from './mock';

// Thẻ hồ sơ cá nhân cột trái (theo mẫu staff-detail.html).

export type StaffContact = {
  name: string;
  phone: string;
  email: string;
  position: string;
  branch: string;
};

type StaffProfileCardProps = {
  profile: StaffContact;
  working: boolean;
};

export default function StaffProfileCard({ profile, working }: StaffProfileCardProps) {
  return (
    <aside className="overflow-hidden rounded-xl border border-outline bg-surface shadow-sm">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {mockStaffProfile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mockStaffProfile.avatarUrl}
                alt={`Ảnh hồ sơ nhân viên ${profile.name}`}
                className="h-20 w-20 rounded-2xl border border-outline bg-white object-cover shadow-sm"
              />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-2xl border border-outline bg-primary-container text-xl font-bold text-primary shadow-sm">
                {profile.name
                  .split(' ')
                  .filter(Boolean)
                  .slice(-2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-on-surface">{profile.name}</h2>
            <div className="mt-1.5">
              <Tag
                variant={working ? 'success' : 'warning'}
                shape="pill"
                size="md"
                dot
                className="font-bold"
              >
                {working ? 'ĐANG LÀM VIỆC' : 'NGHỈ PHÉP'}
              </Tag>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Tag variant="blue" shape="rounded" size="md">
            {profile.position}
          </Tag>
          <Tag variant="purple" shape="rounded" size="md" className="font-semibold">
            {mockStaffProfile.level}
          </Tag>
          <span className="text-[11px] text-on-surface-variant">
            Mã nhân viên:{' '}
            <span className="font-mono font-semibold text-on-surface">
              {mockStaffProfile.code}
            </span>
          </span>
        </div>

        <ul className="mt-3 space-y-1.5 border-t border-outline pt-3 text-xs text-on-surface-variant">
          <li className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-medium text-on-surface">{profile.phone}</span>
          </li>
          <li className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate font-medium text-on-surface">{profile.email}</span>
          </li>
          <li className="flex items-center gap-2">
            <Store className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{profile.branch}</span>
          </li>
        </ul>

        <dl className="mt-3 space-y-2 border-t border-outline pt-3 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-on-surface-variant">Ngày gia nhập</dt>
            <dd className="font-semibold">{mockStaffProfile.hireDate}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-on-surface-variant">Thâm niên</dt>
            <dd className="font-semibold">{mockStaffProfile.seniority}</dd>
          </div>
        </dl>

        <div className="mt-3 border-t border-outline pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
            Hiệu suất tháng này
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-surface-container-low p-2.5">
              <p className="text-lg font-bold leading-none">{mockMonthStats.completed}</p>
              <p className="mt-1 text-[10px] leading-tight text-on-surface-variant">
                Lịch hẹn hoàn thành
              </p>
            </div>
            <div className="rounded-lg bg-surface-container-low p-2.5">
              <p className="text-lg font-bold leading-none">{mockMonthStats.rating}</p>
              <p className="mt-1 text-[10px] leading-tight text-on-surface-variant">
                Đánh giá trung bình
              </p>
            </div>
            <div className="col-span-2 rounded-lg bg-surface-container-low p-2.5">
              <p className="text-[10px] text-on-surface-variant">Doanh thu dịch vụ</p>
              <p className="mt-0.5 text-sm font-bold">{mockMonthStats.revenue}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${mockMonthStats.targetPercent}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-on-surface-variant">
                {mockMonthStats.targetPercent}% mục tiêu tháng
              </p>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => window.print()}>
          <Download className="h-4 w-4" />
          <span>Xuất hồ sơ</span>
        </Button>
        <p className="mt-2.5 text-center text-[10px] leading-relaxed text-on-surface-variant">
          Thông tin nhân viên được bảo mật. Chỉ quản lý có quyền chỉnh sửa hồ sơ.
        </p>
      </div>
    </aside>
  );
}
