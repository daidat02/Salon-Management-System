import { useQuery } from '@tanstack/react-query';
import { getStaffById } from '@/services/staff';

export default function useStaffDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: ['staff-detail', id],
    queryFn: () => getStaffById(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
