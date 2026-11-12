import {
  Service,
  ServiceDetailResult,
  ServiceMaterial,
  ServiceStats,
} from '@/types/service';
import { ApiResponse, PaginationResult } from '@/types/response';
import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/constants';
const SERVICES_ENDPOINT = API_ENDPOINTS.SERVICES;

export const getServicesByOrgID = async ({
  search,
  page,
  pageSize,
  status,
  categoryId,
  sort,
}: {
  search?: string;
  page: number;
  pageSize: number;
  status?: string;
  categoryId?: string;
  sort?: string;
}) => {
  const res = await apiClient.get<ApiResponse<PaginationResult<Service>>>(
    SERVICES_ENDPOINT.GET_ALL,
    {
      params: {
        search: search,
        page: page,
        page_size: pageSize,
        status: status,
        category_id: categoryId,
        sort: sort,
      },
    },
  );

  return res.data.data;
};

/** Thống kê tổng quan dịch vụ của salon. */
export const getServiceStats = async () => {
  const res = await apiClient.get<ApiResponse<ServiceStats>>(SERVICES_ENDPOINT.GET_STATS);
  return res.data.data;
};

/** Chi tiết dịch vụ kèm thống kê tháng và định mức vật tư. */
export const getServiceDetail = async (id: string) => {
  const res = await apiClient.get<ApiResponse<ServiceDetailResult>>(
    SERVICES_ENDPOINT.GET_DETAIL(id),
  );
  return res.data.data;
};

export type CreateServicePayload = {
  category_id?: string | null;
  name: string;
  description?: string;
  duration_minutes: number;
  buffer_minutes?: number;
  price: number;
  is_active?: boolean;
};

export const createService = async (payload: CreateServicePayload) => {
  const res = await apiClient.post<ApiResponse<Service>>(SERVICES_ENDPOINT.CREATE, payload);
  return res.data.data;
};

export type UpdateServicePayload = CreateServicePayload;

export const updateService = async (id: string, payload: UpdateServicePayload) => {
  const res = await apiClient.put<ApiResponse<Service>>(SERVICES_ENDPOINT.UPDATE(id), payload);
  return res.data.data;
};

export type ReplaceServiceMaterialPayload = {
  product_id: string;
  quantity: number;
  unit?: string;
};

/** Thay toàn bộ định mức vật tư của dịch vụ; mảng rỗng xóa hết. */
export const replaceServiceMaterials = async (
  id: string,
  materials: ReplaceServiceMaterialPayload[],
) => {
  const res = await apiClient.put<ApiResponse<{ materials: ServiceMaterial[] }>>(
    SERVICES_ENDPOINT.REPLACE_MATERIALS(id),
    { materials },
  );
  return res.data.data.materials;
};
