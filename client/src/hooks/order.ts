import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import {
  getOrdersByOrgID,
  getOrderDetail,
  getOrderStats,
  getPosItems,
  createOrder,
  addOrderItems,
  initPayment,
  confirmPayment,
  type CreateOrderPayload,
  type CreateOrderItemPayload,
  type ConfirmPaymentPayload,
} from '@/services/order';
import type { PosItem, PosItemsParams } from '@/types/pos';
import { queryKeys } from './query-keys';

type UseOrdersParams = {
  page: number;
  pageSize: number;
  status?: string;
};

type Cursor = { cursorType: string; cursorName: string; cursorId: string };

export type PosItemsBaseParams = Omit<PosItemsParams, 'cursorType' | 'cursorName' | 'cursorId'>;

export function useOrders({ page, pageSize, status }: UseOrdersParams) {
  return useQuery({
    queryKey: queryKeys.order.list({ page, pageSize, status }),
    queryFn: async () => getOrdersByOrgID({ status, page, pageSize }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useOrderDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.order.detail(id),
    queryFn: () => getOrderDetail(id as string),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useOrderStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.order.stats(),
    queryFn: getOrderStats,
    enabled,
    staleTime: 60 * 1000, // 1 phút
  });
}

export function useCashierOrders() {
  return useQuery({
    queryKey: queryKeys.order.cashier(),
    queryFn: () => getOrdersByOrgID({ page: 1, pageSize: 50 }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });
}

export function useActiveOrders() {
  return useQuery({
    queryKey: queryKeys.order.active(),
    queryFn: () => getOrdersByOrgID({ page: 1, pageSize: 50 }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function usePosItems(params: PosItemsBaseParams = {}) {
  const { search, category, kind, pageSize } = params;
  return useInfiniteQuery<PosItem[], Error>({
    queryKey: queryKeys.order.posItems({ search, category, kind, pageSize }),
    queryFn: ({ pageParam }) =>
      getPosItems({ search, category, kind, pageSize, ...((pageParam as Cursor | undefined) ?? {}) }),
    initialPageParam: undefined as Cursor | undefined,
    getNextPageParam: (lastPage) => {
      const size = pageSize ?? 20;
      if (lastPage.length < size) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { cursorType: last.type, cursorName: last.name, cursorId: last.id };
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.order.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.lists() });
      // Tạo đơn từ lịch hẹn làm lịch đổi sang in_progress.
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment.details() });
    },
  });
}

export function useAddOrderItems(orderId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: CreateOrderItemPayload[]) => addOrderItems(orderId as string, { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.order.lists() });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.order.detail(orderId) });
      }
    },
  });
}

export function useInitPayment(orderId: string | undefined) {
  return useMutation({
    mutationFn: () => initPayment(orderId as string),
  });
}

export function useConfirmPayment(orderId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      payload,
    }: {
      paymentId: string;
      payload: ConfirmPaymentPayload;
    }) => confirmPayment(orderId as string, paymentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.order.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.order.lists() });
    },
  });
}

export type { CreateOrderPayload, CreateOrderItemPayload, ConfirmPaymentPayload };
