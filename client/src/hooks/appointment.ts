import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getAppointmentsByOrgID,
  getAppointmentDetail,
  getWeeklySchedule,
  createAppointment,
  updateAppointment,
  rescheduleAppointment,
  cancelAppointment,
  type CreateAppointmentPayload,
  type RescheduleAppointmentPayload,
} from '@/services/appointment';
import type { AppointmentStatus } from '@/types/appointment';
import { queryKeys } from './query-keys';

type UseAppointmentsParams = {
  page: number;
  pageSize: number;
  status?: AppointmentStatus | '';
  /** ISO8601 hoặc YYYY-MM-DD. */
  from?: string;
  to?: string;
  search?: string;
};

type UpdateAppointmentVariables = {
  id: string;
  payload: CreateAppointmentPayload;
};

type RescheduleAppointmentVariables = {
  id: string;
  payload: RescheduleAppointmentPayload;
};

type CancelAppointmentVariables = {
  id: string;
  reason?: string;
};

export function useAppointments({
  page,
  pageSize,
  status = '',
  from = '',
  to = '',
  search = '',
}: UseAppointmentsParams) {
  return useQuery({
    queryKey: queryKeys.appointment.list({ page, pageSize, status, from, to, search }),
    queryFn: () => getAppointmentsByOrgID({ page, pageSize, status, from, to, search }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAppointmentDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.appointment.detail(id),
    queryFn: () => getAppointmentDetail(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** `weekStart` dạng YYYY-MM-DD (thường là Thứ 2); rỗng = tuần hiện tại theo server. */
export function useWeeklySchedule(weekStart: string) {
  return useQuery({
    queryKey: queryKeys.appointment.weekly(weekStart),
    queryFn: () => getWeeklySchedule(weekStart),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) => createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment.lists() });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateAppointmentVariables) => updateAppointment(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment.detail(variables.id) });
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: RescheduleAppointmentVariables) =>
      rescheduleAppointment(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment.detail(variables.id) });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: CancelAppointmentVariables) => cancelAppointment(id, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment.detail(variables.id) });
    },
  });
}

export type { CreateAppointmentPayload, RescheduleAppointmentPayload };
