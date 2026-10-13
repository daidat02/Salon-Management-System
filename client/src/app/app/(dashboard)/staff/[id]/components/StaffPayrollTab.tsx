'use client';

import * as React from 'react';
import { Tag } from '@/components/ui/tag';
import { Button } from '@/components/ui/button';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import DashTabs from '@/components/dashboard/DashTabs';

// Tab Bảng lương: giữ nguyên nội dung, không thay đổi theo yêu cầu.

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(
  (m) => ({ label: `Tháng ${m}/2026`, value: `2026-${m}` }),
);

const PAYROLL_ROWS = [
  {
    label: 'Lương cứng theo ngày công',
    sub: '(24/26)',
    value: '7.384.615 đ',
    valueClass: 'font-bold text-on-surface',
  },
  {
    label: 'Hoa hồng dịch vụ',
    sub: '(theo nhóm DV)',
    value: '+1.039.500 đ',
    valueClass: 'font-bold text-primary',
  },
  {
    label: 'Thưởng hiệu suất',
    sub: undefined,
    value: '+500.000 đ',
    valueClass: 'font-bold text-amber-700',
  },
  {
    label: 'Khấu trừ / Phạt',
    sub: '(đi trễ 1 lần)',
    value: '−100.000 đ',
    valueClass: 'font-bold text-error',
  },
  {
    label: 'Trừ redo & khiếu nại',
    sub: '(2 ca)',
    value: '−320.000 đ',
    valueClass: 'font-bold text-error',
  },
  {
    label: 'Tạm ứng',
    sub: '(12/09)',
    value: '−1.000.000 đ',
    valueClass: 'font-bold text-on-surface-variant',
  },
];

export default function StaffPayrollTab() {
  const [cycle, setCycle] = React.useState('2026-10');
  const [cycleMode, setCycleMode] = React.useState<'month' | 'custom'>('month');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Bảng lương chi tiết</h2>
        <p className="text-[13px] text-on-surface-variant">
          Tổng hợp thu nhập theo chu kỳ — đối soát trước khi chốt lương.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-outline bg-surface-container-low p-2">
        <DashTabs
          value={cycleMode}
          onValueChange={(v) => setCycleMode(v as 'month' | 'custom')}
          items={[
            { value: 'month', label: 'Tháng' },
            { value: 'custom', label: 'Tùy chọn' },
          ]}
        />
        {cycleMode === 'month' ? (
          <DashSelect
            value={cycle}
            onValueChange={(v) => setCycle(v)}
            triggerClassName="w-40"
            options={MONTHS}
          />
        ) : (
          <span className="flex items-center gap-2 text-xs">
            <DashInput type="date" defaultValue="2026-09-01" className="w-auto bg-white" />
            <span className="text-on-surface-variant">→</span>
            <DashInput type="date" defaultValue="2026-09-30" className="w-auto bg-white" />
          </span>
        )}
        <Button size="sm">Áp dụng</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sm:border-r sm:border-outline sm:pr-3">
          <p className="text-xs text-on-surface-variant">Hoa hồng kỳ này</p>
          <p className="mt-2 font-semibold text-success">1.039.500 đ</p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">8 đơn phục vụ</p>
        </div>
        <div className="sm:border-r sm:border-outline sm:pr-3">
          <p className="text-xs text-on-surface-variant">Số đơn phục vụ</p>
          <p className="mt-2 text-xl font-semibold text-on-surface">
            8 <span className="text-xs font-normal text-on-surface-variant">đơn</span>
          </p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">6 hoàn thành</p>
        </div>
        <div className="sm:border-r sm:border-outline sm:pr-3">
          <p className="text-xs text-on-surface-variant">Ngày công</p>
          <p className="mt-2 text-xl font-semibold text-on-surface">
            24 <span className="text-xs font-normal text-on-surface-variant">/ 26 ngày</span>
          </p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">Nghỉ 2 ngày (1 phép)</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">Tạm tính lương</p>
          <p className="mt-2 font-semibold text-primary">9.039.500 đ</p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">Cứng 8.0M + hoa hồng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-xl border border-outline bg-white">
          <div className="border-b border-outline bg-surface-header px-4 py-3 text-[13px] font-bold">
            Chi tiết cấu thành lương — 10/2026
          </div>
          <ul className="divide-y divide-outline text-[13px]">
            {PAYROLL_ROWS.map((r) => (
              <li key={r.label} className="flex items-center justify-between px-4 py-2.5">
                <span>
                  {r.label}{' '}
                  {r.sub && <span className="text-[11px] text-on-surface-variant">{r.sub}</span>}
                </span>
                <span className={r.valueClass}>{r.value}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 bg-on-surface px-4 py-3.5 text-white">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                Tổng thực lĩnh (Net Salary)
              </p>
              <p className="text-[11px] text-slate-400">Chuyển khoản • Vietcombank **** 8821</p>
            </div>
            <p className="text-xl font-bold text-emerald-300">7.504.115 đ</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-outline bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Trạng thái chốt lương
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Tag variant="warning" shape="pill" size="md">
                CHỜ DUYỆT
              </Tag>
              <span className="text-[11px] text-on-surface-variant">Hạn chốt: 05/11</span>
            </div>
            <Button size="sm" className="mt-3.5 w-full bg-emerald-600 hover:bg-emerald-700">
              Duyệt & chốt lương
            </Button>
          </div>
          <div className="rounded-xl border border-dashed border-outline bg-white p-3.5 text-[13px]">
            <p className="mb-2 font-bold">Chu kỳ gần đây</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">T09/2026</span>
                <span className="font-bold">8.820.000 đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">T08/2026</span>
                <span className="font-bold">9.105.000 đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">T07/2026</span>
                <span className="font-bold">7.940.000 đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
