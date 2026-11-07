import { Product, ProductDetail, ProductStats } from '@/types/product';
import { ApiResponse, PaginationResult } from '@/types/response';
import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/constants';
const PRODUCTS_ENDPOINT = API_ENDPOINTS.PRODUCTS;

export const getProductsByOrgID = async ({
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
  const res = await apiClient.get<ApiResponse<PaginationResult<Product>>>(
    PRODUCTS_ENDPOINT.GET_ALL,
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

export const getProductById = async (id: string) => {
  const res = await apiClient.get<ApiResponse<ProductDetail>>(
    PRODUCTS_ENDPOINT.GET_BY_ID(id),
  );
  return res.data.data;
};

export type CreateProductPayload = {
  sku: string;
  name: string;
  unit?: string;
  net_unit?: string;
  net_amount?: number;
  product_type?: Product['product_type'];
  category_id?: string | null;
  show_on_web?: boolean;
  cost_price?: number;
  sell_price?: number;
  stock_quantity?: number;
  min_stock?: number;
  is_active?: boolean;
};

export const createProduct = async (payload: CreateProductPayload) => {
  const res = await apiClient.post<ApiResponse<Product>>(PRODUCTS_ENDPOINT.CREATE, payload);
  return res.data.data;
};

export type UpdateProductPayload = CreateProductPayload;

export const updateProduct = async (id: string, payload: UpdateProductPayload) => {
  const res = await apiClient.put<ApiResponse<Product>>(PRODUCTS_ENDPOINT.UPDATE(id), payload);
  return res.data.data;
};

/** Thống kê tổng quan sản phẩm/kho của salon. */
export const getProductStats = async () => {
  const res = await apiClient.get<ApiResponse<ProductStats>>(
    PRODUCTS_ENDPOINT.GET_STATS,
  );
  return res.data.data;
};
