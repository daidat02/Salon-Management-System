'use client';

import * as React from 'react';
import { Pencil, Plus } from 'lucide-react';
import { DashDialog } from '@/components/dashboard/DashDialog';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import DashTable, { type DashColumn } from '@/components/dashboard/DashTable';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tag } from '@/components/ui/tag';
import { toast } from '@/components/ui/toast';
import { useCreateFund, useUpdateFund } from '@/hooks/use-fund-mutations';
import useFundMovementHistory from '@/hooks/use-fund-movement-history';
import useFunds from '@/hooks/use-funds';
import { getApiErrorMessage } from '@/services/apiClient';
import { cn } from 'cn';
import { formatShortDateTime, formatVND } from '@/lib/format';
import type { CashFlow, Fund, FundType } from '@/types/cashflow';

type FundSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FundDraft = {
  code: string;
  name: string;
  fund_type: FundType;
  bank_name: string;
  account_number: string;
  opening_balance: string;
  is_active: boolean;
  is_default: boolean;
  is_configured: boolean;
};

type FundFormMode = { type: 'create' } | { type: 'edit'; id: string } | null;

const FUND_TYPE_LABELS: Record<FundType, string> = {
  cash: 'Tiền mặt',
  bank: 'Ngân hàng',
  e_wallet: 'Ví điện tử',
};

const FUND_TYPE_OPTIONS = [
  { label: FUND_TYPE_LABELS.cash, value: 'cash' },
  { label: FUND_TYPE_LABELS.bank, value: 'bank' },
  { label: FUND_TYPE_LABELS.e_wallet, value: 'e_wallet' },
];

function emptyFundDraft(): FundDraft {
  return {
    code: '',
    name: '',
    fund_type: 'cash',
    bank_name: '',
    account_number: '',
    opening_balance: '0',
    is_active: true,
    is_default: false,
    is_configured: false,
  };
}

function fundToDraft(fund: Fund): FundDraft {
  return {
    code: fund.code,
    name: fund.name,
    fund_type: fund.fund_type,
    bank_name: fund.bank_name ?? '',
    account_number: fund.account_number ?? '',
    opening_balance: String(fund.opening_balance),
    is_active: fund.is_active,
    is_default: fund.is_default,
    is_configured: fund.is_configured,
  };
}

function movementTime(row: CashFlow): string {
  const value = row.occurred_at ?? row.created_at;
  return value ? formatShortDateTime(value) : '—';
}

const movementColumns: DashColumn<CashFlow>[] = [
  {
    id: 'code',
    header: 'Mã phiếu',
    headerClassName: 'min-w-[110px]',
    cell: (row) => <span className="text-on-surface font-semibold">{row.code}</span>,
  },
  {
    id: 'occurredAt',
    header: 'Thời gian',
    headerClassName: 'min-w-[105px]',
    cell: (row) => <span className="text-on-surface-variant">{movementTime(row)}</span>,
  },
  {
    id: 'fund',
    header: 'Quỹ',
    headerClassName: 'min-w-[150px]',
    cell: (row) => <span className="text-on-surface">{row.fund_name}</span>,
  },
  {
    id: 'type',
    header: 'Loại',
    headerClassName: 'min-w-[90px]',
    cell: (row) => (
      <Tag variant={row.kind === 'income' ? 'emerald' : 'error'} size="sm" shape="pill" dot>
        {row.kind === 'income' ? 'Nạp quỹ' : 'Rút quỹ'}
      </Tag>
    ),
  },
  {
    id: 'amount',
    header: 'Số tiền',
    headerClassName: 'min-w-[110px] text-right',
    className: 'text-right',
    cell: (row) => (
      <span className={cn('font-semibold', row.kind === 'income' ? 'text-success' : 'text-error')}>
        {row.kind === 'income' ? '+' : '-'}
        {formatVND(row.amount)}
      </span>
    ),
  },
  {
    id: 'description',
    header: 'Nội dung',
    headerClassName: 'min-w-[170px]',
    cell: (row) => (
      <span className="text-on-surface-variant line-clamp-1">{row.description || '—'}</span>
    ),
  },
  {
    id: 'status',
    header: 'Trạng thái',
    headerClassName: 'min-w-[100px]',
    cell: (row) => (
      <Tag
        variant={
          row.status === 'approved' ? 'success' : row.status === 'pending' ? 'warning' : 'gray'
        }
        size="sm"
        shape="rounded"
      >
        {row.status === 'approved'
          ? 'Đã duyệt'
          : row.status === 'pending'
            ? 'Chờ duyệt'
            : 'Đã hủy'}
      </Tag>
    ),
  },
];

