import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createFund,
  updateFund,
  type CreateFundPayload,
  type UpdateFundPayload,
} from '@/services/cashflow';

function invalidateFundQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['funds'] });
  queryClient.invalidateQueries({ queryKey: ['cashflow-stats'] });
  queryClient.invalidateQueries({ queryKey: ['cashflows'] });
  queryClient.invalidateQueries({ queryKey: ['fund-movement-history'] });
}

export function useCreateFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFundPayload) => createFund(payload),
    onSuccess: () => invalidateFundQueries(queryClient),
  });
}

export function useUpdateFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fundId, payload }: { fundId: string; payload: UpdateFundPayload }) =>
      updateFund(fundId, payload),
    onSuccess: () => invalidateFundQueries(queryClient),
  });
}

export type { CreateFundPayload, UpdateFundPayload };
