export interface Service {
  id: string;
  organization_id: string;
  category_id: string;
  category_name: string | null;
  name: string;
  description: string;
  duration_minutes: number;
  buffer_minutes: number;
  price: number;
  is_active: boolean;
  sold_this_month: number;
  revenue_this_month: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceStats {
  total_services: number;
  active_services: number;
  inactive_services: number;
  service_revenue_month: number;
}

export interface ServiceMaterial {
  id: string;
  organization_id: string;
  service_id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  quantity: number;
  unit: string | null;
  cost_price: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceMonthlyRevenue {
  month: string;
  revenue: number;
}

export interface ServiceDetail extends Service {
  bookings_this_month: number;
  completed_this_month: number;
  material_cost_this_month: number;
  revenue_last_6_months: ServiceMonthlyRevenue[];
}

export interface ServiceDetailResult {
  service: ServiceDetail;
  materials: ServiceMaterial[];
}
