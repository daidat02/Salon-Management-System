'use client';

import * as React from 'react';
import {
  Banknote,
  CreditCard,
  Landmark,
  ReceiptText,
  RotateCcw,
  Save,
  Wallet,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { cn } from 'cn';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tag } from '@/components/ui/tag';
import { toast } from '@/components/ui/toast';
import { usePaymentSettings, useUpdatePaymentSettings } from '@/hooks/settings';
import type {
  PaymentSettingsResponse,
  ReceiptSettings,
  SettingPaymentMethod,
} from '@/types/setting';

const labelClass = 'text-on-surface mb-1.5 block text-xs font-semibold';

const PAPER_SIZE_OPTIONS = [
  { label: 'Khổ K57', value: 'K57' },
  { label: 'Khổ K80', value: 'K80' },
  { label: 'Khổ A5', value: 'A5' },
];

type PaymentDraft = {
  receipt: ReceiptSettings;
  methods: SettingPaymentMethod[];
};

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border-outline rounded-xl border p-6 shadow-sm">
      <div className="border-outline mb-5 flex items-start gap-2 border-b pb-4">
        <Icon className="text-primary mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h3 className="text-on-surface text-base font-bold">{title}</h3>
          <p className="text-on-surface-variant mt-0.5 max-w-2xl text-xs leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  testId,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId?: string;
}) {
  return (
    <div className="border-outline flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <div>
        <p className="text-on-surface text-xs font-semibold">{title}</p>
        {description && (
          <p className="text-on-surface-variant mt-0.5 text-[11px] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <Switch data-testid={testId} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      <DashInput
        id={id}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

const METHOD_ICONS: Record<string, LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  card: CreditCard,
  wallet: Wallet,
};

const CODE_ICONS: Record<string, LucideIcon> = {
  CASH: Banknote,
  BANK_TRANSFER: Landmark,
  CARD: CreditCard,
  GATEWAY: Wallet,
};

function PaymentMethodRow({
  method,
  onToggle,
}: {
  method: SettingPaymentMethod;
  onToggle: (checked: boolean) => void;
}) {
  const Icon =
    CODE_ICONS[method.code.toUpperCase()] ??
    METHOD_ICONS[method.fund_type.toLowerCase()] ??
    CreditCard;

  return (
    <div
      className={cn(
        'border-outline flex items-start gap-3 rounded-lg border p-3 transition-colors',
        method.is_active ? 'bg-surface' : 'bg-surface-container-low opacity-70',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          method.is_active
            ? 'bg-primary-container text-primary'
            : 'bg-surface-container text-on-surface-variant',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-on-surface text-xs font-semibold">{method.name}</p>
          <Tag variant={method.is_active ? 'success' : 'slate'} size="sm" shape="pill" dot>
            {method.is_active ? 'Đang dùng' : 'Tắt'}
          </Tag>
          {method.is_system && (
            <Tag variant="primary" size="sm" shape="pill">
              Hệ thống
            </Tag>
          )}
        </div>
        <p className="text-on-surface-variant mt-1 text-[11px]">
          {method.fund_name}
          <span className="text-outline"> · </span>
          <span className="font-mono">{method.code}</span>
          <span className="text-outline"> · </span>
          Thứ tự {method.sort_order}
        </p>
      </div>

      <Switch
        data-testid={`settings-payment-method-${method.code}-toggle`}
        checked={method.is_active}
        onCheckedChange={onToggle}
        aria-label={`Bật ${method.name}`}
      />
    </div>
  );
}

function ReceiptContent({
  receipt,
  onChange,
}: {
  receipt: ReceiptSettings;
  onChange: <K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-on-surface text-xs font-bold">Hóa đơn</h4>

          <div>
            <Label htmlFor="receipt-paper-size" className={labelClass}>
              Khổ giấy
            </Label>
            <DashSelect
              value={receipt.paper_size}
              onValueChange={(value) => onChange('paper_size', value)}
              options={PAPER_SIZE_OPTIONS}
            />
          </div>

          <div>
            <Label htmlFor="receipt-copy-count" className={labelClass}>
              Số bản in
            </Label>
            <DashInput
              id="receipt-copy-count"
              type="number"
              min={1}
              max={5}
              value={receipt.print_copy_count}
              onChange={(event) =>
                onChange(
                  'print_copy_count',
                  Math.min(5, Math.max(1, Number(event.target.value) || 1)),
                )
              }
            />
          </div>

          <ToggleRow
            testId="settings-payment-auto-cut-toggle"
            title="Tự động cắt giấy"
            checked={receipt.auto_cut_paper}
            onCheckedChange={(checked) => onChange('auto_cut_paper', checked)}
          />
          <ToggleRow
            testId="settings-payment-auto-print-toggle"
            title="Tự động in khi thanh toán"
            checked={receipt.auto_print_on_checkout}
            onCheckedChange={(checked) => onChange('auto_print_on_checkout', checked)}
          />
          <ToggleRow
            testId="settings-payment-open-drawer-toggle"
            title="Mở két khi in"
            checked={receipt.open_cash_drawer}
            onCheckedChange={(checked) => onChange('open_cash_drawer', checked)}
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-on-surface text-xs font-bold">Nội dung hóa đơn</h4>

          <ToggleRow
            testId="settings-payment-logo-toggle"
            title="Hiển thị logo"
            checked={receipt.show_logo}
            onCheckedChange={(checked) => onChange('show_logo', checked)}
          />
          <TextField
            id="receipt-logo-url"
            label="Logo URL"
            value={receipt.logo_url}
            placeholder="https://..."
            onChange={(value) => onChange('logo_url', value || null)}
          />
          <TextField
            id="receipt-header-text"
            label="Tiêu đề"
            value={receipt.header_text}
            placeholder="VD: SALON TÓC MỘC"
            onChange={(value) => onChange('header_text', value || null)}
          />
          <ToggleRow
            testId="settings-payment-branch-address-toggle"
            title="Hiển thị địa chỉ chi nhánh"
            checked={receipt.show_branch_address}
            onCheckedChange={(checked) => onChange('show_branch_address', checked)}
          />
          <ToggleRow
            testId="settings-payment-cashier-name-toggle"
            title="Hiển thị tên thu ngân"
            checked={receipt.show_cashier_name}
            onCheckedChange={(checked) => onChange('show_cashier_name', checked)}
          />
          <ToggleRow
            testId="settings-payment-customer-info-toggle"
            title="Hiển thị thông tin khách hàng"
            checked={receipt.show_customer_info}
            onCheckedChange={(checked) => onChange('show_customer_info', checked)}
          />
          <ToggleRow
            testId="settings-payment-mask-phone-toggle"
            title="Che số điện thoại khách"
            checked={receipt.mask_customer_phone}
            onCheckedChange={(checked) => onChange('mask_customer_phone', checked)}
          />
          <ToggleRow
            testId="settings-payment-vietqr-toggle"
            title="Hiển thị VietQR"
            checked={receipt.show_vietqr}
            onCheckedChange={(checked) => onChange('show_vietqr', checked)}
          />
          <TextField
            id="receipt-footer-text"
            label="Footer"
            value={receipt.footer_text}
            placeholder="VD: Cảm ơn quý khách!"
            onChange={(value) => onChange('footer_text', value || null)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-on-surface flex items-center gap-1.5 text-xs font-bold">
          <Wifi className="h-3.5 w-3.5" />
          WiFi
        </h4>
        <ToggleRow
          testId="settings-payment-wifi-toggle"
          title="Hiển thị thông tin WiFi"
          checked={receipt.show_wifi_info}
          onCheckedChange={(checked) => onChange('show_wifi_info', checked)}
        />
        {receipt.show_wifi_info && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="receipt-wifi-name"
              label="Tên WiFi"
              value={receipt.wifi_name}
              onChange={(value) => onChange('wifi_name', value || null)}
            />
            <TextField
              id="receipt-wifi-pass"
              label="Mật khẩu WiFi"
              value={receipt.wifi_pass}
              onChange={(value) => onChange('wifi_pass', value || null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function mapPaymentDraft(data: PaymentSettingsResponse): PaymentDraft {
  return {
    receipt: { ...data.receipt },
    methods: data.payment_methods.map((method) => ({ ...method })),
  };
}

function toPaymentPayload(draft: PaymentDraft): PaymentSettingsResponse {
  return {
    receipt: draft.receipt,
    payment_methods: draft.methods,
  };
}

export default function PaymentSettingsView() {
  const { data, isLoading, isError } = usePaymentSettings();
  const updateMutation = useUpdatePaymentSettings();
  const hydrated = React.useRef(false);
  const [saved, setSaved] = React.useState<PaymentDraft | null>(null);
  const [draft, setDraft] = React.useState<PaymentDraft | null>(null);

  React.useEffect(() => {
    if (!data || hydrated.current) return;
    const mapped = mapPaymentDraft(data);
    hydrated.current = true;
    setSaved(mapped);
    setDraft(mapped);
  }, [data]);

  const dirty =
    saved !== null && draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);
  const hasActiveMethod = draft?.methods.some((method) => method.is_active) ?? false;

  const updateReceipt = React.useCallback(
    <K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => {
      setDraft((current) =>
        current ? { ...current, receipt: { ...current.receipt, [key]: value } } : current,
      );
    },
    [],
  );

  const toggleMethod = React.useCallback((id: string, checked: boolean) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            methods: current.methods.map((method) =>
              method.id === id ? { ...method, is_active: checked } : method,
            ),
          }
        : current,
    );
  }, []);

  const handleSave = async () => {
    if (!draft || !hasActiveMethod) return;
    try {
      const result = await updateMutation.mutateAsync(toPaymentPayload(draft));
      const mapped = mapPaymentDraft(result);
      setSaved(mapped);
      setDraft(mapped);
      toast.add({
        title: 'Đã lưu cài đặt thanh toán',
        description: 'Phương thức thanh toán và mẫu in đã được cập nhật.',
        type: 'success',
      });
    } catch {
      toast.add({
        title: 'Không lưu được cài đặt',
        description: 'Vui lòng thử lại sau.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface border-outline flex flex-wrap items-start justify-between gap-3 rounded-xl border p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="bg-primary-container text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-on-surface text-base font-bold">Thu ngân & Thanh toán</h2>
            <p className="text-on-surface-variant mt-1 max-w-2xl text-xs leading-relaxed">
              Phương thức thanh toán đang dùng và cấu hình in hóa đơn được tải trực tiếp từ hệ
              thống.
            </p>
          </div>
        </div>
        {isLoading ? (
          <Tag variant="blue" size="md" shape="pill">
            Đang tải...
          </Tag>
        ) : isError ? (
          <Tag variant="error" size="md" shape="pill">
            Không tải được dữ liệu
          </Tag>
        ) : (
          <Tag variant="success" size="md" shape="pill" dot>
            Đã kết nối
          </Tag>
        )}
      </div>

      {isError ? (
        <div className="bg-surface border-outline text-on-surface-variant rounded-xl border p-6 text-center text-xs">
          Không thể tải cài đặt thanh toán. Vui lòng thử lại sau.
        </div>
      ) : isLoading || !draft ? (
        <div className="bg-surface border-outline text-on-surface-variant rounded-xl border p-6 text-center text-xs">
          Đang tải cài đặt thanh toán...
        </div>
      ) : (
        <>
          <SettingsCard
            icon={Wallet}
            title="Phương thức thanh toán"
            description="Bật tắt các phương thức đang được cấu hình trong cơ sở dữ liệu."
          >
            {draft.methods.length === 0 ? (
              <p className="text-on-surface-variant text-xs">
                Chưa có phương thức thanh toán nào.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {draft.methods.map((method) => (
                  <PaymentMethodRow
                    key={method.id}
                    method={method}
                    onToggle={(checked) => toggleMethod(method.id, checked)}
                  />
                ))}
              </div>
            )}
            {!hasActiveMethod && (
              <p className="text-error mt-2 text-[11px]">
                Bật ít nhất một phương thức thanh toán.
              </p>
            )}
          </SettingsCard>

          <SettingsCard
            icon={ReceiptText}
            title="In hóa đơn"
            description="Cấu hình mẫu in và nội dung hiển thị trên hóa đơn."
          >
            <ReceiptContent receipt={draft.receipt} onChange={updateReceipt} />
          </SettingsCard>

          {dirty && (
            <div className="sticky bottom-4 z-20">
              <div className="bg-surface border-outline flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg">
                <div>
                  <p className="text-on-surface text-xs font-semibold">Có thay đổi chưa lưu</p>
                  <p className="text-on-surface-variant mt-0.5 text-[11px]">
                    {hasActiveMethod
                      ? 'Bấm Lưu để cập nhật cấu hình vào hệ thống.'
                      : 'Vui lòng bật ít nhất một phương thức thanh toán.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    data-testid="settings-reset"
                    variant="outline"
                    onClick={() => setDraft(saved)}
                    className="border-outline text-slate-600 hover:bg-surface-container px-3 py-2 text-xs font-semibold"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Khôi phục
                  </Button>
                  <Button
                    data-testid="settings-save"
                    onClick={handleSave}
                    disabled={!hasActiveMethod || updateMutation.isPending}
                    className="bg-primary hover:bg-[#436b95] text-on-primary px-4 py-2 text-xs font-semibold shadow-sm"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
