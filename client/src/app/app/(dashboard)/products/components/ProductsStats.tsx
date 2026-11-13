'use client';

import { Package, TriangleAlert, Wallet } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { useProductStats } from '@/hooks/product';

/** 4 thẻ số liệu sản phẩm/kho từ API stats thật. */
export default function ProductsStats() {
  const { data, isLoading } = useProductStats();

  const total = data?.total_products ?? 0;
  const onSale = data?.on_sale_products ?? 0;
  const lowStock = data?.low_stock_products ?? 0;
  const revenue = data?.retail_revenue_month ?? 0;
  const loading = isLoading && !data;
  const rate = total > 0 ? ((onSale / total) * 100).toFixed(1) : '0.0';
  const val = (v: string) => (loading ? '—' : v);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Tổng sản phẩm"
        value={val(String(total))}
        sub="Tất cả sản phẩm trong kho"
        icon={Package}
        iconWrapClassName="bg-surface-container text-primary"
      />
      <StatCard
        label="Đang bán"
        value={
          <span className="flex items-baseline justify-between">
            <span>{val(String(onSale))}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> {loading ? '…' : `${rate}% tỷ lệ`}
            </span>
          </span>
        }
        sub="Sẵn sàng bán tại quầy"
        icon={Package}
        iconWrapClassName="bg-emerald-50 text-success"
      />
      <StatCard
        label="Sắp hết hàng"
        value={
          <span className="flex items-baseline justify-between">
            <span>{val(String(lowStock))}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Cần nhập hàng
            </span>
          </span>
        }
        sub="Dưới mức tồn an toàn"
        icon={TriangleAlert}
        iconWrapClassName="bg-amber-50 text-warning"
      />
      <StatCard
        label="Doanh thu bán lẻ tháng"
        value={loading ? '—' : `${revenue.toLocaleString('vi-VN')} đ`}
        sub="Tính trên đơn đã hoàn thành"
        icon={Wallet}
        iconWrapClassName="bg-primary-container text-primary"
      />
    </section>
  );
}
