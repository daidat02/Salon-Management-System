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
  staff_id: string;
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
