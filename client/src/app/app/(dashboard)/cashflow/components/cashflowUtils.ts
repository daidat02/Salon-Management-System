import type { CashFlow } from '@/types/cashflow';
import type { CashflowVoucher, CashflowStatus } from './types';

export const CASHFLOW_STATUS_LABELS: Record<CashflowStatus, string> = {
  approved: 'Đã duyệt',
  pending: 'Chờ duyệt',
  cancelled: 'Đã hủy',
};

export function formatOccurredAt(value: string | null): { date: string; time: string } {
  if (!value) return { date: '—', time: '—' };

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: '—', time: '—' };

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${min}` };
}

export function mapCashflow(cashflow: CashFlow): CashflowVoucher {
  const { date, time } = formatOccurredAt(cashflow.occurred_at);

  return {
    id: cashflow.id,
    date,
    time,
    code: cashflow.code,
    type: cashflow.kind,
    category: cashflow.category_name || '—',
    description: cashflow.description || '—',
    fund: cashflow.fund_name || '—',
    amount: cashflow.amount,
    status: cashflow.status,
  };
}
