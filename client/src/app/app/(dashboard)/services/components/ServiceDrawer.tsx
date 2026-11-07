'use client';

import * as React from 'react';
import { Banknote, Clock3, Scissors, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashDrawer } from '@/components/dashboard/DashDrawer';
import type { Service } from '@/types/service';
import { formatVND } from '@/lib/format';
import useServiceDetail from '@/hooks/use-service-detail';
import { ServiceFormDialog } from './ServiceFormDialog';

function formatDuration(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${m}p` : `${h} giờ`;
  }
  return `${min} phút`;
}

/** Số tiền gọn cho thẻ nhỏ: tỷ / triệu / nghìn. */
function formatCompactVND(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}k`;
  }
  return formatVND(value);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dịch vụ đã chọn (header lấy ngay từ row, phần còn lại fetch detail). */
  service: Service | null;
};

export function ServiceDrawer({ open, onOpenChange, service }: Props) {
  const { data, isLoading } = useServiceDetail(service?.id, open);
  const [editOpen, setEditOpen] = React.useState(false);

  const detail = data?.service;
  const view = detail ?? service;
  const materials = data?.materials ?? [];
  const loading = isLoading && !data;
  const val = (value: number) => (loading ? '—' : String(value));

  const months = detail?.revenue_last_6_months ?? [];
  const maxRevenue = Math.max(1, ...months.map((m) => m.revenue));
  const avgRevenue = months.length > 0 ? months.reduce((s, m) => s + m.revenue, 0) / 6 : 0;

  return (
    <>
    <DashDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết dịch vụ"
      subtitle={view ? `Mã: ${view.id.slice(0, 8).toUpperCase()}` : undefined}
      badge={
        view &&
        (view.is_active ? (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Đang bán
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            Tạm ẩn
          </span>
        ))
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
          <Button
            className="bg-primary hover:bg-[#436b95] text-on-primary"
            onClick={() => setEditOpen(true)}
            disabled={!view}
          >
            Chỉnh sửa
          </Button>
        </>
      }
      widthClass="!max-w-[640px] !w-[540px]"
    >
      {/* Info Card */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-container-low border border-outline">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary ring-2 ring-primary/40 shadow">
          <Scissors className="h-8 w-8" />
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-slate-900 truncate">
            {view?.name ?? 'Dịch vụ'}
          </h4>
          <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-2">
            {view?.description || '—'}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-on-surface-variant">
            <p className="flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5 text-slate-500" />
              Giá: <span className="font-semibold text-primary">{formatVND(view?.price ?? 0)}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium text-slate-800">
                {formatDuration(view?.duration_minutes ?? 0)}
              </span>
              {view?.buffer_minutes ? (
                <span className="text-on-surface-variant">(+{view.buffer_minutes}p đệm)</span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Matrix */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2.5 rounded-lg bg-surface border border-outline">
          <p className="text-[10px] text-on-surface-variant uppercase font-medium">Lượt đặt tháng này</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-base font-bold text-primary">
            <Users className="h-3.5 w-3.5" />
            {val(detail?.bookings_this_month ?? 0)}
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface border border-outline">
          <p className="text-[10px] text-on-surface-variant uppercase font-medium">Hoàn thành</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            {val(detail?.completed_this_month ?? 0)}
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface border border-outline">
          <p className="text-[10px] text-on-surface-variant uppercase font-medium">Doanh thu</p>
          <p className="text-xs font-bold text-slate-900 mt-1">
            {loading ? '—' : formatCompactVND(detail?.revenue_this_month ?? 0)}
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface border border-outline">
          <p className="text-[10px] text-on-surface-variant uppercase font-medium">Chi phí VT</p>
          <p className="text-xs font-bold text-emerald-600 mt-1">
            {loading ? '—' : formatCompactVND(detail?.material_cost_this_month ?? 0)}
          </p>
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
            {loading ? 'Trung bình: …' : `Trung bình: ${formatCompactVND(avgRevenue)}/tháng`}
          </span>
        </div>
        <div className="h-20 flex items-end justify-between gap-3 pt-2">
          {months.length === 0 ? (
            <p className="w-full text-center text-[11px] text-on-surface-variant py-6">
              {loading ? 'Đang tải…' : 'Chưa có dữ liệu doanh thu'}
            </p>
          ) : (
            months.map((m, i) => {
              const active = i === months.length - 1;
              return (
                <div key={`${m.month}-${i}`} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    style={{ height: Math.max(6, Math.round((m.revenue / maxRevenue) * 64)) }}
                    className={`w-full rounded-t ${active ? 'bg-primary shadow-xs' : 'bg-primary-container'}`}
                    title={formatVND(m.revenue)}
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

      {/* Materials */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
          Định mức vật tư / lần thực hiện
        </h5>
        <div className="border border-outline rounded-xl overflow-hidden text-xs">
          <table className="w-full">
            <thead className="bg-surface-container-low text-on-surface-variant font-medium">
              <tr>
                <th className="py-2 px-3 text-left">Vật tư</th>
                <th className="py-2 px-3 text-right">Định lượng</th>
                <th className="py-2 px-3 text-right">Giá vốn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 px-3 text-center text-on-surface-variant">
                    {loading ? 'Đang tải…' : 'Chưa có định mức vật tư'}
                  </td>
                </tr>
              ) : (
                materials.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 px-3 font-medium text-slate-700">{m.product_name}</td>
                    <td className="py-2 px-3 text-right font-mono text-on-surface-variant">
                      {`${Number(m.quantity).toLocaleString('vi-VN')} ${m.unit || m.product_unit || ''}`.trim()}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatVND(Number(m.quantity) * Number(m.cost_price))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashDrawer>
    <ServiceFormDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      service={view}
    />
    </>
  );
}
