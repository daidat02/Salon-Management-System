'use client';

import * as React from 'react';
import { AlertTriangle, Banknote, Boxes, Package, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashDrawer } from '@/components/dashboard/DashDrawer';
import { useProductDetail } from '@/hooks/product';
import type { Product } from '@/types/product';
import type { InventoryTransaction, InventoryTransactionType } from '@/types/inventory';
import { formatDateTime, formatShortDateTime, formatVND } from '@/lib/format';
import { ProductFormDialog } from './ProductFormDialog';
import useAuth from '@/hooks/use-auth';

const formatCompactVND = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return formatVND(value);
};

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  retail: 'Bán lẻ',
  material: 'Vật tư tiêu hao',
  both: 'Cả hai',
};

type TxnRow = Pick<
  InventoryTransaction,
  'id' | 'product_id' | 'type' | 'quantity' | 'reference_type' | 'created_at'
> & { actor: string };

const mockTxns: TxnRow[] = [
  { id: 'txn-01', product_id: 'p-01', type: 'import', quantity: 50, reference_type: 'purchase_order', created_at: '2026-10-10T09:15:00+07:00', actor: 'Lê Tuấn' },
  { id: 'txn-02', product_id: 'p-01', type: 'sale', quantity: -2, reference_type: 'order', created_at: '2026-10-09T16:40:00+07:00', actor: 'Thu Hà' },
  { id: 'txn-03', product_id: 'p-01', type: 'export', quantity: -5, reference_type: null, created_at: '2026-10-08T14:05:00+07:00', actor: 'Lê Tuấn' },
  { id: 'txn-04', product_id: 'p-01', type: 'sale', quantity: -1, reference_type: 'order', created_at: '2026-10-07T11:22:00+07:00', actor: 'Thu Hà' },
  { id: 'txn-05', product_id: 'p-01', type: 'adjust', quantity: 3, reference_type: null, created_at: '2026-10-05T08:30:00+07:00', actor: 'Lê Tuấn' },
  { id: 'txn-06', product_id: 'p-01', type: 'return', quantity: 1, reference_type: 'order', created_at: '2026-10-03T17:12:00+07:00', actor: 'Thu Hà' },
  { id: 'txn-07', product_id: 'p-01', type: 'import', quantity: 30, reference_type: 'purchase_order', created_at: '2026-09-28T10:00:00+07:00', actor: 'Lê Tuấn' },
];

const TXN_META: Record<InventoryTransactionType, { label: string; badge: string; sign: string }> = {
  import: { label: 'Nhập kho', badge: 'bg-emerald-50 text-emerald-700', sign: '+' },
  export: { label: 'Xuất kho', badge: 'bg-amber-50 text-amber-700', sign: '−' },
  adjust: { label: 'Điều chỉnh', badge: 'bg-indigo-50 text-indigo-700', sign: '+' },
  sale: { label: 'Bán lẻ', badge: 'bg-blue-50 text-primary', sign: '−' },
  return: { label: 'Trả hàng', badge: 'bg-purple-50 text-purple-700', sign: '+' },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sản phẩm đã chọn, dùng làm fallback trong lúc tải chi tiết. */
  product: Product | null;
};

