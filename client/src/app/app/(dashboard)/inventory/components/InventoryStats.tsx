'use client';

import { Package, TriangleAlert, Truck, Wallet } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import useInventoryStats from '@/hooks/use-inventory-stats';

export default function InventoryStats() {
  const { data, isLoading } = useInventoryStats();

  const total = data?.total_skus ?? 0;
  const retail = data?.retail_skus ?? 0;
  const material = data?.material_skus ?? 0;
  const lowStock = data?.low_stock_skus ?? 0;
  const inventoryValue = data?.inventory_value ?? 0;
  const importCost = data?.import_cost_month ?? 0;
  const importDocs = data?.import_documents_month ?? 0;
  const loading = isLoading && !data;
  const val = (v: string) => (loading ? '—' : v);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Tổng SKU"
        value={
          <>
            {val(String(total))}{' '}
            <span className="text-xs font-normal text-on-surface-variant">mặt hàng</span>
          </>
        }
        sub={loading ? '—' : `${retail} sản phẩm bán lẻ • ${material} vật tư`}
        icon={Package}
      />
      <StatCard
        label="Sắp hết hàng"
        value={
          <>
            {val(String(lowStock))}{' '}
            {lowStock > 0 && (
              <span className="ml-1 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-error">
                Báo động
              </span>
            )}
          </>
        }
        sub={
          lowStock > 0 ? (
            <span className="text-red-600/80">Cần tạo đơn bổ sung trong 48h</span>
          ) : (
            'Tồn kho đang ở mức an toàn'
          )
        }
        icon={TriangleAlert}
        iconWrapClassName="bg-red-100 text-error"
        className="border-red-200 bg-red-50/20"
      />
      <StatCard
        label="Tổng giá trị tồn kho"
        value={
          <>
            {loading ? '—' : inventoryValue.toLocaleString('vi-VN')}{' '}
            <span className="text-xs font-normal text-on-surface-variant">đ</span>
          </>
        }
        sub="Giá vốn × số lượng tồn hiện tại"
        icon={Wallet}
        iconWrapClassName="bg-emerald-50 text-success"
      />
      <StatCard
        label="Chi phí nhập tháng này"
        value={
          <>
            {loading ? '—' : importCost.toLocaleString('vi-VN')}{' '}
            <span className="text-xs font-normal text-on-surface-variant">đ</span>
          </>
        }
        sub={loading ? '—' : `${importDocs} đợt nhập hàng tháng này`}
        icon={Truck}
        iconWrapClassName="bg-blue-50 text-primary"
      />
    </section>
  );
}
