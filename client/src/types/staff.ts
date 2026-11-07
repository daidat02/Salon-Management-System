export type StaffGender = 'male' | 'female' | 'other';
export type StaffEmploymentType = 'fulltime' | 'parttime';

export interface StaffPayroll {
  staff_id: string;
  date_from: string;
  date_to: string;
  base_salary: number;
  standard_working_days: number;
  total_leave_days: number;
  actual_working_days: number;
  prorated_base_salary: number;
  bonus_amount: number;
  adjustment_deduction: number;
  penalty_amount: number;
  advance_amount: number;
  total_deduction: number;
  total_orders: number;
  total_items: number;
  total_commission: number;
  total_amount_value: number;
  net_pay: number;
}

export interface StaffServiceHistorySummary {
  total_orders: number;
  total_items: number;
  total_commission: number;
  total_amount_value: number;
}

export interface StaffServiceHistoryItem {
  id: string;
  order_id: string;
  order_item_id: string;
  order_code: string;
  customer_name: string;
  service_name: string;
  line_total: number;
  commission_amount: number;
  type: 'percent' | 'fixed' | 'profit';
  share_pct: number;
  created_at: string;
}

export interface StaffServiceHistoryResponse {
  summary: StaffServiceHistorySummary;
  data: StaffServiceHistoryItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export type StaffSalaryAdjustmentType = 'ALLOWANCE' | 'DEDUCTION';

export interface StaffSalaryAdjustment {
  id: string;
  organization_id: string;
  staff_id: string;
  payroll_id: string | null;
  adjustment_type: StaffSalaryAdjustmentType;
  amount: number;
  reason: string;
  effective_date: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface Staff {
  id: string;
  organization_id: string;
  code: string;
  full_name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  gender: StaffGender | '';
  address: string;
  position: string;
  employment_type: StaffEmploymentType | '';
  commission_rate: number;
  base_salary: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  status: 'active' | 'inactive';
  hire_date: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export type StaffLeaveType = 'ANNUAL' | 'EXCUSED' | 'LATE';

export interface StaffLeave {
  id: string;
  organization_id: string;
  staff_id: string;
  leave_type: StaffLeaveType;
  start_date: string;
  end_date: string;
  note: string;
  created_at: string | null;
  updated_at: string | null;
}
