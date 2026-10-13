'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import DashTable, { type DashColumn } from '@/components/dashboard/DashTable';
import { Tag } from '@/components/ui/tag';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { HISTORY_FILTER_OPTIONS, formatVND, mockHistory, type HistoryRow } from './mock';

// Tab Lịch sử dịch vụ: tóm tắt 3 số + tìm kiếm/lọc + bảng lịch hẹn.

const historyColumns: DashColumn<HistoryRow>[] = [
  {
    id: 'code',
    header: 'Mã lịch hẹn',
    cell: (row) => <span className="font-bold text-primary">{row.code}</span>,
  },
  {
    id: 'service',
    header: 'Dịch vụ',
    cell: (row) => (
      <span>
        <span className="block font-semibold text-on-surface">{row.service}</span>
        <span className="block text-[11px] text-on-surface-variant">{row.detail}</span>
      </span>
    ),
  },
  {
    id: 'customer',
    header: 'Khách hàng',
    cell: (row) => <span className="font-semibold">{row.customer}</span>,
  },
  { id: 'time', header: 'Thời gian', className: 'whitespace-nowrap text-on-surface-variant' },
  { id: 'total', header: 'Giá trị', className: 'whitespace-nowrap text-right font-bold' },
  {
    id: 'commission',
    header: 'Hoa hồng',
    className: 'whitespace-nowrap text-right',
    cell: (row) => (
      <span>
        <span className="block font-bold text-emerald-600">{row.commission}</span>
        <span className="block text-[10px] text-on-surface-variant">{row.share}</span>
      </span>
    ),
  },
  {
    id: 'rating',
    header: 'Đánh giá',
    className: 'whitespace-nowrap text-right text-amber-400',
    cell: (row) => (
      <span>
        {'★'.repeat(row.rating)}
        {'☆'.repeat(5 - row.rating)}
      </span>
    ),
  },
  {
    id: 'quality',
    header: 'Chất lượng ca',
    cell: (row) => {
      if (row.quality === 'ok') {
        return (
          <Tag variant="success" shape="pill" size="md">
            Đạt
          </Tag>
        );
      }
      const meta = {
        redo: { variant: 'warning', label: 'Làm lại' },
        complaint: { variant: 'error', label: 'Khiếu nại' },
      } as const;
      return (
        <span>
          <Tag variant={meta[row.quality].variant} shape="pill" size="md">
            {meta[row.quality].label}
          </Tag>
          {row.qualityNote && (
            <span className="mt-1 block max-w-[220px] whitespace-normal text-[11px] leading-snug text-on-surface-variant">
              {row.qualityNote}
            </span>
          )}
        </span>
      );
    },
  },
];

const parseNum = (s: string) => Number(s.replace(/[^0-9]/g, '') || 0);

type StaffHistoryTabProps = {
  staffName: string;
};

export default function StaffHistoryTab({ staffName }: StaffHistoryTabProps) {
  const [historyQuery, setHistoryQuery] = React.useState('');
  const [historyFilter, setHistoryFilter] = React.useState('all');

  const filteredHistory = React.useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    return mockHistory.filter(
      (r) =>
        (historyFilter === 'all' || r.quality === historyFilter) &&
        (!q || `${r.code} ${r.service} ${r.customer}`.toLowerCase().includes(q)),
    );
  }, [historyQuery, historyFilter]);

  const historySummary = React.useMemo(() => {
    const total = filteredHistory.reduce((s, r) => s + parseNum(r.total), 0);
    const commission = filteredHistory.reduce((s, r) => s + parseNum(r.commission), 0);
    return { count: filteredHistory.length, total, commission };
  }, [filteredHistory]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Lịch sử dịch vụ</h2>
        <p className="text-[13px] text-on-surface-variant">
          Các lịch hẹn đã hoàn thành bởi {staffName}.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="border-r border-outline pr-3">
          <p className="text-xs text-on-surface-variant">Đã hoàn thành</p>
          <p className="mt-2 text-xl font-semibold text-on-surface">
            {historySummary.count}{' '}
            <span className="text-xs font-normal text-on-surface-variant">lịch hẹn</span>
          </p>
        </div>
        <div className="border-r border-outline pr-3">
          <p className="text-xs text-on-surface-variant">Tổng giá trị</p>
          <p className="mt-2 font-semibold text-on-surface">{formatVND(historySummary.total)}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">Hoa hồng nhận được</p>
          <p className="mt-2 font-semibold text-success">{formatVND(historySummary.commission)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-44 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
          <DashInput
            value={historyQuery}
            onChange={(e) => setHistoryQuery(e.target.value)}
            placeholder="Tìm mã, khách hàng, dịch vụ..."
            className="bg-surface-container-low pl-9 text-xs focus:bg-white"
          />
        </div>
        <DashSelect
          value={historyFilter}
          onValueChange={setHistoryFilter}
          triggerClassName="w-44"
          options={HISTORY_FILTER_OPTIONS}
        />
      </div>
      <DashTable
        columns={historyColumns}
        data={filteredHistory}
        getRowId={(r) => r.id}
        pagination={{
          page: 1,
          pageSize: 10,
          total: filteredHistory.length,
          itemLabel: 'lịch hẹn',
          onPageChange: () => {},
        }}
      />
    </div>
  );
}
