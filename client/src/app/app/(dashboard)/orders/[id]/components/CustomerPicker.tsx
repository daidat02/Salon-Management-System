'use client';

import * as React from 'react';
import axios from 'axios';
import { Loader2, UserPlus } from 'lucide-react';
import { getCustomerByPhone, normalizePhone } from '@/services/customer';
import { getApiErrorMessage } from '@/services/apiClient';
import { updateOrderCustomer } from '@/services/order';
import { toast } from '@/components/ui/toast';

/**
 * Tìm/gắn khách hàng vào đơn (dùng khi đơn chưa có khách).
 * Luồng giống picker khách trong POS InvoicePanel: nhập SĐT -> Tìm (khách cũ),
 * không thấy -> chuyển sang nhập tên để tạo khách mới (server tự xử lý).
 */
export default function CustomerPicker({
  orderId,
  onAssigned,
}: {
  orderId: string;
  onAssigned: () => void;
}) {
  const [phone, setPhone] = React.useState('');
  const [isNewMode, setIsNewMode] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [lookupMsg, setLookupMsg] = React.useState<{
    kind: 'not-found' | 'error';
    text: string;
  } | null>(null);

  const handleFindByPhone = async () => {
    const target = normalizePhone(phone);
    if (!target || isLoading) return;
    setIsLoading(true);
    setLookupMsg(null);
    try {
      const found = await getCustomerByPhone(target);
      await updateOrderCustomer(orderId, { customer_id: found.id });
      toast.add({ title: `Đã gắn khách ${found.full_name} vào đơn`, type: 'success' });
      onAssigned();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setLookupMsg({
          kind: 'not-found',
          text: `Không tìm thấy khách với SĐT ${target} — nhập tên rồi bấm Lưu khách mới.`,
        });
        setIsNewMode(true);
      } else {
        setLookupMsg({ kind: 'error', text: getApiErrorMessage(err) || 'Tra cứu thất bại, thử lại sau.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNew = async () => {
    const target = normalizePhone(phone);
    if (!target || !newName.trim() || isLoading) return;
    setIsLoading(true);
    setLookupMsg(null);
    try {
      await updateOrderCustomer(orderId, {
        new_customer: { full_name: newName.trim(), phone: target },
      });
      toast.add({ title: `Đã thêm khách mới ${newName.trim()} vào đơn`, type: 'success' });
      onAssigned();
    } catch (err) {
      setLookupMsg({ kind: 'error', text: getApiErrorMessage(err) || 'Lưu khách mới thất bại.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-1.5">
      <div className="flex items-center gap-1">
        <input
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setLookupMsg(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void (isNewMode ? handleSaveNew() : handleFindByPhone());
            }
          }}
          placeholder="Nhập SĐT..."
          inputMode="tel"
          className="min-w-0 flex-1 rounded border border-outline bg-white px-1.5 py-1 text-[10px] text-on-surface focus:border-primary focus:outline-none"
        />
        {isNewMode && (
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên khách mới..."
            className="min-w-0 flex-1 rounded border border-outline bg-white px-1.5 py-1 text-[10px] text-on-surface focus:border-primary focus:outline-none"
          />
        )}
        {isNewMode ? (
          <button
            type="button"
            onClick={() => void handleSaveNew()}
            disabled={isLoading}
            className="flex shrink-0 items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            Lưu khách mới
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleFindByPhone()}
            disabled={isLoading}
            className="flex shrink-0 items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            Tìm
          </button>
        )}
      </div>
      {lookupMsg && (
        <p
          className={`mt-1 text-[10px] leading-snug font-medium ${
            lookupMsg.kind === 'not-found' ? 'text-warning' : 'text-error'
          }`}
        >
          {lookupMsg.text}
        </p>
      )}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-on-surface-variant">
          {isNewMode
            ? 'Nhập tên rồi Lưu — server tự tạo khách mới.'
            : 'Tìm khách đã có theo SĐT.'}
        </span>
        {isNewMode && (
          <button
            type="button"
            onClick={() => {
              setIsNewMode(false);
              setLookupMsg(null);
            }}
            className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
          >
            <UserPlus className="h-3 w-3" />
            Tìm khách cũ
          </button>
        )}
      </div>
    </div>
  );
}
