import { Customer, CustomerDetailResponse, CustomerStats } from '@/types/customer';
import { ApiResponse, PaginationResult } from '@/types/response';
import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/constants';

const CUSTOMERS_ENDPOINT = API_ENDPOINTS.CUSTOMERS;
export type GetCustomersParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export const getCustomersByOrgID = async ({
  page = 1,
  pageSize = 10,
  search = '',
}: GetCustomersParams = {}) => {
  const res = await apiClient.get<ApiResponse<PaginationResult<Customer>>>(
    CUSTOMERS_ENDPOINT.GET_ALL,
    {
      params: {
        page,
        page_size: pageSize,
        search: search || undefined,
      },
    },
  );
  // Backend wraps pagination.Result inside SuccessResponse.Data
  // => res.data.data = { data: Customer[], page, page_size, total, total_pages }
  return res.data.data;
};

export type CreateCustomerPayload = {
  full_name: string;
  phone: string;
  gender?: Customer['gender'];
  birth_date?: string | null;
  note?: string;
};

export const createCustomer = async (payload: CreateCustomerPayload) => {
  const res = await apiClient.post<ApiResponse<Customer>>('/customers', payload);
  return res.data.data;
};

export type UpdateCustomerPayload = {
  full_name: string;
  phone: string;
  gender?: Customer['gender'];
  birth_date?: string | null;
  note?: string;
};

/** Cập nhật thông tin khách hàng (PUT /customers/:id). */
export const updateCustomer = async (id: string, payload: UpdateCustomerPayload) => {
  const res = await apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, payload);
  return res.data.data;
};

/** Tra cứu chính xác 1 khách theo SĐT. 404 khi không tồn tại. */
export const getCustomerByPhone = async (phone: string) => {
  const res = await apiClient.get<ApiResponse<Customer>>('/customers/phone', {
    params: { phone },
  });
  return res.data.data;
};

/** Chi tiết khách: hồ sơ + chi tiêu 6 tháng + lịch sử hẹn/đơn (phân trang riêng). */
export const getCustomerDetail = async (
  id: string,
  params?: { histPage?: number; histPageSize?: number; ordPage?: number; ordPageSize?: number },
) => {
  const res = await apiClient.get<ApiResponse<CustomerDetailResponse>>(`/customers/${id}`, {
    params: {
      hist_page: params?.histPage ?? undefined,
      hist_page_size: params?.histPageSize ?? undefined,
      ord_page: params?.ordPage ?? undefined,
      ord_page_size: params?.ordPageSize ?? undefined,
    },
  });
  return res.data.data;
};

/** Thống kê tổng quan tệp khách của salon. */
export const getCustomerStats = async () => {
  const res = await apiClient.get<ApiResponse<CustomerStats>>('/customers/stats');
  return res.data.data;
};

/** Chuẩn hóa SĐT giống server: bỏ khoảng trắng/gạch/chấm, +84/84 -> 0. */
export function normalizePhone(raw: string): string {
  let p = (raw || '').trim().replace(/[\s\-.]/g, '');
  if (p.startsWith('+84')) p = '0' + p.slice(3);
  else if (p.startsWith('84') && p.length > 10) p = '0' + p.slice(2);
  return p;
}
