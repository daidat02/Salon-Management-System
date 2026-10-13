import type { Appointment } from './appointment';
import type { Order } from './order';
import type { PaginationResult } from './response';

export interface Customer {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  birth_date: string | null;
  note: string;
  total_spent: number;
  total_visits: number;
  reward_points: number;
  is_flagged_risk: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SpendByMonth {
  month: string;
  total_spent: number;
  total_orders: number;
}

export interface CustomerDetails {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string;
  gender: string;
  birth_date: string | null;
  note: string;
  total_spent: number;
  total_visits: number;
  reward_points: number;
  is_flagged_risk: boolean;
  total_cancelled_appointments: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  spending_by_month: SpendByMonth[];
}

export interface CustomerStats {
  total_customer: number;
  total_new_customer: number;
  total_new_customer_last_month: number;
  total_outstanding_points: number;
}

export interface CustomerDetailResponse {
  customer: CustomerDetails;
  appointments: PaginationResult<Appointment>;
  orders: PaginationResult<Order>;
}
