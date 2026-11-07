import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getWeeklySchedule } from '@/services/appointment';

/** `weekStart` dạng YYYY-MM-DD (thường là Thứ 2); rỗng = tuần hiện tại theo server. */
export default function useWeeklySchedule(weekStart: string) {
  return useQuery({
    queryKey: ['appointments', 'weekly', weekStart],
    queryFn: () => getWeeklySchedule(weekStart),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
