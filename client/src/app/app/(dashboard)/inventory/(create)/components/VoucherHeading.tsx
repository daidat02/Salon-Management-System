'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, Save, X } from 'lucide-react';
import PageHeading from '@/components/dashboard/PageHeading';
import { VOUCHER_META, type VoucherType } from './voucherData';

type VoucherHeadingProps = {
  type: VoucherType;
  onSaveDraft?: () => void;
  onComplete?: () => void;
};

export default function VoucherHeading({ type, onSaveDraft, onComplete }: VoucherHeadingProps) {
  const router = useRouter();
  const meta = VOUCHER_META[type];

  return (
    <div className="space-y-3">
      <PageHeading
        backButton={{ label: 'Quay lại kho hàng', href: '/app/inventory' }}
        breadcrumbs={[
          { label: 'Trang chủ', href: '#' },
          { label: 'Quản lý kho', href: '#' },
          { label: 'Nhập xuất kho', href: '/app/inventory' },
          { label: meta.breadcrumb },
        ]}
        title={meta.title}
        badge={meta.badge}
        badgeVariant="soft"
        actions={[
          { label: 'Hủy bỏ', icon: X, variant: 'outline', onClick: () => router.back() },
          { label: 'Lưu nháp', icon: Save, variant: 'outline', onClick: () => onSaveDraft?.() },
          {
            label: meta.submitLabel,
            icon: CheckCircle2,
            variant: 'primary',
            onClick: () => onComplete?.(),
          },
        ]}
      />
    </div>
  );
}
