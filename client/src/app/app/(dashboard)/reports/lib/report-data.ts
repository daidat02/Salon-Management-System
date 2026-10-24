import {
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';

export type ReportRange = {
  from: Date;
  to: Date;
};

export type ReportKpi = {
  revenue: number;
  netProfit: number;
  operatingExpense: number;
  margin: number;
  revenueChange: number;
  netProfitChange: number;
  operatingExpenseChange: number;
  marginChange: number;
};

export type MonthlyReportPoint = {
  key: string;
  label: string;
  monthLabel: string;
  revenue: number;
  cogs: number;
  commission: number;
  operatingExpense: number;
  netProfit: number;
};

export type ProfitBreakdownItem = {
  id: string;
  label: string;
  amount: number;
  ratio: number;
  tone: 'revenue' | 'cost' | 'subtotal' | 'profit';
};

export type RevenueCompositionItem = {
  id: string;
  label: string;
  amount: number;
  ratio: number;
  color: string;
};

export type TopService = {
  id: string;
  name: string;
  category: string;
  turns: number;
  revenue: number;
  profit: number;
};

export type ReportData = {
  range: ReportRange;
  kpi: ReportKpi;
  monthly: MonthlyReportPoint[];
  annualYear: number;
  annualMonthly: MonthlyReportPoint[];
  profitBreakdown: ProfitBreakdownItem[];
  composition: RevenueCompositionItem[];
  topServices: TopService[];
};

export function formatCompactMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  return `${value.toLocaleString('vi-VN')} đ`;
}

type Totals = {
  revenue: number;
  cogs: number;
  commission: number;
  operatingExpense: number;
  netProfit: number;
};

const TOP_SERVICE_TEMPLATES = [
  {
    id: 'balayage',
    name: 'Nhuộm Balayage tông khói',
    category: 'Nhuộm',
    share: 0.26,
    turns: 38,
    margin: 0.39,
  },
  {
    id: 'cat-nam',
    name: 'Cắt tóc nam cao cấp',
    category: 'Cắt tóc',
    share: 0.18,
    turns: 142,
    margin: 0.46,
  },
  {
    id: 'cat-nu',
    name: 'Cắt tóc nữ tạo kiểu Layer',
    category: 'Cắt tóc',
    share: 0.15,
    turns: 65,
    margin: 0.45,
  },
  {
    id: 'uon-han',
    name: 'Uốn sóng lơi Hàn Quốc',
    category: 'Uốn tóc',
    share: 0.13,
    turns: 18,
    margin: 0.4,
  },
  {
    id: 'goi-spa',
    name: 'Gội đầu dưỡng sinh thảo dược',
    category: 'Spa',
    share: 0.11,
    turns: 52,
    margin: 0.47,
  },
] as const;

const COMPOSITION_COLORS = ['#4F7CAC', '#38BDF8', '#A78BFA'];

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

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seeded(seed: number, index: number): number {
  const value = Math.sin(seed + index * 9973) * 10000;
  return value - Math.floor(value);
}

function roundMoney(value: number): number {
  return Math.round(value / 1000) * 1000;
}

function rangeKey(range: ReportRange): string {
  return `${format(range.from, 'yyyyMMdd')}-${format(range.to, 'yyyyMMdd')}`;
}

function buildMonthlyPoints(
  range: ReportRange,
  seedKey: string,
  baseRevenueStart = 105_000_000,
): MonthlyReportPoint[] {
  const points: MonthlyReportPoint[] = [];
  let cursor = startOfMonth(range.from);
  const lastMonth = startOfMonth(range.to);
  let index = 0;

  while (cursor <= lastMonth && index < 36) {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const overlapStart = range.from > monthStart ? range.from : monthStart;
    const overlapEnd = range.to < monthEnd ? range.to : monthEnd;
    const overlapDays = Math.max(
      0,
      differenceInCalendarDays(overlapEnd, overlapStart) + 1,
    );
    const monthDays = differenceInCalendarDays(monthEnd, monthStart) + 1;
    const ratio = overlapDays / monthDays;

    const monthKey = format(cursor, 'yyyy-MM');
    const seed = hashSeed(`${seedKey}:${monthKey}`);
    const baseRevenue = baseRevenueStart + index * 4_500_000;
    const fullRevenue = roundMoney(baseRevenue + seeded(seed, 1) * 20_000_000);
    const fullCogs = roundMoney(fullRevenue * (0.2 + seeded(seed, 2) * 0.045));
    const fullCommission = roundMoney(
      fullRevenue * (0.1 + seeded(seed, 3) * 0.025),
    );
    const fullOperatingExpense = roundMoney(
      fullRevenue * (0.3 + seeded(seed, 4) * 0.055),
    );

    const revenue = roundMoney(fullRevenue * ratio);
    const cogs = roundMoney(fullCogs * ratio);
    const commission = roundMoney(fullCommission * ratio);
    const operatingExpense = roundMoney(fullOperatingExpense * ratio);
    const netProfit = revenue - cogs - commission - operatingExpense;

    points.push({
      key: monthKey,
      label: `Tháng ${format(cursor, 'M')}`,
      monthLabel: format(cursor, 'MM/yyyy'),
      revenue,
      cogs,
      commission,
      operatingExpense,
      netProfit,
    });

    cursor = addMonths(cursor, 1);
    index += 1;
  }

  return points;
}

