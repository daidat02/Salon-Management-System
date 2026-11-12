'use client';

import { useRouter } from 'next/navigation';
import PageHeading from '@/components/dashboard/PageHeading';
import { Plus, QrCode } from 'lucide-react';

export default function CashierHeading() {
  const router = useRouter();

  return (
    <PageHeading
      breadcrumbs={[
        { label: 'Trang chủ', href: '#' },
        { label: 'Thu ngân', active: true },
      ]}
      title="Thu ngân"
      subtitle="Danh sách đơn hàng hiện tại và tạo đơn mới tại quầy"
      actions={[
        {
          label: 'Tạo đơn mới',
          icon: Plus,
          variant: 'primary',
          onClick: () => router.push('/cashier/pos'),
        },
      ]}
    />
  );
}
