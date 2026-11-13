'use client';

import * as React from 'react';
import DashToolbar from '@/components/dashboard/DashToolbar';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCashFlowCategories, useFunds } from '@/hooks/cashflow';

const KIND_OPTIONS = [
  { value: '', label: 'Tất cả phiếu' },
  { value: 'income', label: 'Phiếu Thu' },
  { value: 'expense', label: 'Phiếu Chi' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const SORT_OPTIONS = [
  { value: '', label: 'Sắp xếp: Mới nhất' },
  { value: 'created_at_asc', label: 'Sắp xếp: Cũ nhất' },
  { value: 'amount_desc', label: 'Số tiền giảm dần' },
  { value: 'amount_asc', label: 'Số tiền tăng dần' },
];

export default function CashflowFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') || '';
  const kind = searchParams.get('kind') || '';
  const categoryId = searchParams.get('category_id') || '';
  const fundId = searchParams.get('fund_id') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sort_by') || '';

  const { data: categories } = useCashFlowCategories(kind || undefined);
  const { data: funds } = useFunds(true);

  const [inputValue, setInputValue] = React.useState(search);
  const [prevSearch, setPrevSearch] = React.useState(search);

  // Đồng bộ lại ô tìm kiếm khi URL thay đổi (reset/back) mà không dùng effect.
  if (search !== prevSearch) {
    setPrevSearch(search);
    setInputValue(search);
  }

  React.useEffect(() => {
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

  const pushParams = (params: URLSearchParams) => {
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(filterId);
    else params.set(filterId, value);
    pushParams(params);
  };

  const handleKindChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('kind', value);
    else params.delete('kind');
    // Danh mục phụ thuộc loại phiếu nên bỏ chọn khi đổi loại.
    params.delete('category_id');
    pushParams(params);
  };

  const categoryOptions = [
    { value: '', label: 'Tất cả danh mục' },
    ...(categories ?? []).map((category) => ({ value: category.id, label: category.name })),
  ];

  const fundOptions = [
    { value: '', label: 'Tất cả quỹ' },
    ...(funds ?? []).map((fund) => ({ value: fund.id, label: fund.name })),
  ];

  return (
    <DashToolbar
      searchPlaceholder="Tìm theo mã phiếu, nội dung..."
      searchValue={inputValue}
      onSearchChange={(v) => setInputValue(v)}
      filters={[
        {
          id: 'kind',
          placeholder: 'Tất cả phiếu',
          value: kind || undefined,
          widthClass: 'sm:w-40',
          options: KIND_OPTIONS,
          onValueChange: (value) => handleKindChange(value),
        },
        {
          id: 'category_id',
          placeholder: 'Tất cả danh mục',
          value: categoryId || undefined,
          widthClass: 'sm:w-52',
          options: categoryOptions,
          onValueChange: (value) => handleFilterChange('category_id', value),
        },
        // {
        //   id: 'fund_id',
        //   placeholder: 'Tất cả quỹ',
        //   value: fundId || undefined,
        //   widthClass: 'sm:w-44',
        //   options: fundOptions,
        //   onValueChange: (value) => handleFilterChange('fund_id', value),
        // },
        // {
        //   id: 'status',
        //   placeholder: 'Tất cả trạng thái',
        //   value: status || undefined,
        //   widthClass: 'sm:w-40',
        //   options: STATUS_OPTIONS,
        //   onValueChange: (value) => handleFilterChange('status', value),
        // },
        {
          id: 'sort_by',
          placeholder: 'Sắp xếp: Mới nhất',
          value: sortBy || undefined,
          widthClass: 'sm:w-44',
          options: SORT_OPTIONS,
          onValueChange: (value) => handleFilterChange('sort_by', value),
        },
      ]}
      onRefresh={() => router.refresh()}
      onReset={() => router.push('/cashflow', { scroll: false })}
    />
  );
}
