'use client';

import * as React from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import { DashDialog } from '@/components/dashboard/DashDialog';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { DashInput } from '@/components/dashboard/DashInput';
import { Button } from '@/components/ui/button';
import type { Staff } from '@/types/staff';
import { type StaffAssignment, type CommissionKind } from './orderDetailUtils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  /** 'service' = dòng dịch vụ, 'retail' = dòng SP bán lẻ (đổi nhãn dialog). */
  subjectKind?: 'service' | 'retail';
  staffList: Staff[];
  initialAssignments: StaffAssignment[];
  onApply: (assignments: StaffAssignment[]) => Promise<void>;
};

const KIND_LABEL: Record<'service' | 'retail', { percent: string; profit: string; noun: string }> =
  {
    service: { percent: '% Dịch vụ', profit: '% Lợi nhuận dịch vụ', noun: 'dịch vụ' },
    retail: { percent: '% Doanh thu SP', profit: '% Lợi nhuận SP', noun: 'sản phẩm' },
  };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-medium text-on-surface-variant">{children}</label>
  );
}

type StaffRow = StaffAssignment & { key: string };

let rowSeq = 0;
const nextKey = () => `row-${++rowSeq}`;

export default function StaffUpdateDialog({
  open,
  onOpenChange,
  serviceName,
  subjectKind = 'service',
  staffList,
  initialAssignments,
  onApply,
}: Props) {
  const [staffRows, setStaffRows] = React.useState<StaffRow[]>(() =>
    initialAssignments.map((a) => ({ ...a, key: nextKey() })),
  );

  const usedStaffIds = new Set(staffRows.map((r) => r.staffId).filter(Boolean));

  const addStaffRow = () =>
    setStaffRows((prev) => [...prev, { key: nextKey(), staffId: '', kind: 'percent', value: 0 }]);

  const updateStaffRow = (key: string, patch: Partial<StaffRow>) =>
    setStaffRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const removeStaffRow = (key: string) => setStaffRows((prev) => prev.filter((r) => r.key !== key));

  const [isSaving, setIsSaving] = React.useState(false);

  const handleApply = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onApply(
        staffRows
          .filter((r) => r.staffId)
          .map((r) => ({ staffId: r.staffId, kind: r.kind, value: Math.max(0, r.value) })),
      );
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Cập nhật nhân viên — ${serviceName}`}
      description={`Thiết lập nhân viên thực hiện và mức hoa hồng cho ${KIND_LABEL[subjectKind].noun} này. Bấm Áp dụng để lưu thẳng lên server.`}
      maxWidth="max-w-[672px]"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
            <Info className="h-4 w-4 shrink-0" />
            Tổng % các dòng % doanh thu / % lợi nhuận phải bằng 100
          </span>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button disabled={isSaving} onClick={() => void handleApply()}>
              {isSaving ? 'Đang lưu...' : 'Áp dụng'}
            </Button>
          </div>
        </div>
      }
    >
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h4 className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
            Nhân viên thực hiện
          </h4>
          <span className="text-[11px] font-medium text-primary">
            Tỷ lệ theo {KIND_LABEL[subjectKind].noun}
          </span>
        </div>
        <div className="space-y-2.5">
          {staffRows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-12 items-center gap-2.5 rounded-xl border border-outline/60 bg-surface-container-low/60 p-3"
            >
              <div className="col-span-5 min-w-0">
                <FieldLabel>Stylist / Thợ</FieldLabel>
                <DashSelect
                  value={row.staffId}
                  onValueChange={(v) => updateStaffRow(row.key, { staffId: v })}
                  placeholder="Chọn nhân viên..."
                  triggerClassName="h-8 bg-surface text-xs"
                  options={staffList
                    .filter((s) => s.id === row.staffId || !usedStaffIds.has(s.id))
                    .map((s) => ({
                      label: s.position ? `${s.full_name} (${s.position})` : s.full_name,
                      value: s.id,
                    }))}
                />
              </div>
              <div className="col-span-3 min-w-0">
                <FieldLabel>Loại hoa hồng</FieldLabel>
                <DashSelect
                  value={row.kind}
                  onValueChange={(v) => updateStaffRow(row.key, { kind: v as StaffRow['kind'] })}
                  triggerClassName="h-8 bg-surface text-xs!"
                  options={
                    [
                      { label: KIND_LABEL[subjectKind].percent, value: 'percent' },
                      { label: 'Số tiền cố định (VNĐ)', value: 'fixed' },
                      { label: KIND_LABEL[subjectKind].profit, value: 'profit' },
                    ] satisfies { label: string; value: CommissionKind }[]
                  }
                />
              </div>
              <div className="col-span-3 min-w-0">
                <FieldLabel>Mức hưởng</FieldLabel>
                <div className="relative">
                  <DashInput
                    type="number"
                    min={0}
                    value={row.value}
                    onChange={(e) =>
                      updateStaffRow(row.key, { value: Number(e.target.value) || 0 })
                    }
                    className="h-8 bg-surface pr-7 text-center text-xs!"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] font-semibold text-on-surface-variant">
                    {row.kind === 'fixed' ? 'đ' : '%'}
                  </span>
                </div>
              </div>
              <div className="col-span-1 flex justify-center pt-5">
                <button
                  type="button"
                  title="Xóa nhân viên"
                  onClick={() => removeStaffRow(row.key)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addStaffRow}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 py-2.5 text-xs font-medium text-primary transition-all hover:border-primary hover:bg-primary/10 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm nhân viên</span>
          </button>
        </div>
      </section>
    </DashDialog>
  );
}
