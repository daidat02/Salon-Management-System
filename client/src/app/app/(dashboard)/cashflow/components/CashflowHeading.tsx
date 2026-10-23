'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { parseISO } from 'date-fns';
import { Download, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeading from '@/components/dashboard/PageHeading';
import { DashDateRangePicker } from '@/components/dashboard/DashDateRangePicker';
import useCashFlowCategories from '@/hooks/use-cashflow-categories';
import useFunds from '@/hooks/use-funds';
import { CashflowCreateDialog } from './CashflowCreateDialog';

function getCurrentMonthRange(): DateRange {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  };
}

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default function CashflowHeading() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data: categories } = useCashFlowCategories();
  const { data: funds } = useFunds(true);

  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const dateRange = React.useMemo<DateRange>(() => {
    if (!dateFrom && !dateTo) return getCurrentMonthRange();
    return {
      from: parseDateParam(dateFrom),
      to: parseDateParam(dateTo),
    };
  }, [dateFrom, dateTo]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');

    if (range?.from) {
      const from = new Date(range.from);
      from.setHours(0, 0, 0, 0);
      params.set('date_from', from.toISOString());
    } else {
      params.delete('date_from');
    }

    if (range?.to) {
      const to = new Date(range.to);
      to.setHours(23, 59, 59, 999);
      params.set('date_to', to.toISOString());
    } else {
      params.delete('date_to');
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <PageHeading
        breadcrumbs={[
          { label: 'Trang chủ', href: '#' },
          { label: 'Thu Chi', active: true },
        ]}
        title="Thu Chi"
        badge="Sổ quỹ tiền mặt & NH"
        badgeVariant="soft"
        subtitle="Theo dõi sổ quỹ tiền mặt, ngân hàng, đối soát thu chi và chi phí vận hành salon"
        dateRangeContent={
          <DashDateRangePicker
            value={dateRange}
            onValueChange={handleDateRangeChange}
            triggerClassName="h-auto rounded-lg text-xs"
          />
        }
        actions={[
          { label: 'Xuất file CSV', icon: Download, variant: 'outline' },
          {
            label: 'Thêm phiếu',
            icon: Plus,
            variant: 'primary',
            onClick: () => setCreateOpen(true),
          },
        ]}
      />

      <CashflowCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        funds={funds}
      />
    </>
  );
}
