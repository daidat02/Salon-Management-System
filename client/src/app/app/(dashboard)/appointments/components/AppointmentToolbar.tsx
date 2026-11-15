'use client';
import DashToolbar from '@/components/dashboard/DashToolbar';
import { useDebounceSearch } from '@/hooks/use-debounce';
import { useFilterParams } from '@/hooks/use-filter-params';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const AppointmentToolbar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';

  const [inputValue, setInputValue] = useState<string>(search || '');

  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setInputValue(search);
  }

  const { setFilterParam } = useFilterParams();
  useDebounceSearch(inputValue, { paramName: 'search', delay: 400, resetPage: true });

  const handleFilterChange = (filterId: string, value: string, placeholder: string) => {
    setFilterParam(filterId, value, { placeholder, resetPage: true });
  };

  return (
    <DashToolbar
      searchPlaceholder="Tìm theo tên, SĐT, mã lịch..."
      onSearchChange={(value) => setInputValue(value)}
      searchValue={inputValue}
      dateFilter={{
        value: searchParams.get('date') ? new Date(searchParams.get('date')!) : undefined,
        onValueChange: (date: Date | undefined) => {
          const dateStr = date ? date.toISOString() : '';
          setFilterParam('date', dateStr, { placeholder: '', resetPage: true });
        },
      }}
      filters={[
        {
          id: 'status',
          placeholder: 'Tất cả trạng thái',
          widthClass: 'sm:w-44',
          options: [
            { label: 'Tất cả trạng thái', value: '' },
            { label: 'Chờ xác nhận', value: 'pending' },
            { label: 'Đã xác nhận', value: 'confirmed' },
            { label: 'Đã check-in', value: 'checked_in' },
            { label: 'Đang phục vụ', value: 'in_progress' },
            { label: 'Đã hoàn thành', value: 'completed' },
            { label: 'Đã hủy', value: 'cancelled' },
            { label: 'Không đến', value: 'no_show' },
          ],
          value: searchParams.get('status') || '',
          onValueChange: (value) => handleFilterChange('status', value, 'Tất cả trạng thái'),
        },
      ]}
      onReset={() => router.push('/appointments?', { scroll: false })}
    />
  );
};

export default AppointmentToolbar;
