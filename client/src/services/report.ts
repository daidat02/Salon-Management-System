import type {
  MonthlyReportPoint,
  ProfitBreakdownItem,
  ReportData,
  ReportKpi,
  RevenueCompositionItem,
  TopService,
} from '@/types/report';
import { ApiResponse } from '@/types/response';
import { API_ENDPOINTS } from '@/constants';
import apiClient from './apiClient';

type MonthlyPointApi = {
  key: string;
  label: string;
  month_label: string;
  revenue: number;
  cogs: number;
  commission: number;
  operating_expense: number;
  net_profit: number;
};

type RevenueReportApi = {
  range: {
    from: string;
    to: string;
  };
  kpi: {
    revenue: number;
    net_profit: number;
    operating_expense: number;
    margin: number;
    revenue_change: number;
    net_profit_change: number;
    operating_expense_change: number;
    margin_change: number;
  };
  monthly: MonthlyPointApi[];
  annual_year: number;
  annual_monthly: MonthlyPointApi[];
  profit_breakdown: Array<{
    id: string;
    label: string;
    amount: number;
    ratio: number;
  }>;
  composition: Array<{
    id: string;
    label: string;
    amount: number;
    ratio: number;
  }>;
  top_services: Array<{
    id: string;
    name: string;
    category: string;
    turns: number;
    revenue: number;
    profit: number;
  }>;
};

const TONES: Record<string, ProfitBreakdownItem['tone']> = {
  revenue: 'revenue',
  cogs: 'cost',
  commission: 'cost',
  gross: 'subtotal',
  opex: 'cost',
  net: 'profit',
};

const COMPOSITION_COLORS: Record<string, string> = {
  service: '#4F7CAC',
  retail: '#38BDF8',
  other: '#A78BFA',
};

function mapMonthlyPoint(point: MonthlyPointApi): MonthlyReportPoint {
  return {
    key: point.key,
    label: point.label,
    monthLabel: point.month_label,
    revenue: point.revenue,
    cogs: point.cogs,
    commission: point.commission,
    operatingExpense: point.operating_expense,
    netProfit: point.net_profit,
  };
}

function mapKpi(kpi: RevenueReportApi['kpi']): ReportKpi {
  return {
    revenue: kpi.revenue,
    netProfit: kpi.net_profit,
    operatingExpense: kpi.operating_expense,
    margin: kpi.margin,
    revenueChange: kpi.revenue_change,
    netProfitChange: kpi.net_profit_change,
    operatingExpenseChange: kpi.operating_expense_change,
    marginChange: kpi.margin_change,
  };
}

function mapProfitBreakdown(
  items: RevenueReportApi['profit_breakdown'],
): ProfitBreakdownItem[] {
  return items.map((item) => ({
    ...item,
    tone: TONES[item.id] ?? 'cost',
  }));
}

function mapComposition(
  items: RevenueReportApi['composition'],
): RevenueCompositionItem[] {
  return items.map((item) => ({
    ...item,
    color: COMPOSITION_COLORS[item.id] ?? '#94A3B8',
  }));
}

function mapTopServices(items: RevenueReportApi['top_services']): TopService[] {
  return items.map((item) => ({ ...item }));
}

function mapReport(data: RevenueReportApi): ReportData {
  return {
    range: {
      from: new Date(data.range.from),
      to: new Date(data.range.to),
    },
    kpi: mapKpi(data.kpi),
    monthly: data.monthly.map(mapMonthlyPoint),
    annualYear: data.annual_year,
    annualMonthly: data.annual_monthly.map(mapMonthlyPoint),
    profitBreakdown: mapProfitBreakdown(data.profit_breakdown),
    composition: mapComposition(data.composition),
    topServices: mapTopServices(data.top_services),
  };
}

export const getRevenueReport = async ({
  dateFrom,
  dateTo,
}: {
  dateFrom?: string | null;
  dateTo?: string | null;
}) => {
  const res = await apiClient.get<ApiResponse<RevenueReportApi>>(
    API_ENDPOINTS.REPORTS.GET_REVENUE,
    {
      params: {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      },
    },
  );

  return mapReport(res.data.data);
};
