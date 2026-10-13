'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import ServiceCatalog, { dotFor, type CatalogItem } from './ServiceCatalog';
import InvoicePanel, {
  type InvoiceItem,
  type NewCustomerDraft,
  type SelectedCustomer,
} from './InvoicePanel';
import { normalizePhone } from '@/services/customer';
import { useCreateOrder } from '@/hooks/use-create-order';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/components/ui/toast';

export default function PosContent() {
  const router = useRouter();
  const [cart, setCart] = React.useState<InvoiceItem[]>([]);
  const [customer, setCustomer] = React.useState<SelectedCustomer>(null);
  const [newCustomer, setNewCustomer] = React.useState<NewCustomerDraft | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const { mutate, isPending } = useCreateOrder();

  const handleAdd = (item: CatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { ...item, quantity: 1, dotColor: dotFor(item.category) } as InvoiceItem];
    });
  };

  const handleQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p))
        .filter((p) => p.quantity > 0),
    );
  };

  const handleRemove = (id: string) => setCart((prev) => prev.filter((p) => p.id !== id));
  const handleClear = () => {
    setCart([]);
    setSubmitError(null);
  };

  const handleCreateOrder = () => {
    if (cart.length === 0 || isPending) return;
    setSubmitError(null);

    const draftName = newCustomer?.full_name.trim() || '';
    const draftPhone = normalizePhone(newCustomer?.phone || '');
    if (newCustomer && (!draftName || !draftPhone)) {
      const msg = 'Nhập đủ tên + SĐT khách mới (hoặc về tìm khách hàng cũ).';
      setSubmitError(msg);
      toast.add({ title: 'Thiếu thông tin khách', description: msg, type: 'error' });
      return;
    }

    mutate(
      {
        customer_id: customer?.id ?? null,
        discount_amount: 0,
        new_customer: customer?.id
          ? undefined
          : newCustomer
            ? { full_name: draftName, phone: draftPhone }
            : undefined,
        items: cart.map((it) => ({
          item_type: it.type,
          service_id: it.type === 'service' ? it.id : null,
          product_id: it.type === 'product' ? it.id : null,
          staff_id: null,
          quantity: it.quantity,
        })),
      },
      {
        onSuccess: (order) => {
          const cname = order.customer_name || customer?.full_name || draftName || 'Khách lẻ';
          toast.add({
            title: order.customer_reused ? 'SĐT đã có — dùng khách cũ' : 'Tạo đơn thành công',
            description: `Đơn ${order.code} — ${cname} — ${order.total_amount.toLocaleString('vi-VN')} đ`,
            type: 'success',
          });
          setCart([]);
          setCustomer(null);
          setNewCustomer(null);
          setSubmitError(null);
          router.push('/app/cashier');
        },
        onError: (err) => {
          const msg = getApiErrorMessage(err);
          setSubmitError(msg);
          toast.add({
            title: 'Tạo đơn thất bại',
            description: msg,
            type: 'error',
          });
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-4">
      <ServiceCatalog onAdd={handleAdd} />
      <InvoicePanel
        items={cart}
        onQuantity={handleQuantity}
        onRemove={handleRemove}
        onClear={handleClear}
        onCheckout={handleCreateOrder}
        customer={customer}
        onCustomerChange={setCustomer}
        newCustomer={newCustomer}
        onNewCustomerChange={setNewCustomer}
        isPending={isPending}
        error={submitError}
      />
    </div>
  );
}
