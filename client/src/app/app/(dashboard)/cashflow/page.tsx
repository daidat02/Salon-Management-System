import type { Metadata } from 'next';
import { Landmark, Plus, Download } from 'lucide-react';
import PageHeading from '@/components/dashboard/PageHeading';
import CashflowStats from './components/CashflowStats';
import CashflowView from './components/CashflowView';

export const metadata: Metadata = { title: 'Thu & Chi | SALON ADMIN' };

export default function CashflowPage() {
  return (
    <div className="space-y-4">
      <PageHeading
        breadcrumbs={[
          { label: 'Trang chủ', href: '#' },
          { label: 'Thu Chi', active: true },
        ]}
        title="Thu Chi"
        badge="Sổ quỹ tiền mặt & NH"
        badgeVariant="soft"
        subtitle="Theo dõi sổ quỹ tiền mặt, ngân hàng, đối soát thu chi và chi phí vận hành salon"
        dateRange={{ label: 'Tháng này (01/10 - 31/10/2024)' }}
        actions={[
          // { label: "Sổ quỹ / Báo cáo tài chính", icon: Landmark, variant: "link", href: "#" },
          { label: 'Xuất file CSV', icon: Download, variant: 'outline' },
          { label: 'Thêm phiếu', icon: Plus, variant: 'primary' },
        ]}
      />

      <CashflowStats />
      <CashflowView />
    </div>
  );
}
