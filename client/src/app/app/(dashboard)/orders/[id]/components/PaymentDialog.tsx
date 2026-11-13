'use client';

import * as React from 'react';
import { BadgePercent, Banknote, CreditCard, QrCode, Smartphone } from 'lucide-react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { DashInput } from '@/components/dashboard/DashInput';
import { Button } from '@/components/ui/button';
import { useConfirmPayment } from '@/hooks/order';
import { usePaymentSettings } from '@/hooks/settings';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/components/ui/toast';
import type { InitPaymentResponse, PaymentMethod } from '@/services/order';
import type { SettingPaymentMethod } from '@/types/setting';
import { cn } from '@/lib/utils';
import { type EnrichedRetailLine, type EnrichedServiceLine } from './orderDetailUtils';
import { formatVND } from '@/lib/format';

const METHOD_META: Record<
  PaymentMethod,
  { label: string; sub: string; icon: typeof Banknote }
> = {
  cash: { label: 'Tiền mặt', sub: 'Thu trực tiếp', icon: Banknote },
  bank_transfer: { label: 'Chuyển khoản', sub: 'VietQR ngân hàng', icon: QrCode },
  card: { label: 'Thẻ', sub: 'POS / quẹt thẻ', icon: CreditCard },
  gateway: { label: 'Ví điện tử', sub: 'Cổng online', icon: Smartphone },
};

const CODE_TO_VALUE: Record<string, PaymentMethod> = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  TRANSFER: 'bank_transfer',
  BANK: 'bank_transfer',
  CARD: 'card',
  POS: 'card',
  WALLET: 'gateway',
  E_WALLET: 'gateway',
  GATEWAY: 'gateway',
};

type MethodOption = {
  key: string;
  value: PaymentMethod;
  methodPaymentId: string;
  label: string;
  sub: string;
  icon: typeof Banknote;
};

const FALLBACK_METHODS: MethodOption[] = (
  [
    ['CASH', 'Tiền mặt', 'cash'],
    ['BANK_TRANSFER', 'Chuyển khoản', 'bank_transfer'],
    ['CARD', 'Thẻ', 'card'],
    ['GATEWAY', 'Ví điện tử', 'gateway'],
  ] as const
).map(([code, label, value]) => ({
  key: code,
  value,
  methodPaymentId: code,
  label,
  sub: METHOD_META[value].sub,
  icon: METHOD_META[value].icon,
}));

function buildMethodOptions(methods: SettingPaymentMethod[] | undefined): MethodOption[] {
  const options = (methods ?? [])
    .filter((method) => method.is_active)
    .flatMap<MethodOption>((method) => {
      const value = CODE_TO_VALUE[method.code.toUpperCase()];
      if (!value) return [];
      return [
        {
          key: method.id,
          value,
          methodPaymentId: method.id,
          label: method.name,
          sub: METHOD_META[value].sub,
          icon: METHOD_META[value].icon,
        },
      ];
    });

  return options.length > 0 ? options : FALLBACK_METHODS;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderCode: string;
  payment: InitPaymentResponse;
  services: EnrichedServiceLine[];
  retail: EnrichedRetailLine[];
};

