import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveCashFlow } from '@/services/cashflow';

export default function useApproveCashFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cashflowId: string) => approveCashFlow(cashflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashflows'] });
      queryClient.invalidateQueries({ queryKey: ['cashflow-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cashflow-chart'] });
      queryClient.invalidateQueries({ queryKey: ['category-expense-stats'] });
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      queryClient.invalidateQueries({ queryKey: ['fund-movement-history'] });
    },
  });
}
