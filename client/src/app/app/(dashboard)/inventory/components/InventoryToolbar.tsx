'use client';

import DashToolbar from '@/components/dashboard/DashToolbar';
import useCategory from '@/hooks/use-category';
import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function InventoryToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const sort = searchParams.get('sort') || '';
  const categoryId = searchParams.get('category_id') || '';
  const [inputValue, setInputValue] = React.useState(search);
  const [lastSearch, setLastSearch] = React.useState(search);

  if (search !== lastSearch) {
    setLastSearch(search);
    setInputValue(search);
  }

  const { data: categoryData } = useCategory({ page: 1, pageSize: 100 });
  const categoryOptions = (categoryData?.data ?? [])
    .filter((c) => c.is_active && c.type !== 'service')
    .map((c) => ({ value: c.id, label: c.name }));

  useEffect(() => {
    if (inputValue === search) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (inputValue.trim()) params.set('search', inputValue.trim());
      else params.delete('search');
      params.delete('page');
      router.push(`?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(t);
  }, [inputValue, search, router, searchParams]);

  const handleFilterChange = (filterId: string, value: string, placeholder: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === placeholder || value.startsWith('Tất cả') || value === '')
      params.delete(filterId);
    else params.set(filterId, value);
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <DashToolbar
      searchPlaceholder="Tìm theo tên SP, SKU, vị trí kệ..."
      searchValue={inputValue}
      onSearchChange={(v) => setInputValue(v)}
      filters={[
        {
          id: 'category_id',
          placeholder: 'Tất cả danh mục',
          value: categoryId || undefined,
          widthClass: 'sm:w-48',
          options: [{ value: '', label: 'Tất cả danh mục' }, ...categoryOptions],
          onValueChange: (value) => handleFilterChange('category_id', value, 'Tất cả danh mục'),
        },
        {
          id: 'status',
          placeholder: 'Tất cả trạng thái',
          value: status || undefined,
          widthClass: 'sm:w-40',
          options: [
            { value: '', label: 'Tất cả trạng thái' },
            { value: 'active', label: 'Còn hàng an toàn' },
            { value: 'low_stock', label: 'Sắp hết hàng' },
            { value: 'out_of_stock', label: 'Hết hàng' },
          ],
          onValueChange: (value) => handleFilterChange('status', value, 'Tất cả trạng thái'),
        },
        {
          id: 'sort',
          placeholder: 'Sắp xếp: Mới nhất',
          value: sort || undefined,
          widthClass: 'sm:w-44',
          options: [
            { value: 'created_at_desc', label: 'Sắp xếp: Mới nhất' },
            { value: 'price_asc', label: 'Giá tăng dần' },
            { value: 'price_desc', label: 'Giá giảm dần' },
            { value: 'stock_asc', label: 'Tồn kho thấp nhất' },
          ],
          onValueChange: (value) => handleFilterChange('sort', value, 'Sắp xếp: Mới nhất'),
        },
      ]}
      onRefresh={() => router.refresh()}
      onReset={() => router.push('/inventory', { scroll: false })}
    />
  );
}
