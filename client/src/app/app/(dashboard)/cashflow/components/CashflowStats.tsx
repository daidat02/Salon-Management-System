'use client';

import * as React from 'react';
import { Landmark, Settings, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import StatCard from '@/components/dashboard/StatCard';
import TextButton from '@/components/dashboard/TextButton';
import useCashFlowStats from '@/hooks/use-cashflow-stats';
import { formatVND } from '@/lib/format';
import { FundSettingsDialog } from './FundSettingsDialog';

function shortVND(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return formatVND(value);
}

export default function CashflowStats() {
  const searchParams = useSearchParams();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const dateFrom = searchParams.get('date_from') || undefined;
  const dateTo = searchParams.get('date_to') || undefined;
  const { data, isLoading } = useCashFlowStats({ dateFrom, dateTo });

  const ready = !isLoading && Boolean(data);
  const totalIncome = data?.total_income ?? 0;
  const operatingExpense = data?.total_operating_expense ?? 0;
  const nonPnlExpense = data?.total_non_pnl_expense ?? 0;

  const activeFunds = (data?.funds ?? []).filter((fund) => fund.is_active);
  const totalBalance = activeFunds.reduce((sum, fund) => sum + fund.current_balance, 0);
  const cashBalance = activeFunds
    .filter((fund) => fund.fund_type === 'cash')
    .reduce((sum, fund) => sum + fund.current_balance, 0);
  const bankBalance = activeFunds
    .filter((fund) => fund.fund_type === 'bank')
    .reduce((sum, fund) => sum + fund.current_balance, 0);

  const value = (v: string) => (ready ? v : '—');

  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Tổng Thu"
        value={value(formatVND(totalIncome))}
        sub={
          <span className="flex items-center justify-between">
            <span className="font-semibold text-success">Thu đã duyệt</span>
            <span className="text-[11px]">Trong kỳ</span>
          </span>
        }
        icon={TrendingUp}
        iconWrapClassName="bg-emerald-50 text-success"
      />
      <StatCard
        label="Tổng Chi"
        value={value(formatVND(operatingExpense))}
        sub={
          <span className="flex items-center justify-between">
            <span className="font-semibold text-error">Chi phí vận hành</span>
            <span className="text-[11px]">Trong kỳ</span>
          </span>
        }
        icon={TrendingDown}
        iconWrapClassName="bg-rose-50 text-error"
      />
      <StatCard
        label="Chi Ngoài P&L"
        value={value(formatVND(nonPnlExpense))}
        sub={
          <span className="flex items-center justify-between">
            <span className="font-semibold text-on-surface-variant">Không tính vào lãi/lỗ</span>
            <span className="text-[11px]">Trong kỳ</span>
          </span>
        }
        icon={Wallet}
        iconWrapClassName="bg-slate-100 text-slate-600"
      />
      <StatCard
        label="Tồn Quỹ Khả Dụng"
        value={value(formatVND(totalBalance))}
        sub={
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {activeFunds.length === 0 ? (
              <span className="text-[11px]">Chưa có quỹ đang hoạt động</span>
            ) : (
              <>
                <span>
                  TM: <b className="font-semibold text-on-surface">{value(shortVND(cashBalance))}</b>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  TK: <b className="font-semibold text-on-surface">{value(shortVND(bankBalance))}</b>
                </span>
                <span className="text-slate-300">|</span>
                <span>{activeFunds.length} quỹ</span>
                <span className="text-slate-300">|</span>
              </>
            )}
            <TextButton
              icon={Settings}
              onClick={() => setSettingsOpen(true)}
              aria-haspopup="dialog"
            >
              Cài đặt
            </TextButton>
          </span>
        }
        icon={Landmark}
        iconWrapClassName="bg-indigo-50 text-indigo-600"
      />
      </section>

      <FundSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
