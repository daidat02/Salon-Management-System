import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCustomer, type UpdateCustomerPayload } from '@/services/customer';

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerPayload }) =>
      updateCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-detail'] });
    },
  });
}

export type { UpdateCustomerPayload };
