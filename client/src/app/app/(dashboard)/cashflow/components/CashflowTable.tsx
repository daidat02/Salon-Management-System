'use client';

import * as React from 'react';
import DashTable from '@/components/dashboard/DashTable';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { formatVND } from '@/lib/format';
import { buildCashflowColumns } from './columns';
import type { CashflowVoucher } from './types';

const PAGE_SIZE = 8;

function getPageItems(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 'ellipsis', totalPages];
  if (current >= totalPages - 2) return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages];
}

type CashflowTableProps = {
  rows: CashflowVoucher[];
  page: number;
  onPageChange: (page: number) => void;
};

export default function CashflowTable({ rows, page, onPageChange }: CashflowTableProps) {
  const columns = React.useMemo(() => buildCashflowColumns(), []);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const displayed = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageThu = displayed.filter((r) => r.type === 'thu').reduce((s, r) => s + r.amount, 0);
  const pageChi = displayed.filter((r) => r.type === 'chi').reduce((s, r) => s + r.amount, 0);

  const from = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, rows.length);

  return (
    <DashTable
      columns={columns}
      data={displayed}
      getRowId={(r) => r.id}
      emptyText="Không tìm thấy phiếu thu chi nào"
      footer={
        <div className="w-full space-y-0">
          <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-outline bg-surface-container px-6 py-2.5 text-xs">
            <span className="font-medium text-on-surface-variant">Tổng trang này:</span>
            <div className="flex items-center gap-6 font-semibold">
              <span className="text-success">Thu: +{formatVND(pageThu)}</span>
              <span className="text-error">Chi: -{formatVND(pageChi)}</span>
              <span className="rounded bg-primary-container px-2.5 py-0.5 text-primary">
                Chênh lệch ròng: {pageThu - pageChi >= 0 ? '+' : '-'}
                {formatVND(Math.abs(pageThu - pageChi))}
              </span>
            </div>
          </div>
          <div className="flex w-full flex-col items-center justify-between gap-3 px-6 py-3.5 text-xs text-on-surface-variant sm:flex-row">
            <div>
              Hiển thị <span className="font-semibold text-on-surface">{from} - {to}</span> trong
              tổng số <span className="font-semibold text-on-surface">{rows.length}</span> phiếu thu
              chi
            </div>
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (safePage > 1) onPageChange(safePage - 1);
                    }}
                    aria-disabled={safePage <= 1}
                    className={safePage <= 1 ? 'pointer-events-none opacity-40' : ''}
                    text="Trang trước"
                  />
                </PaginationItem>
                {getPageItems(safePage, totalPages).map((item, idx) =>
                  item === 'ellipsis' ? (
                    <PaginationItem key={`e-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href="#"
                        isActive={item === safePage}
                        onClick={(e) => {
                          e.preventDefault();
                          onPageChange(item);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (safePage < totalPages) onPageChange(safePage + 1);
                    }}
                    aria-disabled={safePage >= totalPages}
                    className={safePage >= totalPages ? 'pointer-events-none opacity-40' : ''}
                    text="Trang sau"
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      }
    />
  );
}
