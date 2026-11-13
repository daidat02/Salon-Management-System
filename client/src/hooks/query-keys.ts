// Nguồn sự thật duy nhất cho query key của React Query.
// Key phân cấp: [entity, nhánh, ...tham số] để invalidate theo prefix.
// Quy ước namespace số ít; list key đặt dưới nhánh 'list', detail dưới 'detail'.

export const queryKeys = {
  staff: {
    all: ['staff'] as const,
    lists: () => ['staff', 'list'] as const,
    list: <P>(params: P) => ['staff', 'list', params] as const,
    details: () => ['staff', 'detail'] as const,
    detail: (id?: string | null) => ['staff', 'detail', id] as const,
    leaves: (id?: string | null) => ['staff', 'leave', id] as const,
    payrolls: () => ['staff', 'payroll'] as const,
    payrollByStaff: (id?: string | null) => ['staff', 'payroll', id] as const,
    payroll: (id?: string | null, periodMonth?: string) =>
      ['staff', 'payroll', id, periodMonth] as const,
    salaryAdjustments: () => ['staff', 'salary-adjustment'] as const,
    salaryAdjustment: (id?: string | null, periodMonth?: string | null) =>
      ['staff', 'salary-adjustment', id, periodMonth] as const,
    serviceHistory: <P>(id?: string | null, params?: P) =>
      ['staff', 'service-history', id, params] as const,
  },

  customer: {
    all: ['customer'] as const,
    lists: () => ['customer', 'list'] as const,
    list: <P>(params: P) => ['customer', 'list', params] as const,
    details: () => ['customer', 'detail'] as const,
    detail: <P>(id?: string | null, params?: P) => ['customer', 'detail', id, params] as const,
    stats: () => ['customer', 'stats'] as const,
  },

  category: {
    all: ['category'] as const,
    lists: () => ['category', 'list'] as const,
    list: <P>(params: P) => ['category', 'list', params] as const,
  },

  service: {
    all: ['service'] as const,
    lists: () => ['service', 'list'] as const,
    list: <P>(params: P) => ['service', 'list', params] as const,
    details: () => ['service', 'detail'] as const,
    detail: (id?: string | null) => ['service', 'detail', id] as const,
    stats: () => ['service', 'stats'] as const,
  },

  product: {
    all: ['product'] as const,
    lists: () => ['product', 'list'] as const,
    list: <P>(params: P) => ['product', 'list', params] as const,
    details: () => ['product', 'detail'] as const,
    detail: (id?: string | null) => ['product', 'detail', id] as const,
    stats: () => ['product', 'stats'] as const,
    materials: () => ['product', 'material'] as const,
  },

  supplier: {
    all: ['supplier'] as const,
    lists: () => ['supplier', 'list'] as const,
    list: <P>(params: P) => ['supplier', 'list', params] as const,
  },

  appointment: {
    all: ['appointment'] as const,
    lists: () => ['appointment', 'list'] as const,
    list: <P>(params: P) => ['appointment', 'list', params] as const,
    details: () => ['appointment', 'detail'] as const,
    detail: (id?: string | null) => ['appointment', 'detail', id] as const,
    weekly: (weekStart: string) => ['appointment', 'weekly', weekStart] as const,
  },

  order: {
    all: ['order'] as const,
    lists: () => ['order', 'list'] as const,
    list: <P>(params: P) => ['order', 'list', params] as const,
    cashier: () => ['order', 'list', 'cashier'] as const,
    active: () => ['order', 'list', 'active'] as const,
    details: () => ['order', 'detail'] as const,
    detail: (id?: string | null) => ['order', 'detail', id] as const,
    stats: () => ['order', 'stats'] as const,
    posItems: <P>(params: P) => ['order', 'pos-item', params] as const,
  },

  cashflow: {
    all: ['cashflow'] as const,
    lists: () => ['cashflow', 'list'] as const,
    list: <P>(params: P) => ['cashflow', 'list', params] as const,
    stats: <P>(params: P) => ['cashflow', 'stats', params] as const,
    categories: (kind?: string) => ['cashflow', 'category', { kind }] as const,
    chart: <P>(params: P) => ['cashflow', 'chart', params] as const,
    categoryExpense: <P>(params: P) => ['cashflow', 'category-expense', params] as const,
    funds: (activeOnly = true) => ['cashflow', 'fund', { activeOnly }] as const,
    fundMovement: () => ['cashflow', 'fund-movement'] as const,
  },

  inventory: {
    all: ['inventory'] as const,
    lists: () => ['inventory', 'list'] as const,
    list: <P>(params: P) => ['inventory', 'list', params] as const,
    details: () => ['inventory', 'detail'] as const,
    detail: (id?: string | null) => ['inventory', 'detail', id] as const,
    stats: () => ['inventory', 'stats'] as const,
    transactions: <P>(params: P) => ['inventory', 'transaction', params] as const,
  },

  settings: {
    all: ['settings'] as const,
    bySection: (section: 'general' | 'booking' | 'payment' | 'notifications') =>
      ['settings', section] as const,
  },

  report: {
    all: ['report'] as const,
    revenue: <P>(params: P) => ['report', 'revenue', params] as const,
    overview: () => ['report', 'overview'] as const,
  },
};
