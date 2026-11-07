import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupplier } from '@/services/supplier';
import type { CreateSupplierPayload } from '@/types/supplier';

export default function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) => createSupplier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export type { CreateSupplierPayload };
