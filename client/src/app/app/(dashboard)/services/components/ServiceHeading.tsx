'use client';

import PageHeading from '@/components/dashboard/PageHeading';
import { FileDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { ServiceFormDialog } from './ServiceFormDialog';
import useAuth from '@/hooks/use-auth';

const ServiceHeading = () => {
  const [open, setOpen] = useState(false);
  const { can } = useAuth();
  return (
    <>
      <PageHeading
        breadcrumbs={[
          { label: 'Trang chủ', href: '#' },
          { label: 'Dịch vụ', active: true },
        ]}
        title="Dịch vụ"
        badge="24 dịch vụ"
        subtitle="Quản lý danh sách dịch vụ làm đẹp, bảng giá và thời lượng phục vụ"
        actions={[
          { label: 'Xuất Excel', icon: FileDown, variant: 'outline' },
          ...(can('catalog:write')
            ? [{ label: 'Thêm dịch vụ', icon: Plus, variant: 'primary' as const, onClick: () => setOpen(true) }]
            : []),
        ]}
      />
      <ServiceFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default ServiceHeading;