export function ProductDrawer({ open, onOpenChange, product }: Props) {
  const { data: detail, isLoading } = useProductDetail(open ? product?.id ?? null : null);
  const [editOpen, setEditOpen] = React.useState(false);
  const { can } = useAuth();
  const item = detail ?? product;

  // API chi tiết đã quy đổi tồn kho về đơn vị bán (unit); row trong bảng vẫn
  // là đơn vị cơ sở nên quy đổi tại đây để tránh lệch khi đang tải.
  const toUnit = (value: number | undefined, netAmount: number | null | undefined) =>
    netAmount && netAmount > 0 ? (value ?? 0) / netAmount : (value ?? 0);
  const stockQuantity = detail
    ? detail.stock_quantity
    : toUnit(product?.stock_quantity, product?.net_amount);
  const minStock = detail ? detail.min_stock : toUnit(product?.min_stock, product?.net_amount);

  // Form sửa nhận tồn kho theo đơn vị lớn (khớp API chi tiết + cách tạo SP).
  const editProduct = item
    ? { ...item, stock_quantity: stockQuantity, min_stock: minStock }
    : null;

  const lowStock = stockQuantity <= minStock;
  const stockValue = stockQuantity * (item?.cost_price ?? 0);
  const revenueChart = detail?.revenue_last_6_months ?? [];
  const maxRevenue = Math.max(...revenueChart.map((m) => m.revenue), 1);
  const averageRevenue = revenueChart.length
    ? revenueChart.reduce((sum, m) => sum + m.revenue, 0) / revenueChart.length
    : 0;
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthLabel =
    revenueChart[revenueChart.length - 1]?.month ?? `T${currentMonth}`;

  return (
    <>
    <DashDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết sản phẩm"
      subtitle={item ? `SKU: ${item.sku}` : undefined}
      badge={
        item && (
          <span className="text-xs font-mono font-semibold text-primary bg-primary-container/60 px-2 py-0.5 rounded">
            {item.unit}
          </span>
        )
      }
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-outline text-slate-600"
          >
            Đóng
          </Button>
          {can('catalog:write') && (
            <Button
              className="bg-primary hover:bg-[#436b95] text-on-primary"
              onClick={() => setEditOpen(true)}
              disabled={!editProduct}
            >
              Chỉnh sửa
            </Button>
          )}
        </>
      }
      widthClass="!max-w-[640px] !w-[540px]"
    >
      {/* Info Card */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-container-low border border-outline">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary ring-2 ring-primary/40 shadow">
          <Package className="h-8 w-8" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-base font-bold text-slate-900 truncate">
              {item?.name ?? 'Sản phẩm'}
            </h4>
            {item && !item.is_active ? (
              <span className="shrink-0 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                Ngừng bán
              </span>
            ) : lowStock ? (
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-error bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                <AlertTriangle className="h-3 w-3" /> Sắp hết hàng
              </span>
            ) : (
              <span className="shrink-0 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Còn hàng
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-on-surface-variant">
            <p>
              Giá vốn: <span className="font-semibold text-slate-800">{formatVND(item?.cost_price ?? 0)}</span>
            </p>
            <p>
              Giá bán: <span className="font-semibold text-primary">{formatVND(item?.sell_price ?? 0)}</span>
            </p>
            <p>
              Tồn tối thiểu: <span className="font-medium text-slate-800">{minStock} {item?.unit ?? ''}</span>
            </p>
            <p>
              Quy cách:{' '}
              <span className="font-medium text-slate-800">
                {item?.net_amount && item?.net_unit
                  ? `${item.net_amount}${item.net_unit}/${item.unit}`
                  : `1 ${item?.unit ?? ''}`}
              </span>
            </p>
            <p>
              Danh mục:{' '}
              <span className="font-medium text-slate-800">
                {item?.category_name ?? 'Chưa phân loại'}
              </span>
            </p>
            <p>
              Loại:{' '}
              <span className="font-medium text-slate-800">
                {PRODUCT_TYPE_LABEL[item?.product_type ?? ''] ?? '—'}
              </span>
            </p>
            <p>
              Hiển thị web:{' '}
              <span className="font-medium text-slate-800">{item?.show_on_web ? 'Có' : 'Không'}</span>
            </p>
            <p>
              Trạng thái:{' '}
              <span className="font-medium text-slate-800">
                {item?.is_active ? 'Đang kinh doanh' : 'Ngừng bán'}
              </span>
            </p>
            <p className="col-span-2">
              Cập nhật:{' '}
              <span className="font-medium text-slate-800">
                {formatDateTime(item?.updated_at ?? null)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Matrix */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2.5 rounded-lg bg-surface border border-outline">
          <p className="text-[10px] text-on-surface-variant uppercase font-medium">Tồn kho</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-base font-bold text-primary">
            <Boxes className="h-3.5 w-3.5" />
            {stockQuantity}
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface border border-outline">
          <p className="text-[10px] text-on-surface-variant uppercase font-medium">
            Đã bán {currentMonthLabel}
          </p>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            {detail?.sold_this_month ?? 0}
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface border border-outline">
          <p className="text-[10px] text-on-surface-variant uppercase font-medium">Doanh thu</p>
          <p className="text-xs font-bold text-slate-900 mt-1">
            {formatCompactVND(item?.revenue_this_month ?? 0)}
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface border border-outline">
          <p className="text-[10px] text-on-surface-variant uppercase font-medium">Giá trị tồn</p>
          <p className="text-xs font-bold text-emerald-600 mt-1">{formatVND(stockValue)}</p>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="bg-surface rounded-xl p-4 border border-outline">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Doanh thu 6 tháng gần nhất
          </span>
          <span className="text-[11px] text-primary font-medium">
            Trung bình: {formatCompactVND(averageRevenue)}/tháng
          </span>
        </div>
        <div className="h-20 flex items-end justify-between gap-3 pt-2">
          {revenueChart.length === 0 ? (
            <p className="w-full text-center text-[11px] text-on-surface-variant">
              {isLoading ? 'Đang tải doanh thu...' : 'Chưa có dữ liệu doanh thu'}
            </p>
          ) : (
            revenueChart.map((m, i) => {
              const active = i === revenueChart.length - 1;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    style={{ height: Math.max(6, Math.round((m.revenue / maxRevenue) * 64)) }}
                    className={`w-full rounded-t ${active ? 'bg-primary shadow-xs' : 'bg-primary-container'}`}
                  />
                  <span
                    className={`text-[10px] ${active ? 'font-bold text-primary' : 'text-on-surface-variant'}`}
                  >
                    {m.month}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* In/Out History */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
          Lịch sử nhập / xuất kho
        </h5>
        <div className="border border-outline rounded-xl overflow-hidden text-xs">
          <table className="w-full">
            <thead className="bg-surface-container-low text-on-surface-variant font-medium">
              <tr>
                <th className="py-2 px-3 text-left">Loại</th>
                <th className="py-2 px-3 text-right">Số lượng</th>
                <th className="py-2 px-3 text-left">Người thực hiện</th>
                <th className="py-2 px-3 text-right">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {mockTxns.map((t) => {
                const meta = TXN_META[t.type];
                const positive = t.quantity > 0;
                return (
                  <tr key={t.id}>
                    <td className="py-2 px-3">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-bold ${positive ? 'text-emerald-600' : 'text-error'}`}
                    >
                      {meta.sign}
                      {Math.abs(t.quantity)}
                    </td>
                    <td className="py-2 px-3 text-slate-700">{t.actor}</td>
                    <td className="py-2 px-3 text-right font-mono text-on-surface-variant">
                      {formatShortDateTime(t.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
          <Banknote className="h-3.5 w-3.5" />
          Kiểu dữ liệu: <span className="font-mono">InventoryTransaction</span> (mock tạm)
        </p>
      </div>
    </DashDrawer>
    <ProductFormDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      product={editProduct}
    />
    </>
  );
}
