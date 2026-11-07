'use client';

import { useState } from 'react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { DashInput } from '@/components/dashboard/DashInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import useCreateSupplier from '@/hooks/use-create-supplier';
import { getApiErrorMessage } from '@/services/apiClient';
import type { Supplier } from '@/types/supplier';

type SupplierCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (supplier: Supplier) => void;
};

const labelClass = 'mb-1.5 block min-w-0 text-xs font-semibold text-on-surface';

export default function SupplierCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: SupplierCreateDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const { mutate, isPending } = useCreateSupplier();

  const reset = () => {
    setName('');
    setPhone('');
    setAddress('');
    setNote('');
    setError('');
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhà cung cấp');
      return;
    }
    setError('');
    mutate(
      {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        note: note.trim() || null,
      },
      {
        onSuccess: (supplier) => {
          toast.add({
            title: 'Đã tạo nhà cung cấp',
            description: supplier.name,
            type: 'success',
          });
          onCreated?.(supplier);
          handleClose(false);
        },
        onError: (err) => {
          const message = getApiErrorMessage(err);
          setError(message);
          toast.add({ title: 'Tạo nhà cung cấp thất bại', description: message, type: 'error' });
        },
      },
    );
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={handleClose}
      title="Thêm nhà cung cấp"
      description="Tạo nhanh nhà cung cấp để chọn cho phiếu nhập."
      maxWidth="max-w-[520px]"
      footer={
        <DashDialogFooter
          onCancel={() => handleClose(false)}
          onConfirm={handleSubmit}
          confirmText="Tạo nhà cung cấp"
          loadingText="Đang tạo..."
          isLoading={isPending}
        />
      }
    >
      <div className="space-y-3 pt-4">
        <div>
          <Label className={labelClass}>Tên nhà cung cấp *</Label>
          <DashInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: L'Oréal Professionnel VN"
            className="bg-surface-container"
            autoFocus
          />
        </div>
        <div>
          <Label className={labelClass}>Số điện thoại</Label>
          <DashInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0901234567"
            className="bg-surface-container"
          />
        </div>
        <div>
          <Label className={labelClass}>Địa chỉ</Label>
          <DashInput
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Địa chỉ nhà cung cấp"
            className="bg-surface-container"
          />
        </div>
        <div>
          <Label className={labelClass}>Ghi chú</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thông tin thêm..."
            className="min-h-20 bg-surface-container text-xs"
          />
        </div>
        {error && <p className="text-[11px] text-error">{error}</p>}
      </div>
    </DashDialog>
  );
}
