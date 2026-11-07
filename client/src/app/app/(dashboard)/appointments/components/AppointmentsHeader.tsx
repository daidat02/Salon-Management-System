'use client';

import { useState } from 'react';
import { CalendarPlus, FileDown } from 'lucide-react';
import PageHeading from '@/components/dashboard/PageHeading';
import { AppointmentCreateDialog } from './AppointmentCreateDialog';

export function AppointmentsHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeading
        breadcrumbs={[
          { label: 'Trang chủ', href: '#' },
          { label: 'Lịch hẹn', active: true },
        ]}
        title="Lịch hẹn"
        subtitle="Quản lý lịch hẹn, phân công kỹ thuật viên và theo dõi trạng thái phục vụ"
        actions={[
          { label: 'Xuất Excel / CSV', icon: FileDown, variant: 'outline' },
          {
            label: 'Đặt lịch mới',
            icon: CalendarPlus,
            variant: 'primary',
            onClick: () => setOpen(true),
          },
        ]}
      />
      <AppointmentCreateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
