import { useQuery } from '@tanstack/react-query';
import { getStaffLeaves } from '@/services/staff';

export default function useStaffLeaves(id: string | null | undefined) {
  return useQuery({
    queryKey: ['staff-leaves', id],
    queryFn: () => getStaffLeaves(id as string),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