function aggregate(points: MonthlyReportPoint[]): Totals {
  return points.reduce<Totals>(
    (totals, point) => ({
      revenue: totals.revenue + point.revenue,
      cogs: totals.cogs + point.cogs,
      commission: totals.commission + point.commission,
      operatingExpense: totals.operatingExpense + point.operatingExpense,
      netProfit: totals.netProfit + point.netProfit,
    }),
    {
      revenue: 0,
      cogs: 0,
      commission: 0,
      operatingExpense: 0,
      netProfit: 0,
    },
  );
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function marginOf(totals: Totals): number {
  return totals.revenue === 0 ? 0 : (totals.netProfit / totals.revenue) * 100;
}

function buildComposition(
  revenue: number,
  key: string,
): RevenueCompositionItem[] {
  const seed = hashSeed(`${key}:composition`);
  const serviceShare = 0.68 + seeded(seed, 1) * 0.08;
  const retailShare = 0.16 + seeded(seed, 2) * 0.06;
  const serviceAmount = roundMoney(revenue * serviceShare);
  const retailAmount = roundMoney(revenue * retailShare);
  const otherAmount = Math.max(0, revenue - serviceAmount - retailAmount);

  return [
    {
      id: 'service',
      label: 'Dịch vụ',
      amount: serviceAmount,
      ratio: revenue === 0 ? 0 : (serviceAmount / revenue) * 100,
      color: COMPOSITION_COLORS[0],
    },
    {
      id: 'retail',
      label: 'Bán lẻ',
      amount: retailAmount,
      ratio: revenue === 0 ? 0 : (retailAmount / revenue) * 100,
      color: COMPOSITION_COLORS[1],
    },
    {
      id: 'other',
      label: 'Khác',
      amount: otherAmount,
      ratio: revenue === 0 ? 0 : (otherAmount / revenue) * 100,
      color: COMPOSITION_COLORS[2],
    },
  ];
}

function buildTopServices(
  revenue: number,
  range: ReportRange,
  key: string,
): TopService[] {
  const seed = hashSeed(`${key}:services`);
  const daysInRange = Math.max(
    1,
    differenceInCalendarDays(range.to, range.from) + 1,
  );
  const dayFactor = Math.max(0.15, daysInRange / 30);

  return TOP_SERVICE_TEMPLATES.map((service, index) => {
    const revenueVariation = 0.9 + seeded(seed, index + 1) * 0.2;
    const turnsVariation = 0.9 + seeded(seed, index + 10) * 0.2;
    const serviceRevenue = roundMoney(revenue * service.share * revenueVariation);
    const turns = Math.max(
      1,
      Math.round(service.turns * dayFactor * turnsVariation),
    );
    const profit = roundMoney(
      serviceRevenue * (service.margin + seeded(seed, index + 20) * 0.04),
    );

    return {
      id: service.id,
      name: service.name,
      category: service.category,
      turns,
      revenue: serviceRevenue,
      profit,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function createReportData(range: ReportRange): ReportData {
  const key = rangeKey(range);
  const monthly = buildMonthlyPoints(range, key);
  const totals = aggregate(monthly);

  const annualYear = range.to.getFullYear();
  const annualMonthly = buildMonthlyPoints(
    {
      from: new Date(annualYear, 0, 1),
      to: new Date(annualYear, 11, 31),
    },
    `annual:${annualYear}`,
  );

  const daysInRange = Math.max(
    1,
    differenceInCalendarDays(range.to, range.from) + 1,
  );
  const previousTo = subDays(range.from, 1);
  const previousFrom = subDays(previousTo, daysInRange - 1);
  const previousTotals = aggregate(
    buildMonthlyPoints(
      { from: previousFrom, to: previousTo },
      `previous:${key}`,
      82_000_000,
    ),
  );

  const margin = marginOf(totals);
  const previousMargin = marginOf(previousTotals);
  const grossProfit = totals.revenue - totals.cogs - totals.commission;

  return {
    range,
    kpi: {
      revenue: totals.revenue,
      netProfit: totals.netProfit,
      operatingExpense: totals.operatingExpense,
      margin,
      revenueChange: percentChange(totals.revenue, previousTotals.revenue),
      netProfitChange: percentChange(
        totals.netProfit,
        previousTotals.netProfit,
      ),
      operatingExpenseChange: percentChange(
        totals.operatingExpense,
        previousTotals.operatingExpense,
      ),
      marginChange: margin - previousMargin,
    },
    monthly,
    annualYear,
    annualMonthly,
    profitBreakdown: [
      {
        id: 'revenue',
        label: 'Doanh thu',
        amount: totals.revenue,
        ratio: 100,
        tone: 'revenue',
      },
      {
        id: 'cogs',
        label: 'Giá vốn vật tư',
        amount: totals.cogs,
        ratio: totals.revenue === 0 ? 0 : (totals.cogs / totals.revenue) * 100,
        tone: 'cost',
      },
      {
        id: 'commission',
        label: 'Hoa hồng nhân viên',
        amount: totals.commission,
        ratio:
          totals.revenue === 0 ? 0 : (totals.commission / totals.revenue) * 100,
        tone: 'cost',
      },
      {
        id: 'gross',
        label: 'Lợi nhuận gộp',
        amount: grossProfit,
        ratio: totals.revenue === 0 ? 0 : (grossProfit / totals.revenue) * 100,
        tone: 'subtotal',
      },
      {
        id: 'opex',
        label: 'Chi phí vận hành',
        amount: totals.operatingExpense,
        ratio:
          totals.revenue === 0
            ? 0
            : (totals.operatingExpense / totals.revenue) * 100,
        tone: 'cost',
      },
      {
        id: 'net',
        label: 'Lợi nhuận thuần',
        amount: totals.netProfit,
        ratio: margin,
        tone: 'profit',
      },
    ],
    composition: buildComposition(totals.revenue, key),
    topServices: buildTopServices(totals.revenue, range, key),
  };
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
