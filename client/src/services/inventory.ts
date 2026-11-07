import {
  InventoryDocument,
  InventoryDocumentDetail,
  InventoryStats,
  InventoryTransaction,
} from '@/types/inventory';
import { ApiResponse, PaginationResult } from '@/types/response';
import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/constants';
const INVENTORY_ENDPOINT = API_ENDPOINTS.INVENTORY;

export const getInventoryDocuments = async ({
  search,
  sort,
  filter,
  page,
  pageSize,
}: {
  search?: string;
  sort?: string;
  filter?: string;
  page: number;
  pageSize: number;
}) => {
  const res = await apiClient.get<ApiResponse<PaginationResult<InventoryDocument>>>(
    INVENTORY_ENDPOINT.GET_DOCUMENTS,
    {
      params: {
        search: search || undefined,
        sort: sort || undefined,
        filter: filter || undefined,
        page: page,
        page_size: pageSize,
      },
    },
  );

  return res.data.data;
};

export type CreateDocumentItemPayload = {
  product_id: string;
  /** Số lượng theo đơn vị hiển thị (server tự quy về đơn vị nhỏ nhất). */
  quantity: number;
  /** Đơn vị của quantity (VD chai/ml, rỗng = đơn vị lớn của SP). */
  unit?: string;
  /** Đơn giá theo unit hiển thị — chỉ dùng cho phiếu nhập, phiếu xuất server tự lấy giá vốn. */
  unit_price: number;
  /** Chiết khấu phần trăm trên dòng (0-100). */
  discount_percent?: number;
};

export type CreateDocumentPayload = {
  supplier_id?: string | null;
  order_id?: string | null;
  document_code: string;
  type: 'import' | 'export' | 'adjust' | 'sale' | 'return';
  note?: string | null;
  reason?: string | null;
  items: CreateDocumentItemPayload[];
  /** Các field dưới chỉ áp dụng cho phiếu nhập (import). */
  due_date?: string | null;
  vat_rate?: number;
  shipping_fee?: number;
  paid_amount?: number;
  fund_id?: string | null;
  invoice_code?: string | null;
};

export const createInventoryDocument = async (payload: CreateDocumentPayload) => {
  const res = await apiClient.post<ApiResponse<InventoryDocument>>(
    INVENTORY_ENDPOINT.CREATE_DOCUMENT,
    payload,
  );

  return res.data.data;
};

export type AddInventoryPaymentPayload = {
  fund_id: string;
  amount: number;
  note?: string | null;
};

export const addInventoryPayment = async (id: string, payload: AddInventoryPaymentPayload) => {
  const res = await apiClient.post<ApiResponse<InventoryDocumentDetail>>(
    API_ENDPOINTS.INVENTORY.ADD_PAYMENT(id),
    payload,
  );
  return res.data.data;
};

export const getInventoryDocument = async (id: string) => {
  const res = await apiClient.get<ApiResponse<InventoryDocumentDetail>>(
    `${INVENTORY_ENDPOINT.GET_DOCUMENT_DETAIL(id)}`,
  );
  return res.data.data;
};

/** Thống kê tổng quan trang kho hàng. */
export const getInventoryStats = async () => {
  const res = await apiClient.get<ApiResponse<InventoryStats>>(INVENTORY_ENDPOINT.GET_STATS);
  return res.data.data;
};

export const getInventoryTransactions = async ({
  productId,
  page,
  pageSize,
}: {
  productId?: string;
  page: number;
  pageSize: number;
}) => {
  const res = await apiClient.get<ApiResponse<PaginationResult<InventoryTransaction>>>(
    INVENTORY_ENDPOINT.GET_TRANSACTIONS,
    {
      params: {
        product_id: productId || undefined,
        page: page,
        page_size: pageSize,
      },
    },
  );

  return res.data.data;
};