export default function PaymentDialog({
  open,
  onOpenChange,
  orderId,
  orderCode,
  payment,
  services,
  retail,
}: Props) {
  const remaining = payment.remaining_amount;
  const { data } = usePaymentSettings();
  const methodOptions = React.useMemo(
    () => buildMethodOptions(data?.payment_methods),
    [data],
  );
  const [methodKey, setMethodKey] = React.useState<string>('');
  const [discount, setDiscount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const { mutate, isPending } = useConfirmPayment(orderId);

  const selectedMethod =
    methodOptions.find((option) => option.key === methodKey) ?? methodOptions[0];

  const clampedDiscount = Math.min(Math.max(0, discount || 0), remaining);
  const collectAmount = Math.max(0, remaining - clampedDiscount);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setMethodKey('');
      setDiscount(0);
      setError(null);
    }
    onOpenChange(v);
  };

  const handleSubmit = () => {
    if (!selectedMethod || isPending) return;
    setError(null);
    mutate(
      {
        paymentId: payment.payment.id,
        payload: {
          method: selectedMethod.value,
          method_payment_id: selectedMethod.methodPaymentId,
          provider: selectedMethod.value === 'bank_transfer' ? 'vietqr' : null,
          discount_amount: clampedDiscount,
        },
      },
      {
        onSuccess: () => {
          toast.add({
            title: 'Thu tiền thành công',
            description: `Đơn ${orderCode} — đã thu ${formatVND(collectAmount)} và chốt đơn.`,
            type: 'success',
          });
          handleOpenChange(false);
        },
        onError: (err) => {
          const msg = getApiErrorMessage(err);
          setError(msg);
          toast.add({ title: 'Thu tiền thất bại', description: msg, type: 'error' });
        },
      },
    );
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Thu tiền đơn ${orderCode}`}
      description="Đối soát dịch vụ bên trái, nhập giảm giá và chọn phương thức bên phải."
      maxWidth="max-w-[1080px]!"
      footer={
        <DashDialogFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={handleSubmit}
          cancelText="Hủy"
          confirmText={`Xác nhận thu ${formatVND(collectAmount)}`}
          confirmDisabled={isPending}
          isLoading={isPending}
        />
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ===== Trái: dịch vụ + sản phẩm ===== */}
        <div className="space-y-3">
          <div>
            <h4 className="mb-1.5 text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
              Dịch vụ ({services.length})
            </h4>
            {services.length === 0 ? (
              <p className="text-xs text-on-surface-variant">Đơn không có dịch vụ.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-outline">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-container text-left text-[11px] text-on-surface-variant">
                      <th className="px-2.5 py-1.5 font-medium">Tên</th>
                      <th className="w-10 px-2 py-1.5 text-center font-medium">SL</th>
                      <th className="px-2 py-1.5 font-medium">NV</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Tổng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.id} className="border-t border-outline-variant">
                        <td className="px-2.5 py-1.5 font-medium text-on-surface">{s.name}</td>
                        <td className="px-2 py-1.5 text-center text-on-surface-variant">
                          x{s.quantity}
                        </td>
                        <td className="max-w-[110px] truncate px-2 py-1.5 text-on-surface-variant">
                          {s.staffName}
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-semibold text-on-surface">
                          {formatVND(s.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h4 className="mb-1.5 text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
              Sản phẩm ({retail.length})
            </h4>
            {retail.length === 0 ? (
              <p className="text-xs text-on-surface-variant">Đơn không có sản phẩm bán lẻ.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-outline">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-container text-left text-[11px] text-on-surface-variant">
                      <th className="px-2.5 py-1.5 font-medium">Tên</th>
                      <th className="w-10 px-2 py-1.5 text-center font-medium">SL</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Tổng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retail.map((r) => (
                      <tr key={r.id} className="border-t border-outline-variant">
                        <td className="px-2.5 py-1.5 font-medium text-on-surface">{r.name}</td>
                        <td className="px-2 py-1.5 text-center text-on-surface-variant">
                          x{r.quantity}
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-semibold text-on-surface">
                          {formatVND(r.sellTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ===== Phải: thanh toán ===== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5">
            <span className="text-xs font-medium text-on-surface-variant">Còn thiếu</span>
            <span className="font-mono text-base font-extrabold text-on-surface">
              {formatVND(remaining)}
            </span>
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-on-surface">
              <BadgePercent className="h-3.5 w-3.5" />
              Giảm giá thêm (đ)
            </div>
            <DashInput
              type="number"
              min={0}
              max={remaining}
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="h-9 text-xs"
              placeholder="0"
            />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-on-surface">
              Phương thức thanh toán
            </div>
            <div className="grid grid-cols-2 gap-2">
              {methodOptions.map((m) => {
                const Icon = m.icon;
                const active = selectedMethod?.key === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethodKey(m.key)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                      active
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                        : 'border-outline hover:border-primary/50 hover:bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-on-surface">
                        {m.label}
                      </span>
                      <span className="block truncate text-[11px] text-on-surface-variant">
                        {m.sub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2.5">
            <span className="text-xs font-bold text-on-surface">Số tiền thu</span>
            <span className="font-mono text-lg font-extrabold text-primary">
              {formatVND(collectAmount)}
            </span>
          </div>
          {clampedDiscount > 0 && (
            <p className="text-[11px] leading-snug text-on-surface-variant">
              Giảm {formatVND(clampedDiscount)} và chốt đơn với tổng mới{' '}
              {formatVND(remaining - clampedDiscount)}.
            </p>
          )}
          {error && <p className="text-xs font-medium text-error">{error}</p>}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setDiscount(0)}
          >
            Xóa giảm giá
          </Button>
        </div>
      </div>
    </DashDialog>
  );
}
