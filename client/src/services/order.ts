import { Order, OrderDetail, OrderDetailPayment } from '@/types/order';
import { PosItem, PosItemsParams } from '@/types/pos';
import { ApiResponse, PaginationResult } from '@/types/response';
import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/constants';
const ORDERS_ENDPOINT = API_ENDPOINTS.ORDERS;

// API đơn hàng trả entity Go không có json tag (keys PascalCase),
// map về shape chuẩn của app tại đây.
type RawOrder = {
  ID: string;
  OrganizationID: string;
  Code: string;
  CustomerID: string | null;
  AppointmentID: string | null;
  SubtotalAmount: number;
  DiscountAmount: number;
  TotalAmount: number;
  Status: Order['status'];
  CreatedAt: string | null;
  UpdatedAt: string | null;
};

function mapOrder(raw: RawOrder): Order {
  return {
    id: raw.ID,
    organization_id: raw.OrganizationID,
    code: raw.Code,
    customer_id: raw.CustomerID,
    appointment_id: raw.AppointmentID,
    subtotal_amount: raw.SubtotalAmount,
    discount_amount: raw.DiscountAmount,
    total_amount: raw.TotalAmount,
    status: raw.Status,
    created_at: raw.CreatedAt,
    updated_at: raw.UpdatedAt,
  };
}
export const getOrderDetail = async (id: string) => {
  const res = await apiClient.get<ApiResponse<OrderDetail>>(
    `${ORDERS_ENDPOINT.GET_ORDER_DETAIL(id)}`,
  );

  const detail = res.data.data;
  return {
    ...detail,
    items: detail.items || [],
    materials: detail.materials || [],
    payments: detail.payments || [],
  };
};

export type CreateOrderItemPayload = {
  item_type: 'service' | 'product';
  service_id?: string | null;
  product_id?: string | null;
  staff_id?: string | null;
  quantity: number;
};

export type CreateOrderPayload = {
  customer_id?: string | null;
  appointment_id?: string | null;
  discount_amount?: number;
  items: CreateOrderItemPayload[];
  /** Khách mới tại POS — server tự tìm theo SĐT, chưa có thì tạo mới. */
  new_customer?: { full_name: string; phone: string };
};

// POST /orders trả OrderResponse key thường (khác shape PascalCase của GET list).
type RawCreatedOrder = {
  id: string;
  organization_id: string;
  code: string;
  customer_id: string | null;
  appointment_id: string | null;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  status: Order['status'];
  created_at: string | null;
  updated_at: string | null;
  customer_name?: string | null;
  customer_reused?: boolean;
};

export type CreatedOrder = Order & { customer_name?: string | null; customer_reused?: boolean };

export const createOrder = async (payload: CreateOrderPayload): Promise<CreatedOrder> => {
  const res = await apiClient.post<ApiResponse<RawCreatedOrder>>(ORDERS_ENDPOINT.CREATE_ORDER, {
    customer_id: payload.customer_id ?? null,
    appointment_id: payload.appointment_id ?? null,
    discount_amount: payload.discount_amount ?? 0,
    new_customer: payload.new_customer ?? undefined,
    items: payload.items.map((it) => ({
      item_type: it.item_type,
      service_id: it.service_id ?? null,
      product_id: it.product_id ?? null,
      staff_id: it.staff_id ?? null,
      quantity: it.quantity,
      materials: [],
    })),
  });

  const o = res.data.data;
  const order: CreatedOrder = {
    id: o.id,
    organization_id: o.organization_id,
    code: o.code,
    customer_id: o.customer_id,
    appointment_id: o.appointment_id,
    subtotal_amount: o.subtotal_amount,
    discount_amount: o.discount_amount,
    total_amount: o.total_amount,
    status: o.status,
    created_at: o.created_at,
    updated_at: o.updated_at,
    customer_name: o.customer_name ?? null,
    customer_reused: o.customer_reused ?? false,
  };
  return order;
};
export const getPosItems = async ({
  search,
  category,
  cursorType,
  cursorName,
  cursorId,
  pageSize,
}: PosItemsParams = {}) => {
  const res = await apiClient.get<ApiResponse<PosItem[]>>(ORDERS_ENDPOINT.GET_POS_ITEMS, {
    params: {
      search: search || undefined,
      category: category || undefined,
      type: cursorType || undefined,
      name: cursorName || undefined,
      id: cursorId || undefined,
      page_size: pageSize,
    },
  });

  return res.data.data || [];
};

