import { endOfDay, endOfMonth, format, startOfDay, startOfMonth } from 'date-fns';
import type { ReportData, ReportRange } from '@/types/report';

function parseDateParam(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function resolveReportRange(
  dateFrom?: string | null,
  dateTo?: string | null,
): ReportRange {
  const parsedFrom = parseDateParam(dateFrom);
  const parsedTo = parseDateParam(dateTo);

  if (!parsedFrom && !parsedTo) {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  }

  let from = parsedFrom ?? startOfMonth(parsedTo as Date);
  let to = parsedTo ?? endOfMonth(parsedFrom as Date);

  from = startOfDay(from);
  to = endOfDay(to);

  if (from > to) {
    const nextFrom = startOfDay(to);
    to = endOfDay(from);
    from = nextFrom;
  }

  return { from, to };
}

export function formatCompactMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  return `${value.toLocaleString('vi-VN')} đ`;
}

function escapeCsvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildReportCsv(data: ReportData): string {
  const rows: (string | number)[][] = [
    ['Báo cáo doanh thu & lợi nhuận'],
    ['Từ ngày', format(data.range.from, 'dd/MM/yyyy')],
    ['Đến ngày', format(data.range.to, 'dd/MM/yyyy')],
    [],
    ['Chỉ số', 'Giá trị'],
    ['Tổng doanh thu', data.kpi.revenue],
    ['Lợi nhuận thuần', data.kpi.netProfit],
    ['Chi phí vận hành', data.kpi.operatingExpense],
    ['Tỷ suất lợi nhuận (%)', data.kpi.margin.toFixed(1)],
    [],
    ['Phân rã lợi nhuận'],
    ['Khoản mục', 'Số tiền', 'Tỷ trọng doanh thu (%)'],
    ...data.profitBreakdown.map((item) => [
      item.label,
      item.amount,
      item.ratio.toFixed(1),
    ]),
    [],
    ['Cơ cấu doanh thu'],
    ['Nhóm doanh thu', 'Số tiền', 'Tỷ trọng (%)'],
    ...data.composition.map((item) => [
      item.label,
      item.amount,
      item.ratio.toFixed(1),
    ]),
    [],
    ['Top dịch vụ'],
    ['Dịch vụ', 'Nhóm', 'Số lượt', 'Doanh thu', 'Lợi nhuận'],
    ...data.topServices.map((service) => [
      service.name,
      service.category,
      service.turns,
      service.revenue,
      service.profit,
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function downloadReportCsv(data: ReportData): void {
  if (typeof window === 'undefined') return;

  const csv = `\uFEFF${buildReportCsv(data)}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bao-cao-doanh-thu_${format(data.range.from, 'yyyyMMdd')}-${format(
    data.range.to,
    'yyyyMMdd',
  )}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
