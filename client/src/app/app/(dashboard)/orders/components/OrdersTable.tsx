'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashTable from '@/components/dashboard/DashTable';
import { TableSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { getApiErrorMessage } from '@/services/apiClient';
import { useOrders } from '@/hooks/order';
import { useCustomer } from '@/hooks/customer';
import { buildOrderColumns, type CustomerLookup } from './columns';
import { TERMINAL_STATUSES } from './ActiveOrdersSection';

const PAGE_SIZE = 10;
const HISTORY_FETCH_SIZE = 50;

type OrdersTableProps = {
  /** Khi true: mặc định chỉ hiện lịch sử (completed/cancelled/refunded). Backend chưa hỗ trợ lọc OR nhiều status nên fetch rộng rồi lọc client. */
  historyOnly?: boolean;
};

export default function OrdersTable({ historyOnly = false }: OrdersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10) || 1;

  const page = pageFromUrl || 1;

  // Chế độ lịch sử + chưa chọn status cụ thể: fetch rộng rồi lọc terminal ở client
  // (tránh trùng với card active phía trên mà vẫn giữ phân trang đúng).
  const useClientHistory = historyOnly && !status;

  const { data, isLoading, isError, error } = useOrders({
    page: useClientHistory ? 1 : page,
    pageSize: useClientHistory ? HISTORY_FETCH_SIZE : PAGE_SIZE,
    status,
  });

  // Lookup tên + SĐT khách (API đơn chỉ trả customer_id).
  const { data: customerData } = useCustomer({ page: 1, pageSize: 100 });
  const customerMap = React.useMemo(() => {
    const map = new Map<string, { name: string; phone: string }>();
    for (const c of customerData?.data ?? []) {
      if (c) map.set(c.id, { name: c.full_name, phone: c.phone });
    }
    return map;
  }, [customerData]);
  const lookup: CustomerLookup = React.useCallback(
    (id) => (id ? customerMap.get(id) : undefined),
    [customerMap],
  );
  const columns = React.useMemo(() => buildOrderColumns(lookup), [lookup]);

  const serverRows = (data?.data || []).filter(
    (r): r is NonNullable<typeof r> => r !== null && r !== undefined,
  );

  // Lịch sử mặc định: loại đơn active (đã hiện ở card phía trên).
  const historyRows = useClientHistory
    ? serverRows.filter((row) => TERMINAL_STATUSES.includes(row.status))
    : serverRows;
  const serverTotal = useClientHistory ? historyRows.length : data?.total || 0;

  // Backend chưa hỗ trợ search đơn → lọc theo mã đơn trong dữ liệu đã fetch.
  const query = search.trim().toLowerCase();
  const searched = query
    ? historyRows.filter((row) => row.code.toLowerCase().includes(query))
    : historyRows;

  // Chế độ lịch sử mặc định: phân trang ở client trên tập đã lọc.
  const displayed = useClientHistory
    ? searched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : searched;
  const total = query && !useClientHistory ? displayed.length : useClientHistory ? searched.length : serverTotal;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  if (isError) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Không tải được danh sách đơn hàng: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc
        kiểm tra kết nối API.
      </div>
    );
  }

  if (isLoading && serverRows.length === 0) {
    return <TableSkeleton />;
  }

  return (
    <DashTable
      columns={columns}
      data={displayed}
      getRowId={(r) => r.id}
      pagination={{
        page: query && !useClientHistory ? 1 : page,
        pageSize: PAGE_SIZE,
        total,
        itemLabel: 'đơn hàng',
        onPageChange: handlePageChange,
      }}
    />
  );
}
