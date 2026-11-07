import { API_ENDPOINTS } from '@/constants';
import { ApiResponse, PaginationResult } from '@/types/response';
import type { CreateSupplierPayload, Supplier } from '@/types/supplier';
import apiClient from './apiClient';

export const getSuppliers = async ({
  search,
  page = 1,
  pageSize = 100,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
}) => {
  const res = await apiClient.get<ApiResponse<PaginationResult<Supplier>>>(
    API_ENDPOINTS.SUPPLIERS.GET_ALL,
    {
      params: {
        search: search || undefined,
        page,
        page_size: pageSize,
      },
    },
  );
  return res.data.data;
};

export const createSupplier = async (payload: CreateSupplierPayload) => {
  const res = await apiClient.post<ApiResponse<Supplier>>(
    API_ENDPOINTS.SUPPLIERS.CREATE,
    payload,
  );
  return res.data.data;
};
