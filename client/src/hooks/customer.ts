import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getCustomersByOrgID,
  getCustomerDetail,
  getCustomerStats,
  createCustomer,
  updateCustomer,
  type CreateCustomerPayload,
  type UpdateCustomerPayload,
} from '@/services/customer';
import { queryKeys } from './query-keys';

type UseCustomersParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
};

type UseCustomerDetailParams = {
  id: string | null | undefined;
  histPage?: number;
  histPageSize?: number;
  ordPage?: number;
  ordPageSize?: number;
};

export function useCustomer({ page, pageSize, search, status }: UseCustomersParams) {
  return useQuery({
    queryKey: queryKeys.customer.list({ page, pageSize, search, status }),
    queryFn: () => getCustomersByOrgID({ page, pageSize, search }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCustomerDetail({
  id,
  histPage = 1,
  histPageSize = 5,
  ordPage = 1,
  ordPageSize = 5,
}: UseCustomerDetailParams) {
  return useQuery({
    queryKey: queryKeys.customer.detail(id, { histPage, histPageSize, ordPage, ordPageSize }),
    queryFn: () => getCustomerDetail(id as string, { histPage, histPageSize, ordPage, ordPageSize }),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCustomerStats() {
  return useQuery({
    queryKey: queryKeys.customer.stats(),
    queryFn: () => getCustomerStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.lists() });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerPayload }) =>
      updateCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.details() });
    },
  });
}

export type { CreateCustomerPayload, UpdateCustomerPayload };
