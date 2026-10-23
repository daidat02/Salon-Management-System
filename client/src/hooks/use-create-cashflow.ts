import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCashFlow, type CreateCashFlowPayload } from '@/services/cashflow';

export default function useCreateCashFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCashFlowPayload) => createCashFlow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashflows'] });
      queryClient.invalidateQueries({ queryKey: ['cashflow-stats'] });
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      queryClient.invalidateQueries({ queryKey: ['fund-movement-history'] });
    },
  });
}

export type { CreateCashFlowPayload };
