import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getProductsByOrgID,
  getProductById,
  getProductStats,
  getMaterialProducts,
  createProduct,
  updateProduct,
  type CreateProductPayload,
  type UpdateProductPayload,
} from '@/services/product';
import { queryKeys } from './query-keys';

type UseProductParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  categoryId?: string;
  sort?: string;
};

export function useProduct({
  page,
  pageSize,
  search,
  status,
  categoryId,
  sort,
}: UseProductParams) {
  return useQuery({
    queryKey: queryKeys.product.list({ page, pageSize, search, status, categoryId, sort }),
    queryFn: async () => getProductsByOrgID({ page, pageSize, search, status, categoryId, sort }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProductDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.product.detail(id),
    queryFn: () => getProductById(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductStats() {
  return useQuery({
    queryKey: queryKeys.product.stats(),
    queryFn: () => getProductStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMaterialProducts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.product.materials(),
    queryFn: getMaterialProducts,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.product.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      updateProduct(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.product.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.product.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.product.detail(variables.id) });
    },
  });
}

export type { CreateProductPayload, UpdateProductPayload };
