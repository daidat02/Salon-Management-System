export type OrderStatus =
  | 'pending'
  | 'confirm'
  | 'delivery'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface Order {
  id: string;
  organization_id: string;
  code: string;
  customer_id: string | null;
  appointment_id: string | null;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  /** Tóm tắt dịch vụ/sản phẩm, chốt lúc thanh toán thành công. */
  description: string;
  status: OrderStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface OrderItemStaff {
  id: string;
  staff_id: string | null;
  full_name: string | null;
  type: 'percent' | 'fixed' | 'profit';
  share_pct: number;
  commission_amount: number;
}

export interface OrderDetailItem {
  id: string;
  item_type: 'service' | 'product';
  service_id: string | null;
  product_id: string | null;
  staff_id: string | null;
  quantity: number;
  /** Đơn vị của quantity (đơn vị lớn của SP, null với dòng dịch vụ). */
  unit?: string | null;
  unit_price: number;
  line_total: number;
  /** NV thực hiện do server join sẵn (có thể vắng khi đơn cũ). */
  staff?: OrderItemStaff[] | null;
}

export interface OrderDetailMaterial {
  id: string;
  order_item_id: string;
  product_id: string;
  quantity: number;
  unit_cost_at_time: number;
  /** Đơn vị của quantity (server trả kèm từ order_item_materials.unit). */
  unit?: string | null;
}

export interface OrderDetailPayment {
  id: string;
  order_id: string;
  method: string;
  provider: string | null;
  provider_txn_id: string | null;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string | null;
}

export interface OrderDetail {
  order: Order;
  items: OrderDetailItem[];
  materials: OrderDetailMaterial[];
  payments: OrderDetailPayment[];
  /** Hoa hồng do server tính lúc gán NV (client render trực tiếp, không tự tính). */
  commissions: OrderDetailCommission[];
}

export interface OrderDetailCommission {
  staff_id: string;
  full_name: string;
  type: 'percent' | 'fixed' | 'profit';
  share_pct: number;
  amount: number;
  order_item_id: string;
}
