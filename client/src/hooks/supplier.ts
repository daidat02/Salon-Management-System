import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSuppliers, createSupplier } from '@/services/supplier';
import type { CreateSupplierPayload } from '@/types/supplier';
import { queryKeys } from './query-keys';

export function useSuppliers(search = '') {
  return useQuery({
    queryKey: queryKeys.supplier.list({ search }),
    queryFn: () => getSuppliers({ search, page: 1, pageSize: 100 }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) => createSupplier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.lists() });
    },
  });
}

export type { CreateSupplierPayload };
