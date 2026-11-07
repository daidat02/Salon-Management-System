'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Award, CalendarDays, Download, History, User, Wallet } from 'lucide-react';
import PageHeading from '@/components/dashboard/PageHeading';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { getApiErrorMessage } from '@/services/apiClient';
import useStaffDetail from '@/hooks/use-staff-detail';
import type { Staff } from '@/types/staff';
import StaffProfileCard, { type StaffContact } from './StaffProfileCard';
import StaffGeneralTab from './StaffGeneralTab';
import StaffPayrollTab from './StaffPayrollTab';
import StaffHistoryTab from './StaffHistoryTab';
import StaffScheduleTab from './StaffScheduleTab';
import StaffRewardPenaltyTab from './StaffRewardPenaltyTab';
import { StaffRewardPenaltyCreateDialog } from './StaffRewardPenaltyCreateDialog';
import { StaffDetailTabs } from './StaffDetailTabs';

// Page chi tiết nhân viên — layout bám mẫu preview/staff-detail.html,
// màu sắc giữ đồng bộ token dashboard, dùng component có sẵn.
// Chỉ điều phối: PageHeading + thẻ hồ sơ + tabs (nội dung nằm ở các tab riêng).

function isValidDate(value?: string | null): value is string {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getFullYear() > 1;
}

function formatDate(value?: string | null): string {
  if (!isValidDate(value)) return '';
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatSeniority(value?: string | null): string {
  if (!isValidDate(value)) return '';
  const start = new Date(value);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (years === 0) return `${remaining} tháng`;
  if (remaining === 0) return `${years} năm`;
  return `${years} năm ${remaining} tháng`;
}

function toContact(staff: Staff): StaffContact {
  return {
    name: staff.full_name,
    phone: staff.phone,
    email: staff.email,
    position: staff.position,
    code: staff.code,
    hireDate: formatDate(staff.hire_date),
    seniority: formatSeniority(staff.hire_date),
  };
}

const TAB_VALUES = ['general', 'payroll', 'history', 'reward-penalty', 'schedule'] as const;

function resolveTab(value: string | null): string {
  return value && TAB_VALUES.includes(value as (typeof TAB_VALUES)[number]) ? value : 'general';
}

export default function StaffDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;
  const [tab, setTab] = React.useState(() => resolveTab(searchParams.get('tab')));
  const [override, setOverride] = React.useState<Staff | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = React.useState(
    () => searchParams.get('addLeave') === '1',
  );
  const [rewardPenaltyDialogOpen, setRewardPenaltyDialogOpen] = React.useState(false);

  const { data: staff, isLoading, isError, error } = useStaffDetail(id);
  const current = override ?? staff;

  if (isLoading && !current) {
    return (
      <div className="space-y-4">
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError || !current) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Không tải được chi tiết nhân viên: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc
          kiểm tra kết nối API.
        </div>
      </div>
    );
  }

  const profile = toContact(current);
  const working = current.status === 'active';

  return (
    <div className="space-y-4">
      <PageHeading
        backButton={{ label: 'Quay lại danh sách nhân viên', href: '/app/staff' }}
        breadcrumbs={[
          { label: 'Nhân viên', href: '/app/staff' },
          { label: 'Chi tiết nhân viên', href: `/app/staff` },
          { label: profile.name, active: true },
        ]}
        title={profile.name}
        subtitle={`${profile.position} • Mã Nhân Viên: ${current.code}`}
        actions={[
          {
            label: 'Xuất hồ sơ',
            icon: Download,
            variant: 'outline',
            onClick: () => window.print(),
          },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <StaffProfileCard profile={profile} working={working} />

        {/* Tabs chi tiết */}
        <div className="min-w-0 overflow-hidden  rounded-xl border border-outline bg-surface shadow-sm">
          <StaffDetailTabs
            value={tab}
            onValueChange={setTab}
            items={[
              { value: 'general', label: 'Thông tin chung', icon: User },
              { value: 'payroll', label: 'Bảng lương', icon: Wallet },
              { value: 'history', label: 'Lịch sử dịch vụ', icon: History },
              { value: 'reward-penalty', label: 'Lịch sử Thưởng/Phạt', icon: Award },
              { value: 'schedule', label: 'Ngày nghỉ & Ca', icon: CalendarDays },
            ]}
          />

          <div className="p-5">
            {tab === 'general' && (
              <StaffGeneralTab key={current.id} staff={current} onSave={setOverride} />
            )}
            {tab === 'payroll' && <StaffPayrollTab staff={current} />}
            {tab === 'history' && (
              <StaffHistoryTab staffId={current.id} staffName={profile.name} />
            )}
            {tab === 'reward-penalty' && (
              <StaffRewardPenaltyTab
                staffId={current.id}
                onAddRewardPenalty={() => setRewardPenaltyDialogOpen(true)}
              />
            )}
            {tab === 'schedule' && (
              <StaffScheduleTab
                staffId={current.id}
                leaveDialogOpen={leaveDialogOpen}
                onLeaveDialogOpenChange={setLeaveDialogOpen}
              />
            )}
          </div>
        </div>
      </div>

      <StaffRewardPenaltyCreateDialog
        open={rewardPenaltyDialogOpen}
        onOpenChange={setRewardPenaltyDialogOpen}
        staffId={current.id}
        onSuccess={() => setTab('reward-penalty')}
      />
    </div>
  );
}
