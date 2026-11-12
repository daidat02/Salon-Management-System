'use client';

import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import ServiceCatalog, { dotFor, type CatalogItem } from './ServiceCatalog';
import InvoicePanel, {
  type InvoiceItem,
  type NewCustomerDraft,
  type SelectedCustomer,
} from './InvoicePanel';
import type { AppointmentItem, AppointmentStatus } from '@/types/appointment';
import { normalizePhone } from '@/services/customer';
import { useCreateOrder } from '@/hooks/use-create-order';
import { useAddOrderItems } from '@/hooks/use-add-order-items';
import useOrderDetail from '@/hooks/use-order-detail';
import useAppointmentDetail from '@/hooks/use-appointment-detail';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/components/ui/toast';

const EDITABLE_STATUSES = ['pending', 'confirm'];
const APPOINTMENT_BLOCKED_STATUSES: AppointmentStatus[] = [
  'completed',
  'cancelled',
  'no_show',
];

/** Đưa 1 dòng món của lịch hẹn về item của giỏ POS (giá giữ theo lúc đặt lịch). */
function toInvoiceItem(it: AppointmentItem): InvoiceItem {
  const isService = it.item_type === 'service';
  return {
    id: (isService ? it.service_id : it.product_id) ?? it.id,
    name: (isService ? it.service_name : it.product_name) || (isService ? 'Dịch vụ' : 'Sản phẩm'),
    desc: '',
    price: it.unit_price,
    image: '',
    type: it.item_type,
    category: '',
    quantity: it.quantity,
    dotColor: dotFor(''),
  };
}

export default function PosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const appointmentId = searchParams.get('appointmentId');
  // Chế độ thêm món vào đơn có sẵn (đi từ nút Chỉnh sửa ở order_detail).
  const isEditMode = !!orderId;
  // Chế độ tạo đơn từ lịch hẹn; ưu tiên orderId nếu URL có cả hai.
  const isAppointmentMode = !!appointmentId && !isEditMode;
  const { data: editDetail } = useOrderDetail(orderId ?? undefined);
  const editOrder = editDetail?.order;
  const canEditOrder =
    !isEditMode || (editOrder != null && EDITABLE_STATUSES.includes(editOrder.status));

  const {
    data: appointmentDetail,
    isLoading: isAppointmentLoading,
    isError: isAppointmentError,
  } = useAppointmentDetail(isAppointmentMode ? appointmentId : undefined);
  const appointment = appointmentDetail?.appointment;
  const prefilledAppointmentRef = React.useRef<string | null>(null);

  const [cart, setCart] = React.useState<InvoiceItem[]>([]);
  const [customer, setCustomer] = React.useState<SelectedCustomer>(null);
  const [newCustomer, setNewCustomer] = React.useState<NewCustomerDraft | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const { mutate, isPending } = useCreateOrder();
  const { mutate: addMutate, isPending: isAddPending } = useAddOrderItems(orderId);

  // Prefill 1 lần cho mỗi lịch hẹn; người dùng vẫn sửa được giỏ sau đó.
  React.useEffect(() => {
    if (!isAppointmentMode || !appointmentDetail) return;
    const { appointment: appt, items } = appointmentDetail;
    if (prefilledAppointmentRef.current === appt.id) return;
    prefilledAppointmentRef.current = appt.id;

    const merged = new Map<string, InvoiceItem>();
    for (const it of items) {
      const line = toInvoiceItem(it);
      const existing = merged.get(line.id);
      if (existing) {
        existing.quantity += line.quantity;
      } else {
        merged.set(line.id, line);
      }
    }
    setCart([...merged.values()]);
    setCustomer({
      id: appt.customer_id,
      full_name: appt.customer_name || 'Khách hàng',
      phone: appt.customer_phone || '',
    });
  }, [isAppointmentMode, appointmentDetail]);

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
    if (cart.length === 0 || isPending || isAddPending) return;
    setSubmitError(null);

    if (isAppointmentMode) {
      let msg: string | null = null;
      if (isAppointmentLoading) {
        msg = 'Đang tải lịch hẹn, vui lòng thử lại.';
      } else if (isAppointmentError || !appointment) {
        msg = 'Không tải được lịch hẹn. Vui lòng tải lại trang.';
      } else if (APPOINTMENT_BLOCKED_STATUSES.includes(appointment.status)) {
        msg = `Lịch hẹn ${appointment.code} không thể tạo đơn.`;
      }
      if (msg) {
        setSubmitError(msg);
        toast.add({ title: 'Không thể tạo đơn', description: msg, type: 'error' });
        return;
      }
    }

    const items = cart.map((it) => ({
      item_type: it.type,
      service_id: it.type === 'service' ? it.id : null,
      product_id: it.type === 'product' ? it.id : null,
      staff_id: null,
      quantity: it.quantity,
    }));

    // Chế độ thêm món: đơn đã có khách, chỉ cần đẩy items lên rồi quay về chi tiết đơn.
    if (isEditMode && orderId) {
      if (!canEditOrder) {
        const msg = 'Đơn đã khóa (chỉ thêm món khi chờ/xác nhận).';
        setSubmitError(msg);
        toast.add({ title: 'Không thể thêm món', description: msg, type: 'error' });
        return;
      }
      addMutate(items, {
        onSuccess: (order) => {
          toast.add({
            title: 'Đã thêm món vào đơn',
            description: `Đơn ${order.code} — ${order.total_amount.toLocaleString('vi-VN')} đ`,
            type: 'success',
          });
          setCart([]);
          setSubmitError(null);
          router.push(`/orders/${orderId}`);
        },
        onError: (err) => {
          const msg = getApiErrorMessage(err);
          setSubmitError(msg);
          toast.add({ title: 'Thêm món thất bại', description: msg, type: 'error' });
        },
      });
      return;
    }

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
        appointment_id: isAppointmentMode ? appointmentId : null,
        discount_amount: 0,
        new_customer: customer?.id
          ? undefined
          : newCustomer
            ? { full_name: draftName, phone: draftPhone }
            : undefined,
        items,
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
          router.push('/cashier');
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
    <div className="space-y-4">
      {isAppointmentMode && (
        <div className="rounded-xl border border-outline bg-surface px-4 py-3">
          {isAppointmentLoading && (
            <p className="text-sm text-on-surface-variant">Đang tải thông tin lịch hẹn...</p>
          )}
          {isAppointmentError && (
            <p className="text-sm font-medium text-red-600">
              Không tải được lịch hẹn. Vui lòng tải lại trang.
            </p>
          )}
          {appointment && (
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-on-surface">
                  Tạo đơn từ lịch hẹn {appointment.code}
                  {appointment.customer_name ? ` — ${appointment.customer_name}` : ''}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Giá hiển thị theo lúc đặt lịch; tổng tiền sẽ tính lại theo giá hiện tại khi tạo
                  đơn.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

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
          isPending={isPending || isAddPending || (isAppointmentMode && isAppointmentLoading)}
          error={submitError}
          title={
            isEditMode
              ? `Đơn ${editOrder?.code ?? ''}`.trim()
              : isAppointmentMode && appointment
                ? `Lịch ${appointment.code}`
                : undefined
          }
          tagText={isEditMode ? 'Thêm món' : isAppointmentMode ? 'Từ lịch hẹn' : undefined}
          hideCustomer={isEditMode || isAppointmentMode}
          submitLabel={isEditMode ? 'Thêm vào đơn' : undefined}
          pendingLabel={isEditMode ? 'Đang thêm...' : undefined}
        />
      </div>
    </div>
  );
}
