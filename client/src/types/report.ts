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
