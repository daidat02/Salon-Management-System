import type {
  DailyRevenuePoint,
  LowStockProduct,
  OverviewAppointment,
  OverviewData,
  OverviewKpi,
  OverviewOrder,
} from '@/types/overview';
import { ApiResponse } from '@/types/response';
import { API_ENDPOINTS } from '@/constants';
import apiClient from './apiClient';

type OverviewApi = {
  generated_at: string;
  kpi: {
    revenue_today: number;
    revenue_change: number;
    aov_today: number;
    aov_change: number;
    appointments_today: number;
    appointments_pending: number;
    orders_today: number;
    orders_unpaid: number;
  };
  revenue_7d: Array<{
    date: string;
    label: string;
    revenue: number;
    appointments: number;
  }>;
  low_stock: Array<{
    id: string;
    name: string;
    unit: string;
    stock: number;
    safe_level: number;
  }>;
  today_appointments: Array<{
    id: string;
    start_time: string;
    customer_name: string;
    service_summary: string;
    staff_name: string;
    status: string;
  }>;
  recent_orders: Array<{
    id: string;
    code: string;
    customer_name: string;
    summary: string;
    total_amount: number;
    payment_status: 'paid' | 'unpaid';
  }>;
};

function mapKpi(kpi: OverviewApi['kpi']): OverviewKpi {
  return {
    revenueToday: kpi.revenue_today,
    revenueChange: kpi.revenue_change,
    aovToday: kpi.aov_today,
    aovChange: kpi.aov_change,
    appointmentsToday: kpi.appointments_today,
    appointmentsPending: kpi.appointments_pending,
    ordersToday: kpi.orders_today,
    ordersUnpaid: kpi.orders_unpaid,
  };
}

function mapRevenue7d(points: OverviewApi['revenue_7d']): DailyRevenuePoint[] {
  return points.map((point) => ({ ...point }));
}

function mapLowStock(items: OverviewApi['low_stock']): LowStockProduct[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    stock: item.stock,
    safeLevel: item.safe_level,
  }));
}

function mapAppointments(
  items: OverviewApi['today_appointments'],
): OverviewAppointment[] {
  return items.map((item) => ({
    id: item.id,
    startTime: item.start_time,
    customerName: item.customer_name,
    serviceSummary: item.service_summary,
    staffName: item.staff_name,
    status: item.status,
  }));
}

function mapOrders(items: OverviewApi['recent_orders']): OverviewOrder[] {
  return items.map((item) => ({
    id: item.id,
    code: item.code,
    customerName: item.customer_name,
    summary: item.summary,
    totalAmount: item.total_amount,
    paymentStatus: item.payment_status,
  }));
}

function mapOverview(data: OverviewApi): OverviewData {
  return {
    generatedAt: data.generated_at,
    kpi: mapKpi(data.kpi),
    revenue7d: mapRevenue7d(data.revenue_7d),
    lowStock: mapLowStock(data.low_stock),
    todayAppointments: mapAppointments(data.today_appointments),
    recentOrders: mapOrders(data.recent_orders),
  };
}

export const getOverview = async () => {
  const res = await apiClient.get<ApiResponse<OverviewApi>>(
    API_ENDPOINTS.ANALYTICS.GET_OVERVIEW,
  );

  return mapOverview(res.data.data);
};