function FundCard({ fund, onEdit }: { fund: Fund; onEdit: (fund: Fund) => void }) {
  return (
    <div className="border-outline bg-surface hover:border-primary/40 rounded-lg border p-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-on-surface truncate text-xs font-bold">{fund.name}</p>
          <p className="text-on-surface-variant mt-0.5 text-[11px]">
            {fund.code} • {FUND_TYPE_LABELS[fund.fund_type]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {fund.is_default && (
            <Tag variant="primary" size="sm" shape="pill">
              Mặc định
            </Tag>
          )}
          <Tag variant={fund.is_active ? 'success' : 'gray'} size="sm" shape="pill" dot>
            {fund.is_active ? 'Hoạt động' : 'Tạm dừng'}
          </Tag>
          <button
            type="button"
            onClick={() => onEdit(fund)}
            aria-label={`Sửa quỹ ${fund.name}`}
            className="text-on-surface-variant hover:bg-surface-container hover:text-primary rounded p-1 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="text-on-surface mt-3 text-base font-bold">
        {formatVND(fund.current_balance)}
      </p>

      <div className="text-on-surface-variant mt-1 flex items-center justify-between gap-2 text-[11px]">
        <span>Đầu kỳ: {formatVND(fund.opening_balance)}</span>
        {fund.account_number && (
          <span className="truncate font-medium">{fund.account_number}</span>
        )}
      </div>
    </div>
  );
}

function FundFormCard({
  mode,
  draft,
  error,
  isPending,
  onChange,
  onCancel,
  onSubmit,
}: {
  mode: Exclude<FundFormMode, null>;
  draft: FundDraft;
  error: string | null;
  isPending: boolean;
  onChange: <K extends keyof FundDraft>(key: K, value: FundDraft[K]) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const isEditing = mode.type === 'edit';

  return (
    <form
      onSubmit={onSubmit}
      className="border-primary/40 bg-surface flex h-full flex-col rounded-lg border p-3 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-on-surface text-xs font-bold">
          {isEditing ? 'Cập nhật quỹ' : 'Tạo quỹ mới'}
        </p>
        <Tag variant={isEditing ? 'blue' : 'primary'} size="sm" shape="pill">
          {isEditing ? draft.code : 'Quỹ mới'}
        </Tag>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">Mã quỹ</Label>
          <DashInput
            value={draft.code}
            onChange={(event) => onChange('code', event.target.value.toUpperCase())}
            placeholder="VD: CASH"
            className="h-8 text-xs"
            disabled={isEditing}
            required={!isEditing}
          />
        </div>

        <div>
          <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">Tên quỹ</Label>
          <DashInput
            value={draft.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="VD: Tiền mặt tại quầy"
            className="h-8 text-xs"
            required
          />
        </div>

        <div>
          <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
            Loại quỹ
          </Label>
          {isEditing ? (
            <DashInput
              value={FUND_TYPE_LABELS[draft.fund_type]}
              className="h-8 text-xs"
              disabled
            />
          ) : (
            <DashSelect
              value={draft.fund_type}
              onValueChange={(value) => onChange('fund_type', value as FundType)}
              options={FUND_TYPE_OPTIONS}
              triggerClassName="h-8 text-xs"
            />
          )}
        </div>

        {draft.fund_type !== 'cash' && (
          <>
            <div>
              <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
                {draft.fund_type === 'bank' ? 'Ngân hàng' : 'Tên ví điện tử'}
              </Label>
              <DashInput
                value={draft.bank_name}
                onChange={(event) => onChange('bank_name', event.target.value)}
                placeholder={draft.fund_type === 'bank' ? 'VD: Vietcombank' : 'VD: MoMo'}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
                {draft.fund_type === 'bank' ? 'Số tài khoản' : 'Số ví'}
              </Label>
              <DashInput
                value={draft.account_number}
                onChange={(event) => onChange('account_number', event.target.value)}
                placeholder={draft.fund_type === 'bank' ? 'VD: 0123456789' : 'VD: 0901234567'}
                className="h-8 text-xs"
              />
            </div>
          </>
        )}

        <div>
          <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
            Số dư đầu kỳ
          </Label>
          <DashInput
            value={
              isEditing
                ? formatVND(Number(draft.opening_balance) || 0)
                : draft.opening_balance
            }
            onChange={(event) => onChange('opening_balance', event.target.value)}
            type={isEditing ? 'text' : 'number'}
            min={0}
            step={1000}
            className="h-8 text-xs"
            disabled={isEditing}
          />
        </div>

        {isEditing && (
          <div className="border-outline flex items-center justify-between rounded-md border px-2 py-1.5">
            <span className="text-on-surface text-[11px] font-semibold">Đang hoạt động</span>
            <Switch
              checked={draft.is_active}
              onCheckedChange={(checked) => onChange('is_active', checked)}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-auto flex gap-2 pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          className="border-outline text-slate-600 hover:bg-surface-container h-8 flex-1 text-xs font-semibold"
        >
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-[#436b95] text-on-primary h-8 flex-1 text-xs font-semibold shadow-sm"
        >
          {isPending ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Lưu quỹ'}
        </Button>
      </div>
    </form>
  );
}

function CreateFundCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-outline bg-surface hover:border-primary/50 hover:bg-primary-container/20 flex min-h-[116px] flex-col items-center justify-center rounded-lg border border-dashed p-3 text-center transition-colors"
    >
      <span className="bg-primary-container text-primary flex h-8 w-8 items-center justify-center rounded-full">
        <Plus className="h-4 w-4" />
      </span>
      <span className="text-on-surface mt-2 text-xs font-bold">Tạo quỹ mới</span>
      <span className="text-on-surface-variant mt-0.5 text-[11px]">
        Thêm quỹ tiền mặt, ngân hàng hoặc ví điện tử
      </span>
    </button>
  );
}

export function FundSettingsDialog({ open, onOpenChange }: FundSettingsDialogProps) {
  const { data: funds = [], isLoading: fundsLoading } = useFunds(true);
  const { data: movements = [], isLoading: historyLoading } = useFundMovementHistory();
  const createFund = useCreateFund();
  const updateFund = useUpdateFund();
  const isPending = createFund.isPending || updateFund.isPending;

  const [formMode, setFormMode] = React.useState<FundFormMode>(null);
  const [draft, setDraft] = React.useState<FundDraft>(emptyFundDraft);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [previousOpen, setPreviousOpen] = React.useState(open);

  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) {
      setFormMode(null);
      setFormError(null);
    }
  }

  const updateDraft = <K extends keyof FundDraft>(key: K, value: FundDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError(null);
  };

  const startCreate = () => {
    setFormMode({ type: 'create' });
    setDraft(emptyFundDraft());
    setFormError(null);
  };

  const startEdit = (fund: Fund) => {
    setFormMode({ type: 'edit', id: fund.id });
    setDraft(fundToDraft(fund));
    setFormError(null);
  };

  const cancelForm = () => {
    setFormMode(null);
    setFormError(null);
  };

  const validate = (): string | null => {
    if (!draft.name.trim()) return 'Tên quỹ không được để trống';
    if (formMode?.type === 'create') {
      if (!draft.code.trim()) return 'Mã quỹ không được để trống';
      if (
        funds.some((fund) => fund.code.toUpperCase() === draft.code.trim().toUpperCase())
      ) {
        return 'Mã quỹ đã tồn tại';
      }
      const openingBalance = Number(draft.opening_balance);
      if (!Number.isFinite(openingBalance) || openingBalance < 0) {
        return 'Số dư đầu kỳ không hợp lệ';
      }
    }
    return null;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formMode || isPending) return;

    const message = validate();
    if (message) {
      setFormError(message);
      return;
    }

    const name = draft.name.trim();
    const bankName =
      draft.fund_type === 'cash' ? null : draft.bank_name.trim() || null;
    const accountNumber =
      draft.fund_type === 'cash' ? null : draft.account_number.trim() || null;

    if (formMode.type === 'create') {
      createFund.mutate(
        {
          code: draft.code.trim().toUpperCase(),
          name,
          fund_type: draft.fund_type,
          bank_name: bankName,
          account_number: accountNumber,
          opening_balance: Number(draft.opening_balance),
        },
        {
          onSuccess: (fund) => {
            toast.add({
              title: 'Tạo quỹ thành công',
              description: `${fund.code} • ${fund.name}`,
              type: 'success',
            });
            setFormMode(null);
            setFormError(null);
          },
          onError: (error) => {
            const apiMessage = getApiErrorMessage(error);
            setFormError(apiMessage);
            toast.add({ title: 'Tạo quỹ thất bại', description: apiMessage, type: 'error' });
          },
        },
      );
      return;
    }

    updateFund.mutate(
      {
        fundId: formMode.id,
        payload: {
          name,
          bank_name: bankName,
          account_number: accountNumber,
          is_active: draft.is_active,
        },
      },
      {
        onSuccess: (fund) => {
          toast.add({
            title: 'Cập nhật quỹ thành công',
            description: fund.name,
            type: 'success',
          });
          setFormMode(null);
          setFormError(null);
        },
        onError: (error) => {
          const apiMessage = getApiErrorMessage(error);
          setFormError(apiMessage);
          toast.add({ title: 'Cập nhật quỹ thất bại', description: apiMessage, type: 'error' });
        },
      },
    );
  };

  const totalDeposit = movements
    .filter((movement) => movement.kind === 'income')
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalWithdraw = movements
    .filter((movement) => movement.kind === 'expense')
    .reduce((sum, movement) => sum + movement.amount, 0);

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cài đặt quỹ"
      description="Theo dõi số dư, lịch sử nạp rút và thông tin các quỹ của salon"
      maxWidth="max-w-[calc(100vw-2rem)] sm:max-w-[1100px]"
      footer={
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="border-outline text-slate-600 hover:bg-surface-container px-4 py-2 text-xs font-semibold"
        >
          Đóng
        </Button>
      }
    >
      <div className="space-y-5 py-4">
        <section className="space-y-2.5">
          <div>
            <h3 className="text-on-surface text-sm font-bold">Thông tin quỹ</h3>
            <p className="text-on-surface-variant text-[11px]">
              Số dư hiện tại và thông tin tài khoản của từng quỹ
            </p>
          </div>
          {fundsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="border-outline bg-surface h-[116px] animate-pulse rounded-lg border"
                />
              ))}
            </div>
          ) : (
            <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {funds.map((fund) =>
                formMode?.type === 'edit' && formMode.id === fund.id ? (
                  <FundFormCard
                    key={fund.id}
                    mode={formMode}
                    draft={draft}
                    error={formError}
                    isPending={isPending}
                    onChange={updateDraft}
                    onCancel={cancelForm}
                    onSubmit={handleSubmit}
                  />
                ) : (
                  <FundCard key={fund.id} fund={fund} onEdit={startEdit} />
                ),
              )}
              {formMode?.type === 'create' ? (
                <FundFormCard
                  mode={formMode}
                  draft={draft}
                  error={formError}
                  isPending={isPending}
                  onChange={updateDraft}
                  onCancel={cancelForm}
                  onSubmit={handleSubmit}
                />
              ) : (
                <CreateFundCard onClick={startCreate} />
              )}
            </div>
          )}
        </section>

        <section className="space-y-2.5">
          <div>
            <h3 className="text-on-surface text-sm font-bold">Lịch sử nạp / rút quỹ</h3>
            <p className="text-on-surface-variant text-[11px]">
              Các giao dịch điều chuyển và bổ sung số dư quỹ gần đây
            </p>
          </div>
          <DashTable
            columns={movementColumns}
            data={historyLoading ? [] : movements}
            selectable={false}
            getRowId={(row) => row.id}
            emptyText={historyLoading ? 'Đang tải lịch sử nạp/rút quỹ...' : 'Chưa có giao dịch nạp/rút quỹ'}
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">Tổng giao dịch: {movements.length}</span>
                <div className="flex flex-wrap items-center gap-4 font-semibold">
                  <span className="text-success">Nạp: +{formatVND(totalDeposit)}</span>
                  <span className="text-error">Rút: -{formatVND(totalWithdraw)}</span>
                </div>
              </div>
            }
          />
        </section>
      </div>
    </DashDialog>
  );
}

export default FundSettingsDialog;
