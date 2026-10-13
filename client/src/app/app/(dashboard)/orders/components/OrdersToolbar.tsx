'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashToolbar from '@/components/dashboard/DashToolbar';

type OrdersToolbarProps = {
  /** Khi true: dropdown status chỉ hiện các trạng thái lịch sử (kết thúc). */
  historyOnly?: boolean;
};

const ALL_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'confirm', label: 'Đã xác nhận' },
  { value: 'delivery', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn tất' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
];

const HISTORY_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả lịch sử' },
  { value: 'completed', label: 'Hoàn tất' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
];

export default function OrdersToolbar({ historyOnly = false }: OrdersToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const [inputValue, setInputValue] = React.useState(search);

  React.useEffect(() => {
    setInputValue(search);
  }, [search]);

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

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete('status');
    else params.set('status', value);
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <DashToolbar
      searchPlaceholder="Tìm mã đơn, tên khách, SĐT..."
      searchValue={inputValue}
      onSearchChange={setInputValue}
      filters={[
        {
          id: 'status',
          placeholder: 'Tất cả trạng thái',
          value: status || undefined,
          widthClass: 'sm:w-44',
          options: historyOnly ? HISTORY_STATUS_OPTIONS : ALL_STATUS_OPTIONS,
          onValueChange: handleStatusChange,
        },
      ]}
      onRefresh={() => router.refresh()}
      onReset={() => router.push('/app/orders', { scroll: false })}
    />
  );
}
