// Same-origin mặc định: mọi request đi qua /api/v1 của chính domain đang mở.
// Dev: next.config rewrite /api -> backend Go. Prod: reverse proxy /api -> Go.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION;

export const API_BASE = `${API_BASE_URL}/${API_VERSION}`;
export const API_ENDPOINTS = {
  ORGANIZATIONS: {
    DISABLE_DEMO: `/organizations/demo`,
  },

  AUTH: {
    LOGIN: `/login`,
    REGISTER: `/register`,
    FORGOT_PASSWORD: `/forgot-password`,
    LOGOUT: `/logout`,
  },

  CUSTOMERS: {
    GET_ALL: `/customers`,
    CREATE: `/customers`,
    FIND_BY_PHONE: `/customers/phone`,
  },

  PRODUCTS: {
    GET_ALL: `/products`,
    GET_BY_ID: (id: string) => `/products/${id}`,
    CREATE: `/products`,
    UPDATE: (id: string) => `/products/${id}`,
    GET_STATS: `/products/stats`,
    GET_MATERIALS: `/products/materials`,
  },

  SERVICES: {
    GET_ALL: `/services`,
    GET_STATS: `/services/stats`,
    GET_DETAIL: (id: string) => `/services/${id}/details`,
    CREATE: `/services`,
    UPDATE: (id: string) => `/services/${id}`,
    REPLACE_MATERIALS: (id: string) => `/services/${id}/materials`,
  },

  CATEGORIES: {
    GET_ALL: `/categories`,
    CREATE: `/categories`,
    UPDATE: (id: string) => `/categories/${id}`,
    DELETE: (id: string) => `/categories/${id}`,
  },

  SUPPLIERS: {
    GET_ALL: `/suppliers`,
    CREATE: `/suppliers`,
  },

  INVENTORY: {
    GET_DOCUMENTS: `/inventory`,
    CREATE_DOCUMENT: `/inventory`,
    GET_DOCUMENT_DETAIL: (documentId: string) => `/inventory/${documentId}`,
    ADD_PAYMENT: (documentId: string) => `/inventory/${documentId}/payments`,
    GET_STATS: `/inventory/stats`,
    GET_TRANSACTIONS: `/inventory/transactions`,
    GET_TRANSACTION_DETAIL: (transactionId: string) => `/inventory/transactions/${transactionId}`,
  },

  APPOINTMENTS: {
    GET_APPOINTMENTS: `/appointments`,
    GET_WEEKLY_SCHEDULE: `/appointments/weekly`,
    GET_APPOINTMENT_DETAIL: (id: string) => `/appointments/${id}`,
    UPDATE_APPOINTMENT: (id: string) => `/appointments/${id}`,
    RESCHEDULE_APPOINTMENT: (id: string) => `/appointments/${id}/reschedule`,
    CANCEL_APPOINTMENT: (id: string) => `/appointments/${id}/cancel`,
  },

  SETTINGS: {
    GET_GENERAL: `/settings/general`,
    UPDATE_GENERAL: `/settings/general`,
    GET_BOOKING: `/settings/booking`,
    UPDATE_BOOKING: `/settings/booking`,
    GET_PAYMENT: `/settings/payment`,
    UPDATE_PAYMENT: `/settings/payment`,
    GET_NOTIFICATIONS: `/settings/notifications`,
    UPDATE_NOTIFICATIONS: `/settings/notifications`,
  },

  CASHFLOWS: {
    GET_LIST: `/cashflows`,
    CREATE: `/cashflows`,
    APPROVE: (cashflowId: string) => `/cashflows/${cashflowId}/approve`,
    GET_STATS: `/cashflows/stats`,
    GET_CATEGORIES: `/cashflow-categories`,
    GET_FUNDS: `/funds`,
    CREATE_FUND: `/funds`,
    UPDATE_FUND: (fundId: string) => `/funds/${fundId}`,
    GET_FUND_HISTORY: `/funds/history`,
  },

  REPORTS: {
    GET_REVENUE: `/reports/revenue`,
  },

  ANALYTICS: {
    GET_OVERVIEW: `/overview`,
  },

  ORDERS: {
    GET_ORDERS: `/orders`,
    GET_ORDER_STATS: `/orders/stats`,
    GET_ORDER_DETAIL: (orderId: string) => `/orders/${orderId}`,
    CREATE_ORDER: `/orders`,
    GET_POS_ITEMS: `/orders/pos-items`,
    SAVE_ITEMS_STAFF: (itemId: string) => `/orders/items/${itemId}/staff`,
    ADD_ORDER_ITEMS: (orderId: string) => `/orders/${orderId}/items`,
    UPDATE_ORDER_ITEM_QTY: (orderId: string, itemId: string) =>
      `/orders/${orderId}/items/${itemId}`,
    DELETE_ORDER_ITEM: (orderId: string, itemId: string) => `/orders/${orderId}/items/${itemId}`,
    SAVE_ORDER_MATERIALS: `/orders/materials`,
    UPDATE_ORDER_CUSTOMER: (orderId: string) => `/orders/${orderId}/customer`,

    INIT_PAYMENT: (orderId: string) => `/orders/${orderId}/payments/init`,
    CONFIRM_PAYMENT: (orderId: string, paymentId: string) =>
      `/orders/${orderId}/payments/${paymentId}/confirm`,
    CANCEL_ORDER: (orderId: string) => `/orders/${orderId}/cancel`,
    REFUND_ORDER: (orderId: string) => `/orders/${orderId}/refund`,
  },
};
