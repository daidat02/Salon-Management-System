export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080/api/v1';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE}/login`,
    REGISTER: `${API_BASE}/register`,
    FORGOT_PASSWORD: `${API_BASE}/forgot-password`,
  },

  CUSTOMERS: {
    GET_ALL: `${API_BASE}/customers`,
    CREATE: `${API_BASE}/customers`,
    FIND_BY_PHONE: `${API_BASE}/customers/phone`,
  },

  PRODUCTS: {
    GET_ALL: `${API_BASE}/products`,
    CREATE: `${API_BASE}/products`,
    GET_STATS: `${API_BASE}/products/stats`,
  },

  SERVICES: {
    GET_ALL: `${API_BASE}/services`,
    CREATE: `${API_BASE}/services`,
  },

  CATEGORIES: {
    GET_ALL: `${API_BASE}/categories`,
    CREATE: `${API_BASE}/categories`,
    UPDATE: (id: string) => `${API_BASE}/categories/${id}`,
    DELETE: (id: string) => `${API_BASE}/categories/${id}`,
  },

  INVENTORY: {
    GET_DOCUMENTS: `${API_BASE}/inventory/`,
    CREATE_DOCUMENT: `${API_BASE}/inventory/`,
    GET_DOCUMENT_DETAIL: (documentId: string) => `${API_BASE}/inventory/${documentId}`,
    GET_TRANSACTIONS: `${API_BASE}/inventory/transactions`,
    GET_TRANSACTION_DETAIL: (transactionId: string) =>
      `${API_BASE}/inventory/transactions/${transactionId}`,
  },

  APPOINTMENTS: {
    GET_APPOINTMENTS: `${API_BASE}/appointments`,
    GET_APPOINTMENT_DETAIL: (id: string) => `${API_BASE}/appointments/${id}`,
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

    CREATE_PAYMENT: (orderId: string) => `${API_BASE}/orders/${orderId}/payments`,
    CANCEL_ORDER: (orderId: string) => `${API_BASE}/orders/${orderId}/cancel`,
    REFUND_ORDER: (orderId: string) => `${API_BASE}/orders/${orderId}/refund`,
  },
};
