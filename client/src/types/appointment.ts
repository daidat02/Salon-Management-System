export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type AppointmentSource = 'online' | 'walk_in' | 'phone';

export type DepositStatus = 'none' | 'pending' | 'paid' | 'refunded' | 'waived' | 'failed';

/** Mirror server domain.Appointment (snake_case, NULL đã chuẩn hóa thành ""). */
export interface Appointment {
  id: string;
  organization_id: string;
  code: string;
  customer_id: string;
  /** Có trong response list/detail (server join từ bảng customers). */
  customer_name?: string;
  customer_phone?: string;
  staff_id: string;
  /** Có trong response list/detail (server join từ bảng staff). */
  staff_name?: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  total_amount: number;
  note: string;
  cancel_reason: string;
  device_id: string;
  client_ip: string;
  required_deposit_amount: number;
  deposit_status: DepositStatus;
  created_at: string;
  updated_at: string;
}

export type AppointmentItemType = 'service' | 'product';

export interface AppointmentItem {
  id: string;
  organization_id: string;
  appointment_id: string;
  item_type: AppointmentItemType;
  service_id: string | null;
  product_id: string | null;
  /** Có trong response chi tiết (server join từ bảng services). */
  service_name?: string | null;
  /** Có trong response chi tiết (server join từ bảng products). */
  product_name?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface AppointmentDetail {
  appointment: Appointment;
  items: AppointmentItem[];
}

/** Một ngày trong lịch tuần (server luôn trả đủ 7 ngày, kể cả ngày trống). */
export interface WeekDaySchedule {
  /** YYYY-MM-DD */
  date: string;
  weekday: string;
  total: number;
  appointments: Appointment[];
}

export interface WeeklySchedule {
  /** YYYY-MM-DD */
  week_start: string;
  /** YYYY-MM-DD */
  week_end: string;
  total: number;
  days: WeekDaySchedule[];
}
