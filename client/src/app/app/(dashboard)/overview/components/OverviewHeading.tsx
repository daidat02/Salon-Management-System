import PageHeading from '@/components/dashboard/PageHeading';
import useAuth from '@/hooks/use-auth';
import type { OverviewKpi } from '@/types/overview';

type OverviewHeadingProps = {
  kpi?: OverviewKpi;
};

export default function OverviewHeading({ kpi }: OverviewHeadingProps) {
  const { user } = useAuth();
  return (
    <PageHeading
      title={`Chào buổi sáng, ${user?.full_name || 'Minh Anh'} 👋`}
      subtitle={
        <p className="mt-1 text-sm font-normal text-on-surface-variant">
          {kpi ? (
            <>
              Hôm nay bạn có{' '}
              <span className="font-semibold text-primary">{kpi.appointmentsToday} lịch hẹn</span>{' '}
              và <span className="font-semibold text-warning">{kpi.ordersUnpaid} đơn hàng</span> cần
              xử lý
            </>
          ) : (
            'Đang tải số liệu hôm nay…'
          )}
        </p>
      }
    />
  );
}