export const getOrdersByOrgID = async ({
  status,
  page,
  pageSize,
}: {
  status?: string;
  page: number;
  pageSize: number;
}) => {
  const res = await apiClient.get<ApiResponse<PaginationResult<Order>>>(
    ORDERS_ENDPOINT.GET_ORDERS,
    {
      params: {
        status: status || undefined,
        page: page,
        page_size: pageSize,
      },
    },
  );

  const data = res.data.data;
  return data;
};

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'gateway';

export type CreatePaymentPayload = {
  method: PaymentMethod;
  provider?: string | null;
  provider_txn_id?: string | null;
  amount: number;
};

export type ItemStaffType = 'percent' | 'fixed' | 'profit';

export type SaveItemStaffPayload = {
  staff_id: string;
  type: ItemStaffType;
  share_pct: number;
  commission_amount: number;
};

/** Gán lại toàn bộ NV thực hiện cho 1 dòng đơn (replace). */
export const saveItemStaff = async (orderItemId: string, staffs: SaveItemStaffPayload[]) => {
  const res = await apiClient.post<ApiResponse<unknown[]>>(
    `${ORDERS_ENDPOINT.SAVE_ITEMS_STAFF(orderItemId)}`,
    staffs.map((s) => ({
      staff_id: s.staff_id,
      type: s.type,
      share_pct: s.share_pct,
      commission_amount: s.commission_amount,
    })),
  );
  return res.data.data;
};

export type SaveOrderMaterialPayload = {
  order_item_id: string;
  product_id: string;
  /** Số lượng theo đơn vị hiển thị (server tự quy về đơn vị nhỏ nhất). */
  quantity: number;
  /** Đơn vị của quantity (rỗng = đơn vị lớn của SP). */
  unit?: string;
};

/** Gán lại toàn bộ vật tư các đơn (replace theo scope đơn suy từ dòng). */
export const saveOrderMaterials = async (materials: SaveOrderMaterialPayload[]) => {
  const res = await apiClient.post<ApiResponse<unknown[]>>(
    `${ORDERS_ENDPOINT.SAVE_ORDER_MATERIALS}`,
    materials.map((m) => ({
      order_item_id: m.order_item_id,
      product_id: m.product_id,
      quantity: m.quantity,
      unit: m.unit ?? null,
    })),
  );
  return res.data.data;
};

export type UpdateOrderCustomerPayload = {
  customer_id?: string | null;
  new_customer?: { full_name: string; phone: string } | null;
};

/** Gán/đổi khách hàng cho đơn chưa khóa (pending/confirm/delivery). */
export const updateOrderCustomer = async (orderId: string, payload: UpdateOrderCustomerPayload) => {
  const res = await apiClient.patch<ApiResponse<CreatedOrder>>(
    `${ORDERS_ENDPOINT.UPDATE_ORDER_CUSTOMER(orderId)}`,
    {
      customer_id: payload.customer_id ?? null,
      new_customer: payload.new_customer ?? null,
    },
  );
  return res.data.data;
};

export const createPayment = async (orderId: string, payload: CreatePaymentPayload) => {
  const res = await apiClient.post<ApiResponse<OrderDetailPayment>>(
    ORDERS_ENDPOINT.CREATE_PAYMENT(orderId),
    {
      method: payload.method,
      provider: payload.provider ?? null,
      provider_txn_id: payload.provider_txn_id ?? null,
      amount: payload.amount,
    },
  );
  return res.data.data;
};
