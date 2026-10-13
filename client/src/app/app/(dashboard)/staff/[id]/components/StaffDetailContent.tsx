'use client';

import * as React from 'react';
import { CalendarDays, Download, History, User, Wallet } from 'lucide-react';
import PageHeading from '@/components/dashboard/PageHeading';
import DashTabs from '@/components/dashboard/DashTabs';
import StaffProfileCard, { type StaffContact } from './StaffProfileCard';
import StaffGeneralTab from './StaffGeneralTab';
import StaffPayrollTab from './StaffPayrollTab';
import StaffHistoryTab from './StaffHistoryTab';
import StaffScheduleTab from './StaffScheduleTab';
import { mockHistory, mockStaffProfile } from './mock';

// Page chi tiết nhân viên — layout bám mẫu preview/staff-detail.html,
// màu sắc giữ đồng bộ token dashboard, dùng component có sẵn.
// Chỉ điều phối: PageHeading + thẻ hồ sơ + tabs (nội dung nằm ở các tab riêng).

export default function StaffDetailContent() {
  const [tab, setTab] = React.useState('general');
  const [working] = React.useState(true);

  // Hồ sơ hiển thị trên PageHeading + thẻ trái (Lưu ở tab Thông tin chung sẽ cập nhật).
  const [profile, setProfile] = React.useState<StaffContact>({
    name: mockStaffProfile.name,
    phone: mockStaffProfile.phone,
    email: mockStaffProfile.email,
    position: mockStaffProfile.position,
    branch: mockStaffProfile.branch,
  });

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
        subtitle={`${profile.position} • Mã Nhân Viên: ${mockStaffProfile.code} `}
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
          <div className="border-b border-outline bg-white">
            <DashTabs
              value={tab}
              onValueChange={setTab}
              className="py-1"
              items={[
                { value: 'general', label: 'Thông tin chung', icon: User },
                { value: 'payroll', label: 'Bảng lương', icon: Wallet },
                {
                  value: 'history',
                  label: (
                    <span className="flex items-center gap-1.5">
                      Lịch sử dịch vụ
                      <span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant">
                        {mockHistory.length}
                      </span>
                    </span>
                  ),
                  icon: History,
                },
                { value: 'schedule', label: 'Ngày nghỉ & Ca', icon: CalendarDays },
              ]}
            />
          </div>

          <div className="p-5">
            {tab === 'general' && <StaffGeneralTab profile={profile} onSave={setProfile} />}
            {tab === 'payroll' && <StaffPayrollTab />}
            {tab === 'history' && <StaffHistoryTab staffName={profile.name} />}
            {tab === 'schedule' && <StaffScheduleTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
