export type OrganizationInfo = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  tax_code: string | null;
  slogan: string | null;
  logo_url: string | null;
  timezone: string;
  status: string;
  is_demo: boolean;
};

export type WorkingHourDay = {
  weekday: number;
  is_open: boolean;
};

/** Khung giờ dùng chung; các mốc tính bằng số phút từ 00:00. */
export type WorkingHours = {
  open_time_minutes: number;
  close_time_minutes: number;
  break_start_minutes: number | null;
  break_end_minutes: number | null;
  days: WorkingHourDay[];
};

export type PayrollSettings = {
  start_day: number;
  standard_working_days: number;
  auto_draft_cutoff_day: number;
};

export type GeneralSettingsResponse = {
  organization: OrganizationInfo;
  working_hours: WorkingHours;
  payroll: PayrollSettings;
};

export type ReceiptSettings = {
  paper_size: string;
  auto_cut_paper: boolean;
  open_cash_drawer: boolean;
  show_logo: boolean;
  logo_url: string | null;
  header_text: string | null;
  show_branch_address: boolean;
  show_cashier_name: boolean;
  show_customer_info: boolean;
  mask_customer_phone: boolean;
  show_vietqr: boolean;
  footer_text: string | null;
  show_wifi_info: boolean;
  wifi_name: string | null;
  wifi_pass: string | null;
  auto_print_on_checkout: boolean;
  print_copy_count: number;
};

export type SettingPaymentMethod = {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_type: string;
  code: string;
  name: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
};

export type PaymentSettingsResponse = {
  receipt: ReceiptSettings;
  payment_methods: SettingPaymentMethod[];
};

export type BookingSettingsResponse = {
  allow_online_booking: boolean;
  auto_confirm: boolean;
  slot_step_minutes: number;
  max_per_slot: number;
  min_lead_minutes: number;
  max_advance_days: number;
  allow_cancel: boolean;
  cancel_before_hours: number;
  max_cancellations_per_month: number;
  allow_reschedule: boolean;
  reschedule_before_hours: number;
  deposit_enabled: boolean;
  no_show_threshold: number;
  no_show_lookback_days: number;
  deposit_percent: number;
  /** 0 = không giới hạn. */
  deposit_max_amount: number;
};

export type NotificationSettingsResponse = {
  appointment_reminder: boolean;
  new_booking_alert: boolean;
  low_stock_alert: boolean;
  daily_revenue_report: boolean;
  birthday_voucher: boolean;
  reminder_hours_before: number;
  low_stock_threshold: number;
  daily_report_time: string;
};
