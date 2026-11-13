'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashTable from '@/components/dashboard/DashTable';
import DashToolbar from '@/components/dashboard/DashToolbar';
import { TableSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { getApiErrorMessage } from '@/services/apiClient';
import { useInventoryDocuments } from '@/hooks/inventory';
import { historyColumns } from './historyColumns';

export const INVENTORY_HISTORY_ANCHOR = 'inventory-history';

const PAGE_SIZE = 5;

/**
 * Bảng Lịch sử phiếu nhập / xuất kho — dữ liệu thật từ API GET /inventory/.
 * Dùng param URL riêng (hpage, hsearch, hsort, hfilter) để không xung đột
 * với bảng tồn kho chính (?page, ?search...).
 */
export default function InventoryHistoryTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageFromUrl = parseInt(searchParams.get('hpage') || '1', 10) || 1;
  const search = searchParams.get('hsearch') || '';
  const sort = searchParams.get('hsort') || '';
  const filter = searchParams.get('hfilter') || '';
  const paymentStatus = searchParams.get('hpayment') || '';

  const page = pageFromUrl || 1;
  const [inputValue, setInputValue] = React.useState(search);
  const [lastSearch, setLastSearch] = React.useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setInputValue(search);
  }

  // Debounce search -> URL (giống ProductToolbar).
  React.useEffect(() => {
    if (inputValue === search) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (inputValue.trim()) params.set('hsearch', inputValue.trim());
      else params.delete('hsearch');
      params.delete('hpage');
      router.push(`?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(t);
  }, [inputValue, search, router, searchParams]);

  const { data, isLoading, isError, error, refetch } = useInventoryDocuments({
    search,
    sort,
    filter,
    paymentStatus,
    page,
    pageSize: PAGE_SIZE,
  });

  const documents = (data?.data || []).filter(
    (r): r is NonNullable<typeof r> => r !== null && r !== undefined,
  );
  const total = data?.total || 0;

  const setUrlParams = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    params.delete('hpage');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('hpage', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleReset = () => {
    setInputValue('');
    setUrlParams({ hsearch: null, hsort: null, hfilter: null, hpayment: null });
  };

  if (isError) {
    return (
      <section id={INVENTORY_HISTORY_ANCHOR} className="scroll-mt-20 space-y-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Không tải được lịch sử phiếu kho: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc
          kiểm tra kết nối API.
        </div>
      </section>
    );
  }

  if (isLoading && documents.length === 0) {
    return (
      <section id={INVENTORY_HISTORY_ANCHOR} className="scroll-mt-20 space-y-3">
        <TableSkeleton />
      </section>
    );
  }

  return (
    <section id={INVENTORY_HISTORY_ANCHOR} className="scroll-mt-20 space-y-3">
      <div className="flex items-center gap-2">
        <div>
          <h2 className="text-sm font-bold text-on-surface">Lịch sử phiếu nhập / xuất kho</h2>
          <p className="text-[11px] text-on-surface-variant">
            Theo dõi các phiếu nhập, xuất, điều chỉnh và bán hàng liên quan đến tồn kho.
          </p>
        </div>
      </div>
      <DashToolbar
        searchPlaceholder="Tìm theo mã phiếu, NCC, đơn hàng..."
        searchValue={inputValue}
        onSearchChange={setInputValue}
        dateFilter={{
          range: true,
          placeholder: 'Từ ngày - Đến ngày',
          widthClass: 'sm:w-[13.5rem]',
        }}
        filters={[
          {
            id: 'hfilter',
            placeholder: 'Tất cả loại phiếu',
            value: filter || undefined,
            options: [
              { value: '', label: 'Tất cả loại phiếu' },
              { value: 'import', label: 'Phiếu nhập' },
              { value: 'export', label: 'Phiếu xuất' },
              { value: 'adjust', label: 'Điều chỉnh' },
              { value: 'sale', label: 'Bán hàng' },
              { value: 'return', label: 'Trả hàng' },
            ],
            onValueChange: (v) => setUrlParams({ hfilter: v || null }),
          },
          {
            id: 'hpayment',
            placeholder: 'Tất cả công nợ',
            value: paymentStatus || undefined,
            widthClass: 'sm:w-44',
            options: [
              { value: '', label: 'Tất cả công nợ' },
              { value: 'unpaid', label: 'Chưa thanh toán' },
              { value: 'partial', label: 'Trả một phần' },
              { value: 'paid', label: 'Đã trả hết' },
              { value: 'overdue', label: 'Quá hạn' },
            ],
            onValueChange: (v) => setUrlParams({ hpayment: v || null }),
          },
          {
            id: 'hsort',
            placeholder: 'Sắp xếp: Mới nhất',
            value: sort || undefined,
            widthClass: 'sm:w-44',
            options: [
              { value: 'created_at_desc', label: 'Sắp xếp: Mới nhất' },
              { value: 'created_at_asc', label: 'Sắp xếp: Cũ nhất' },
              { value: 'total_amount_desc', label: 'Tổng tiền giảm dần' },
              { value: 'total_amount_asc', label: 'Tổng tiền tăng dần' },
            ],
            onValueChange: (v) => setUrlParams({ hsort: v || null }),
          },
        ]}
        onRefresh={() => refetch()}
        onReset={handleReset}
      />

      <DashTable
        columns={historyColumns}
        data={documents}
        getRowId={(row) => row.id}
        selectable={false}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          itemLabel: 'phiếu kho',
          onPageChange: handlePageChange,
        }}
      />
    </section>
  );
}
