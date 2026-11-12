'use client';

import PageHeading from '@/components/dashboard/PageHeading';
import { FileDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { ProductFormDialog } from './ProductFormDialog';
import useAuth from '@/hooks/use-auth';

const ProductHeading = () => {
  const [open, setOpen] = useState(false);
  const { can } = useAuth();
  return (
    <>
      <PageHeading
        breadcrumbs={[
          { label: 'Trang chủ', href: '#' },
          { label: 'Quản lý sản phẩm', href: '#' },
          { label: 'Sản phẩm', active: true },
        ]}
        title="Sản phẩm"
        badge="18 sản phẩm"
        subtitle="Quản lý danh sách sản phẩm bán lẻ, giá bán và tồn kho tại salon"
        actions={[
          { label: 'Xuất Excel', icon: FileDown, variant: 'outline' },
          ...(can('catalog:write')
            ? [{ label: 'Thêm sản phẩm', icon: Plus, variant: 'primary' as const, onClick: () => setOpen(true) }]
            : []),
        ]}
      />
      <ProductFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default ProductHeading;
