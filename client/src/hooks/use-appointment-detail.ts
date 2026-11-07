import { useQuery } from '@tanstack/react-query';
import { getAppointmentDetail } from '@/services/appointment';

export default function useAppointmentDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: ['appointment-detail', id],
    queryFn: () => getAppointmentDetail(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
