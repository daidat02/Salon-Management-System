import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getAppointmentsByOrgID } from '@/services/appointment';
import type { AppointmentStatus } from '@/types/appointment';

type UseAppointmentsParams = {
  page: number;
  pageSize: number;
  status?: AppointmentStatus | '';
  /** ISO8601 hoặc YYYY-MM-DD. */
  from?: string;
  to?: string;
  search?: string;
};

export default function useAppointments({
  page,
  pageSize,
  status = '',
  from = '',
  to = '',
  search = '',
}: UseAppointmentsParams) {
  return useQuery({
    queryKey: ['appointments', { page, pageSize, status, from, to, search }],
    queryFn: () => getAppointmentsByOrgID({ page, pageSize, status, from, to, search }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
