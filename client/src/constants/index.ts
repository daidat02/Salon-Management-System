export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080/api/v1';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE}/login`,
    REGISTER: `${API_BASE}/register`,
    FORGOT_PASSWORD: `${API_BASE}/forgot-password`,
    LOGOUT: `${API_BASE}/logout`,
  },

  CUSTOMERS: {
    GET_ALL: `${API_BASE}/customers`,
    CREATE: `${API_BASE}/customers`,
    FIND_BY_PHONE: `${API_BASE}/customers/phone`,
  },

  PRODUCTS: {
    GET_ALL: `${API_BASE}/products`,
    GET_BY_ID: (id: string) => `${API_BASE}/products/${id}`,
    CREATE: `${API_BASE}/products`,
    UPDATE: (id: string) => `${API_BASE}/products/${id}`,
    GET_STATS: `${API_BASE}/products/stats`,
  },

  SERVICES: {
    GET_ALL: `${API_BASE}/services`,
    GET_STATS: `${API_BASE}/services/stats`,
    GET_DETAIL: (id: string) => `${API_BASE}/services/${id}/details`,
    CREATE: `${API_BASE}/services`,
    UPDATE: (id: string) => `${API_BASE}/services/${id}`,
  },

  CATEGORIES: {
    GET_ALL: `${API_BASE}/categories`,
    CREATE: `${API_BASE}/categories`,
    UPDATE: (id: string) => `${API_BASE}/categories/${id}`,
    DELETE: (id: string) => `${API_BASE}/categories/${id}`,
  },

  SUPPLIERS: {
    GET_ALL: `${API_BASE}/suppliers`,
    CREATE: `${API_BASE}/suppliers`,
  },

  INVENTORY: {
    GET_DOCUMENTS: `${API_BASE}/inventory/`,
    CREATE_DOCUMENT: `${API_BASE}/inventory/`,
    GET_DOCUMENT_DETAIL: (documentId: string) => `${API_BASE}/inventory/${documentId}`,
    ADD_PAYMENT: (documentId: string) => `${API_BASE}/inventory/${documentId}/payments`,
    GET_STATS: `${API_BASE}/inventory/stats`,
    GET_TRANSACTIONS: `${API_BASE}/inventory/transactions`,
    GET_TRANSACTION_DETAIL: (transactionId: string) =>
      `${API_BASE}/inventory/transactions/${transactionId}`,
  },

  APPOINTMENTS: {
    GET_APPOINTMENTS: `${API_BASE}/appointments`,
    GET_WEEKLY_SCHEDULE: `${API_BASE}/appointments/weekly`,
    GET_APPOINTMENT_DETAIL: (id: string) => `${API_BASE}/appointments/${id}`,
    UPDATE_APPOINTMENT: (id: string) => `${API_BASE}/appointments/${id}`,
    RESCHEDULE_APPOINTMENT: (id: string) => `${API_BASE}/appointments/${id}/reschedule`,
    CANCEL_APPOINTMENT: (id: string) => `${API_BASE}/appointments/${id}/cancel`,
  },

  SETTINGS: {
    GET_GENERAL: `${API_BASE}/settings/general`,
    UPDATE_GENERAL: `${API_BASE}/settings/general`,
    GET_BOOKING: `${API_BASE}/settings/booking`,
    UPDATE_BOOKING: `${API_BASE}/settings/booking`,
    GET_PAYMENT: `${API_BASE}/settings/payment`,
    UPDATE_PAYMENT: `${API_BASE}/settings/payment`,
    GET_NOTIFICATIONS: `${API_BASE}/settings/notifications`,
    UPDATE_NOTIFICATIONS: `${API_BASE}/settings/notifications`,
  },

  CASHFLOWS: {
    GET_LIST: `${API_BASE}/cashflows`,
    CREATE: `${API_BASE}/cashflows`,
    APPROVE: (cashflowId: string) => `${API_BASE}/cashflows/${cashflowId}/approve`,
    GET_STATS: `${API_BASE}/cashflows/stats`,
    GET_CATEGORIES: `${API_BASE}/cashflow-categories`,
    GET_FUNDS: `${API_BASE}/funds`,
    CREATE_FUND: `${API_BASE}/funds`,
    UPDATE_FUND: (fundId: string) => `${API_BASE}/funds/${fundId}`,
    GET_FUND_HISTORY: `${API_BASE}/funds/history`,
  },

  REPORTS: {
    GET_REVENUE: `${API_BASE}/reports/revenue`,
  },

  ANALYTICS: {
    GET_OVERVIEW: `${API_BASE}/overview`,
  },

  ORDERS: {
    GET_ORDERS: `${API_BASE}/orders`,
    GET_ORDER_STATS: `${API_BASE}/orders/stats`,
    GET_ORDER_DETAIL: (orderId: string) => `${API_BASE}/orders/${orderId}`,
    CREATE_ORDER: `${API_BASE}/orders`,
    GET_POS_ITEMS: `${API_BASE}/orders/pos-items`,
    SAVE_ITEMS_STAFF: (itemId: string) => `${API_BASE}/orders/items/${itemId}/staff`,
    ADD_ORDER_ITEMS: (orderId: string) => `${API_BASE}/orders/${orderId}/items`,
    UPDATE_ORDER_ITEM_QTY: (orderId: string, itemId: string) =>
      `${API_BASE}/orders/${orderId}/items/${itemId}`,
    DELETE_ORDER_ITEM: (orderId: string, itemId: string) =>
      `${API_BASE}/orders/${orderId}/items/${itemId}`,
    SAVE_ORDER_MATERIALS: `${API_BASE}/orders/materials`,
    UPDATE_ORDER_CUSTOMER: (orderId: string) => `${API_BASE}/orders/${orderId}/customer`,

    INIT_PAYMENT: (orderId: string) => `${API_BASE}/orders/${orderId}/payments/init`,
    CONFIRM_PAYMENT: (orderId: string, paymentId: string) =>
      `${API_BASE}/orders/${orderId}/payments/${paymentId}/confirm`,
    CANCEL_ORDER: (orderId: string) => `${API_BASE}/orders/${orderId}/cancel`,
    REFUND_ORDER: (orderId: string) => `${API_BASE}/orders/${orderId}/refund`,
  },
};
