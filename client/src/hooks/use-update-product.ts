import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProduct, type UpdateProductPayload } from '@/services/product';

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      updateProduct(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
      queryClient.invalidateQueries({ queryKey: ['product-detail', variables.id] });
    },
  });
}

export type { UpdateProductPayload };
