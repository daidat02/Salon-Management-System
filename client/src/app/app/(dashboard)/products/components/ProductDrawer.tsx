'use client';

import * as React from 'react';
import { AlertTriangle, Banknote, Boxes, Package, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashDrawer } from '@/components/dashboard/DashDrawer';
import type { Product } from '@/types/product';
import type { InventoryTransaction, InventoryTransactionType } from '@/types/inventory';

// Mock data cho drawer chi tiết sản phẩm — bám cấu trúc CustomerDrawer.
// Chưa kết nối API.

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

const mockRevenue = [
  { month: 'T5', value: 42 },
  { month: 'T6', value: 55 },
  { month: 'T7', value: 38 },
  { month: 'T8', value: 61 },
  { month: 'T9', value: 47 },
  { month: 'T10', value: 70, active: true },
];

const TXN_META: Record<InventoryTransactionType, { label: string; badge: string; sign: string }> = {
  import: { label: 'Nhập kho', badge: 'bg-emerald-50 text-emerald-700', sign: '+' },
  export: { label: 'Xuất kho', badge: 'bg-amber-50 text-amber-700', sign: '−' },
  adjust: { label: 'Điều chỉnh', badge: 'bg-indigo-50 text-indigo-700', sign: '+' },
  sale: { label: 'Bán lẻ', badge: 'bg-blue-50 text-primary', sign: '−' },
  return: { label: 'Trả hàng', badge: 'bg-purple-50 text-purple-700', sign: '+' },
};

function formatVND(n: number): string {
  return `${n.toLocaleString('vi-VN')} đ`;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm} ${dd}/${mo}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sản phẩm đã chọn (header + tồn kho lấy thật, còn lại mock). */
  product: Product | null;
};

export function ProductDrawer({ open, onOpenChange, product }: Props) {
  const lowStock = (product?.stock_quantity ?? 0) <= (product?.min_stock ?? 0);
  const stockValue = (product?.stock_quantity ?? 0) * (product?.cost_price ?? 0);

  return (
    <DashDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết sản phẩm"
      subtitle={product ? `SKU: ${product.sku}` : undefined}
      badge={
        product && (
          <span className="text-xs font-mono font-semibold text-primary bg-primary-container/60 px-2 py-0.5 rounded">
            {product.unit}
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
          <Button className="bg-primary hover:bg-[#436b95] text-on-primary">Chỉnh sửa</Button>
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
              {product?.name ?? 'Sản phẩm'}
            </h4>
            {lowStock ? (
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
              Giá vốn: <span className="font-semibold text-slate-800">{formatVND(product?.cost_price ?? 0)}</span>
            </p>
            <p>
              Giá bán: <span className="font-semibold text-primary">{formatVND(product?.sell_price ?? 0)}</span>
            </p>
            <p>
              Tồn tối thiểu: <span className="font-medium text-slate-800">{product?.min_stock ?? 0} {product?.unit ?? ''}</span>
            </p>
            <p>
              Quy cách:{' '}
              <span className="font-medium text-slate-800">
                {product?.net_amount && product?.net_unit
                  ? `${product.net_amount}${product.net_unit}/${product.unit}`
                  : `1 ${product?.unit ?? ''}`}
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
            {product?.stock_quantity ?? 0}
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface border border-outline">
          <p className="text-[10px] text-on-surface-variant uppercase font-medium">Đã bán T10</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">48</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface border border-outline">
          <p className="text-[10px] text-on-surface-variant uppercase font-medium">Doanh thu</p>
          <p className="text-xs font-bold text-slate-900 mt-1">9.1M</p>
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
          <span className="text-[11px] text-primary font-medium">Trung bình: 6.2M/tháng</span>
        </div>
        <div className="h-20 flex items-end justify-between gap-3 pt-2">
          {mockRevenue.map((m, i) => {
            const active = i === mockRevenue.length - 1;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  style={{ height: Math.max(6, Math.round((m.value / 70) * 64)) }}
                  className={`w-full rounded-t ${active ? 'bg-primary shadow-xs' : 'bg-primary-container'}`}
                />
                <span
                  className={`text-[10px] ${active ? 'font-bold text-primary' : 'text-on-surface-variant'}`}
                >
                  {m.month}
                </span>
              </div>
            );
          })}
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
                      {formatDateTime(t.created_at)}
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
  );
}
