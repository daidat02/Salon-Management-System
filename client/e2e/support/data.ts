import type { ApiClient } from './api';

export const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function tag(prefix: string): string {
  return `${prefix}-${RUN_ID}-${Math.random().toString(36).slice(2, 6)}`;
}

export function uniquePhone(): string {
  const digits = `${Date.now()}${Math.floor(Math.random() * 1000)}`.replace(/\D/g, '');
  return `09${digits.slice(-8)}`;
}

function isoAt(daysFromNow: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mi = String(minute).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00+07:00`;
}

type Id = { id: string };

export function createCustomer(api: ApiClient, overrides: Record<string, unknown> = {}) {
  return api.post<Id & Record<string, unknown>>('/customers', {
    full_name: `Khách E2E ${RUN_ID}`,
    phone: uniquePhone(),
    gender: 'female',
    note: 'Tạo bởi E2E',
    ...overrides,
  });
}

export function createCategory(api: ApiClient, type: 'service' | 'product', name = tag('Danh mục E2E')) {
  return api.post<Id & { name: string }>('/categories', { type, name, description: 'Tạo bởi E2E' });
}

export function createProduct(api: ApiClient, overrides: Record<string, unknown> = {}) {
  return api.post<Id & { sku: string }>('/products', {
    sku: tag('SP-E2E'),
    name: `Sản phẩm E2E ${RUN_ID}`,
    unit: 'chai',
    net_unit: 'ml',
    net_amount: 1000,
    cost_price: 50_000,
    sell_price: 80_000,
    stock_quantity: 100,
    min_stock: 5,
    is_active: true,
    ...overrides,
  });
}

export function createService(api: ApiClient, overrides: Record<string, unknown> = {}) {
  return api.post<Id & { name: string }>('/services', {
    name: `Dịch vụ E2E ${RUN_ID}`,
    description: 'Tạo bởi E2E',
    duration_minutes: 30,
    buffer_minutes: 5,
    price: 150_000,
    is_active: true,
    ...overrides,
  });
}

export function createStaff(api: ApiClient, overrides: Record<string, unknown> = {}) {
  return api.post<Id & { full_name: string }>('/staff', {
    full_name: `Nhân viên E2E ${RUN_ID}`,
    phone: uniquePhone(),
    position: 'Thợ chính',
    employment_type: 'fulltime',
    commission_rate: 10,
    base_salary: 7_000_000,
    status: 'active',
    hire_date: isoAt(0, 9).slice(0, 10),
    ...overrides,
  });
}

export function createSupplier(api: ApiClient, overrides: Record<string, unknown> = {}) {
  return api.post<Id & { name: string }>('/suppliers', {
    name: `Nhà cung cấp E2E ${RUN_ID}`,
    phone: uniquePhone(),
    address: 'TP.HCM',
    note: 'Tạo bởi E2E',
    ...overrides,
  });
}

export function createFund(api: ApiClient, overrides: Record<string, unknown> = {}) {
  return api.post<Id & { name: string }>('/funds', {
    code: tag('QUY-E2E'),
    name: `Quỹ E2E ${RUN_ID}`,
    fund_type: 'cash',
    bank_name: null,
    account_number: null,
    opening_balance: 10_000_000,
    ...overrides,
  });
}

export function createAppointment(
  api: ApiClient,
  input: { service_id: string; service_price?: number; staff_id?: string | null },
  overrides: Record<string, unknown> = {},
) {
  const dayOffset = 1 + Math.floor(Math.random() * 20);
  return api.post<Id & { code: string }>('/appointments', {
    customer_name: `Khách lịch hẹn ${RUN_ID}`,
    customer_phone: uniquePhone(),
    staff_id: input.staff_id ?? undefined,
    start_time: isoAt(dayOffset, 10),
    end_time: isoAt(dayOffset, 10, 30),
    status: 'confirmed',
    source: 'phone',
    note: 'Tạo bởi E2E',
    items: [
      {
        item_type: 'service',
        service_id: input.service_id,
        quantity: 1,
        unit_price: input.service_price ?? 150_000,
      },
    ],
    ...overrides,
  });
}

export function createOrder(
  api: ApiClient,
  input: { service_id: string; staff_id?: string | null; customer_id?: string | null },
  overrides: Record<string, unknown> = {},
) {
  return api.post<Id & { code: string; total_amount: number }>('/orders', {
    customer_id: input.customer_id ?? null,
    appointment_id: null,
    discount_amount: 0,
    new_customer: input.customer_id
      ? undefined
      : { full_name: `Khách đơn E2E ${RUN_ID}`, phone: uniquePhone() },
    items: [
      {
        item_type: 'service',
        service_id: input.service_id,
        product_id: null,
        staff_id: input.staff_id ?? null,
        quantity: 1,
        materials: [],
      },
    ],
    ...overrides,
  });
}

export function createInventoryDocument(
  api: ApiClient,
  input: { product_id: string; supplier_id?: string | null; fund_id?: string | null },
  overrides: Record<string, unknown> = {},
) {
  return api.post<Id & { document_code: string }>('/inventory', {
    document_code: tag('PN-E2E'),
    type: 'import',
    supplier_id: input.supplier_id ?? null,
    fund_id: input.fund_id ?? null,
    note: 'Tạo bởi E2E',
    items: [
      {
        product_id: input.product_id,
        quantity: 10,
        unit: 'chai',
        unit_price: 50_000,
        discount_percent: 0,
      },
    ],
    ...overrides,
  });
}

export function createCashFlow(
  api: ApiClient,
  input: { fund_id: string; category_id?: string | null },
  overrides: Record<string, unknown> = {},
) {
  return api.post<Id>('/cashflows', {
    kind: 'income',
    category_id: input.category_id ?? null,
    fund_id: input.fund_id,
    amount: 500_000,
    description: `Thu E2E ${RUN_ID}`,
    occurred_at: isoAt(0, 9),
    ...overrides,
  });
}
