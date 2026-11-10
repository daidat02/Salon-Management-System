import { format } from 'date-fns';
import { cn } from 'cn';
import { Tag } from '@/components/ui/tag';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatVND } from '@/lib/format';
import type { ReportRange, TopService } from '@/types/report';

type TopServicesTableProps = {
  services: TopService[];
  range: ReportRange;
};

function categoryVariant(
  category: string,
): 'purple' | 'slate' | 'indigo' | 'emerald' {
  if (category === 'Nhuộm') return 'purple';
  if (category === 'Uốn tóc') return 'indigo';
  if (category === 'Spa') return 'emerald';
  return 'slate';
}

export default function TopServicesTable({
  services,
  range,
}: TopServicesTableProps) {
  const totalTurns = services.reduce((sum, service) => sum + service.turns, 0);

  return (
    <section className="flex flex-col rounded-xl border border-outline bg-surface p-5 shadow-sm lg:col-span-7">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-outline pb-3">
        <div>
          <h2 className="text-base font-bold text-on-surface">
            Top 5 Dịch vụ bán chạy
          </h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Xếp hạng theo doanh thu trong kỳ
          </p>
        </div>
        <Tag variant="slate" size="sm">
          {format(range.from, 'dd/MM')} - {format(range.to, 'dd/MM')}
        </Tag>
      </div>

      <div className="mt-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dịch vụ</TableHead>
              <TableHead className="text-center">Số lượt</TableHead>
              <TableHead className="text-right">Doanh thu</TableHead>
              <TableHead className="text-right">Lợi nhuận</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service, index) => (
              <TableRow key={service.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        index === 0
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-on-surface">
                        {service.name}
                      </div>
                      <Tag
                        variant={categoryVariant(service.category)}
                        size="sm"
                        className="mt-0.5"
                      >
                        {service.category}
                      </Tag>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold text-primary">
                  {service.turns}
                </TableCell>
                <TableCell className="text-right font-semibold text-on-surface">
                  {formatVND(service.revenue)}
                </TableCell>
                <TableCell className="text-right font-semibold text-success">
                  {formatVND(service.profit)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-outline pt-3 text-[11px] text-on-surface-variant">
        <span>
          Tổng lượt top 5:{' '}
          <strong className="font-semibold text-on-surface">{totalTurns}</strong>
        </span>
        <span>Nguồn: đơn hàng đã hoàn thành</span>
      </div>
    </section>
  );
}
