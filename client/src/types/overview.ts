export type OverviewKpi = {
  revenueToday: number;
  revenueChange: number;
  aovToday: number;
  aovChange: number;
  appointmentsToday: number;
  appointmentsPending: number;
  ordersToday: number;
  ordersUnpaid: number;
};

export type DailyRevenuePoint = {
  date: string;
  label: string;
  revenue: number;
  appointments: number;
};

export type LowStockProduct = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  safeLevel: number;
};

export type OverviewAppointment = {
  id: string;
  startTime: string;
  customerName: string;
  serviceSummary: string;
  staffName: string;
  status: string;
};

export type OverviewOrder = {
  id: string;
  code: string;
  customerName: string;
  summary: string;
  totalAmount: number;
  paymentStatus: 'paid' | 'unpaid';
};

export type OverviewData = {
  generatedAt: string;
  kpi: OverviewKpi;
  revenue7d: DailyRevenuePoint[];
  lowStock: LowStockProduct[];
  todayAppointments: OverviewAppointment[];
  recentOrders: OverviewOrder[];
};
