'use client';

import * as React from 'react';
import { AlarmClock, Cake, Phone, Star, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashDrawer } from '@/components/dashboard/DashDrawer';
import useCustomerDetail from '@/hooks/use-customer-detail';
import { getApiErrorMessage } from '@/services/apiClient';
import type { SpendByMonth } from '@/types/customer';
import { CustomerForm } from './CustomerForm';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Id khách cần xem — null thì drawer không fetch. */
  customerId: string | null;
};

function formatVND(n: number): string {
  return `${n.toLocaleString('vi-VN')} đ`;
}

function formatCompact(n: number): string {
  if (n >= 1000000) {
    const v = n / 1000000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}M`;
  }
  return n.toLocaleString('vi-VN');
}

function formatBirth(birth: string | null): string {
  if (!birth) return '—';
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return birth;
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const age = new Date().getFullYear() - yyyy;
  return `${dd}/${mo}/${yyyy} (${age} tuổi)`;
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

function formatMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-');
  if (!y || !m) return yyyyMM;
  return `T${Number(m)}`;
}

/** Cột biểu đồ chi tiêu 6 tháng từ API thật (cao theo max). */
function SpendingChart({ data }: { data: SpendByMonth[] }) {
  const max = Math.max(1, ...data.map((m) => m.total_spent));
  const avg = data.length > 0 ? data.reduce((s, m) => s + m.total_spent, 0) / data.length : 0;
  return (
    <div className="bg-surface rounded-xl p-4 border border-outline">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-800">Mức chi tiêu 6 tháng gần nhất</span>
        <span className="text-[11px] text-primary font-medium">
          Trung bình: {formatCompact(Math.round(avg))}/tháng
        </span>
      </div>
      {data.length === 0 ? (
        <p className="py-4 text-center text-xs text-on-surface-variant">Chưa có dữ liệu chi tiêu</p>
      ) : (
        <div className="h-20 flex items-end justify-between gap-3 pt-2">
          {data.map((m, i) => {
            const active = i === data.length - 1;
            const h = Math.max(6, Math.round((m.total_spent / max) * 64));
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${formatMonthLabel(m.month)}: ${formatVND(m.total_spent)} (${m.total_orders} đơn)`}>
                <div
                  style={{ height: h }}
                  className={`w-full rounded-t ${active ? 'bg-primary shadow-xs' : 'bg-primary-container'}`}
                />
                <span
                  className={`text-[10px] ${active ? 'font-bold text-primary' : 'text-on-surface-variant'}`}
                >
                  {formatMonthLabel(m.month)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CustomerDrawer({ open, onOpenChange, customerId }: Props) {
  const { data: detail, isLoading, isError, error } = useCustomerDetail({ id: customerId });
  const c = detail?.customer;
  const orders = detail?.orders.data ?? [];
  const [editOpen, setEditOpen] = React.useState(false);

  return (
    <DashDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết khách hàng"
      subtitle={c ? `Khách hàng${c.total_visits > 5 ? ' thân thiết' : ''} • ${c.total_visits} lần ghé` : undefined}
      badge={
        c && (
          <span className="text-xs font-mono font-semibold text-primary bg-primary-container/60 px-2 py-0.5 rounded">
            {c.phone}
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
          <Button
            className="bg-primary hover:bg-[#436b95] text-on-primary"
            disabled={!c}
            onClick={() => setEditOpen(true)}
          >
            Chỉnh sửa hồ sơ
          </Button>
        </>
      }
      widthClass="!max-w-[640px] !w-[540px]"
    >
      {c && (
        <CustomerForm
          mode="edit"
          open={editOpen}
          onOpenChange={setEditOpen}
          initialData={{
            id: c.id,
            full_name: c.full_name,
            phone: c.phone,
            gender: c.gender,
            birth_date: c.birth_date,
            note: c.note,
          }}
        />
      )}
      {isError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Không tải được hồ sơ khách: {getApiErrorMessage(error)}
        </div>
      ) : isLoading || !c ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-outline bg-surface-container-low p-4">
              <div className="h-4 w-2/3 rounded bg-surface-container" />
              <div className="mt-2 h-3 w-1/3 rounded bg-surface-container" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Profile Card */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-container-low border border-outline">
            <div className="relative shrink-0">
              <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-container text-2xl font-bold text-primary ring-2 ring-primary/40 shadow">
                {(c.full_name || 'K').charAt(0).toUpperCase()}
              </span>
              {c.is_flagged_risk && (
                <span className="absolute -bottom-1 -right-1 bg-error text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-white">
                  RỦI RO
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900 truncate">{c.full_name}</h4>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                  {c.total_visits >= 10 ? 'Hạng Vàng' : c.total_visits >= 5 ? 'Hạng Bạc' : 'Mới'}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-on-surface-variant">
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-mono text-slate-800 font-medium">{c.phone}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Cake className="h-3.5 w-3.5 text-slate-500" />
                  <span>{formatBirth(c.birth_date)}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    {c.gender === 'male' ? 'Nam' : c.gender === 'female' ? 'Nữ' : 'Khác'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Stats Matrix */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-surface border border-outline">
              <p className="text-[10px] text-on-surface-variant uppercase font-medium">Lần ghé</p>
              <p className="text-base font-bold text-primary mt-0.5">{c.total_visits}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-outline">
              <p className="text-[10px] text-on-surface-variant uppercase font-medium">Tổng chi</p>
              <p className="text-xs font-bold text-slate-900 mt-1">{formatCompact(c.total_spent)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-outline">
              <p className="text-[10px] text-on-surface-variant uppercase font-medium">Tích điểm</p>
              <p className="text-base font-bold text-amber-600 mt-0.5">
                {c.reward_points.toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-outline">
              <p className="text-[10px] text-on-surface-variant uppercase font-medium">Hủy lịch</p>
              <p className="text-base font-bold text-emerald-600 mt-0.5">
                {c.total_cancelled_appointments}
              </p>
            </div>
          </div>

          {/* Spending Trend */}
          <SpendingChart data={c.spending_by_month ?? []} />

          {/* Notes — ghi chú thật, mock tạm phần công thức */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Ghi chú phục vụ & Công thức tóc
              </h5>
              <button className="text-xs text-primary font-medium hover:underline">+ Cập nhật</button>
            </div>
            {c.note ? (
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-2 text-slate-800">
                <p className="flex items-start gap-2">
                  <TriangleAlert className="text-amber-600 h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{c.note}</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">Chưa có ghi chú phục vụ.</p>
            )}
          </div>

          {/* Orders */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Lịch sử đơn hàng gần đây
            </h5>
            {orders.length === 0 ? (
              <p className="text-xs text-on-surface-variant">Khách chưa có đơn hàng nào.</p>
            ) : (
              <div className="border border-outline rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-surface-container-low text-on-surface-variant font-medium">
                    <tr>
                      <th className="py-2 px-3 text-left">Mã đơn</th>
                      <th className="py-2 px-3 text-left">Trạng thái</th>
                      <th className="py-2 px-3 text-right">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-2 px-3 font-mono font-medium text-primary">{o.code}</td>
                        <td className="py-2 px-3 text-slate-700">{o.status}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatVND(o.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Upcoming — giữ mock tạm */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Lịch hẹn sắp tới
            </h5>
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                  <AlarmClock className="h-3.5 w-3.5" />
                  Sắp có (mock tạm)
                </span>
                <span className="text-[10px] font-semibold bg-primary text-white px-2 py-0.5 rounded-full">
                  Sắp diễn ra
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Đang chờ đấu API lịch hẹn theo khách — hiện giữ nội dung mẫu.
              </p>
            </div>
          </div>
        </>
      )}
    </DashDrawer>
  );
}
