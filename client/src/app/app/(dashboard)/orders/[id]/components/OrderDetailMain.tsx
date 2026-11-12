'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Check,
  CheckCircle2,
  FlaskConical,
  PlusCircle,
  Scissors,
  Search,
  ShoppingBag,
  TrendingUp,
  X,
} from 'lucide-react';
import { TextButton } from '@/components/ui/text-button';
import DashTable, { type DashColumn } from '@/components/dashboard/DashTable';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import type { Product } from '@/types/product';
import type { Staff } from '@/types/staff';
import { buildUnitOptions } from '@/app/app/(dashboard)/inventory/(create)/components/voucherData';
import type {
  EnrichedMaterialLine,
  EnrichedRetailLine,
  EnrichedServiceLine,
  StaffAssignment,
} from './orderDetailUtils';
import { formatPlain, formatStockQuantity, formatVND } from '@/lib/format';
import StaffUpdateDialog from './StaffUpdateDialog';

// Ô nhập số lượng inline (giống bảng vật tư) + tích xác nhận / X hủy.
function QtyEditor({
  initial,
  unit,
  saving,
  onConfirm,
  onCancel,
}: {
  initial: number;
  unit?: string;
  saving: boolean;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = React.useState(String(initial));
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="number"
        min={0}
        step="any"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-16 rounded bg-surface-container px-1.5 py-1 text-center text-xs font-semibold text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
      />
      {unit ? <span className="text-[10px] text-on-surface-variant">{unit}</span> : null}
      <button
        type="button"
        title="Xác nhận"
        disabled={saving}
        onClick={() => {
          const n = Number(val);
          if (Number.isFinite(n) && n > 0) onConfirm(n);
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-success transition-colors hover:bg-success/10 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Hủy"
        onClick={onCancel}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function CardHeader({
  icon: Icon,
  iconClass,
  title,
  sub,
  badge,
}: {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  sub: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-on-surface">{title}</h3>
          <p className="text-xs text-on-surface-variant">{sub}</p>
        </div>
      </div>
      {badge}
    </div>
  );
}

type ServiceTableCtx = {
  canEdit: boolean;
  editingId: string | null;
  saving: boolean;
  onStartEdit: (id: string) => void;
  onConfirm: (id: string, qty: number) => void;
  onCancel: () => void;
  onEditStaff: (line: { id: string; name: string }) => void;
  onDelete: (line: { id: string; name: string }) => void;
};

function serviceColumns(ctx: ServiceTableCtx): DashColumn<EnrichedServiceLine>[] {
  return [
    {
      id: 'name',
      header: 'Tên dịch vụ',
      className: 'min-w-[200px]',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5 font-medium text-on-surface">{row.name}</div>
          {row.desc && <div className="mt-0.5 text-xs text-on-surface-variant">{row.desc}</div>}
        </div>
      ),
    },
    {
      id: 'duration',
      header: 'Thời lượng',
      className: 'min-w-[110px] whitespace-nowrap',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs">{row.duration}</span>
      ),
    },
    {
      id: 'staff',
      header: 'Stylist thực hiện',
      className: 'min-w-[180px]',
      cell: (row) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <div className="text-xs text-on-surface">{row.staffName}</div>
          {ctx.canEdit && (
            <TextButton title="Cập nhật nhân viên" onClick={() => ctx.onEditStaff(row)}>
              Chỉnh sửa
            </TextButton>
          )}
        </div>
      ),
    },
    {
      id: 'quantity',
      header: 'Số lượng',
      className: 'min-w-[150px] text-center whitespace-nowrap',
      cell: (row) =>
        ctx.editingId === row.id ? (
          <QtyEditor
            key={row.id}
            initial={row.quantity}
            saving={ctx.saving}
            onConfirm={(q) => ctx.onConfirm(row.id, q)}
            onCancel={ctx.onCancel}
          />
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-on-surface">
            x{row.quantity}
            {ctx.canEdit && (
              <TextButton title="Đổi số lượng" onClick={() => ctx.onStartEdit(row.id)}>
                Chỉnh sửa
              </TextButton>
            )}
          </span>
        ),
    },
    {
      id: 'lineTotal',
      header: 'Đơn giá & Thành tiền',
      className: 'min-w-[150px] text-right whitespace-nowrap',
      cell: (row) => (
        <span className="text-xs font-semibold text-on-surface">{formatVND(row.lineTotal)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-[52px] text-right',
      cell: (row) =>
        ctx.canEdit ? (
          <TextButton
            title="Xóa dòng"
            tone="danger"
            onClick={() => ctx.onDelete({ id: row.id, name: row.name })}
          >
            Xóa
          </TextButton>
        ) : null,
    },
  ];
}

type MaterialRow = EnrichedMaterialLine & { stt: number; stripe: boolean };

export type MaterialPatch = { unit?: string; quantity?: number; orderItemId?: string | null };

export type MaterialDraft = {
  id: string;
  unit: string;
  quantity: number;
  orderItemId: string | null;
};

type MaterialTableCtx = {
  services: EnrichedServiceLine[];
  productById: Map<string, Product>;
  canEdit: boolean;
  canViewProfit: boolean;
  editing: MaterialDraft | null;
  onStartEdit: (row: MaterialRow) => void;
  onDraft: (patch: { unit?: string; quantity?: number; orderItemId?: string | null }) => void;
  onConfirmEdit: (row: MaterialRow) => void;
  onCancelEdit: () => void;
  onUpdate: (materialId: string, patch: MaterialPatch) => void;
  onDelete: (materialId: string) => void;
};

const UNASSIGNED_SERVICE = '__none';

/** true với dòng thêm local (nháp chưa lưu) — luôn nhập trực tiếp, không qua toggle. */
const isLocalRow = (row: MaterialRow) => row.id.startsWith('local-');

function ServiceSelect({
  services,
  value,
  onChange,
}: {
  services: EnrichedServiceLine[];
  value: string | null;
  onChange: (orderItemId: string | null) => void;
}) {
  return (
    <select
      value={value ?? UNASSIGNED_SERVICE}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === UNASSIGNED_SERVICE ? null : v);
      }}
      onClick={(e) => e.stopPropagation()}
      className="h-8 w-full cursor-pointer rounded bg-surface-container px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
    >
      <option value={UNASSIGNED_SERVICE}>—</option>
      {services.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

function UnitSelect({
  product,
  value,
  onChange,
}: {
  product: Product | undefined;
  value: string;
  onChange: (unit: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="h-8 w-full cursor-pointer rounded bg-surface-container px-1.5 py-1 text-xs font-semibold text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
    >
      {product ? (
        buildUnitOptions(product).options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))
      ) : (
        <option value={value}>{value || '—'}</option>
      )}
    </select>
  );
}

// Cột mirror bảng "2. Danh mục sản phẩm & Vật tư" (VoucherDetailItemsCard),
// thao tác inline như page xuất kho + thêm cột "Dùng cho" chọn dịch vụ trong đơn.
function materialColumns(ctx: MaterialTableCtx): DashColumn<MaterialRow>[] {
  return [
    {
      id: 'product',
      header: 'Sản phẩm / Quy cách',
      className: 'min-w-[220px]',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate text-on-surface">
              <span className="truncate">{row.name}</span>
              {row.pending && (
                <Tag variant="warning" size="sm" shape="rounded">
                  Chưa lưu
                </Tag>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
              <span>
                SKU: <strong className="font-mono text-on-surface">{row.sku}</strong>
              </span>
              {row.spec ? (
                <>
                  <span>•</span>
                  <span>{row.spec}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'service',
      header: 'Dùng cho',
      className: 'min-w-[150px]',
      cell: (row) => {
        if (isLocalRow(row)) {
          return (
            <ServiceSelect
              services={ctx.services}
              value={row.orderItemId}
              onChange={(v) => ctx.onUpdate(row.id, { orderItemId: v })}
            />
          );
        }
        if (ctx.editing?.id === row.id) {
          return (
            <ServiceSelect
              services={ctx.services}
              value={ctx.editing.orderItemId}
              onChange={(v) => ctx.onDraft({ orderItemId: v })}
            />
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs text-on-surface">
            {row.serviceName}
            {ctx.canEdit && (
              <TextButton title="Đổi dịch vụ" onClick={() => ctx.onStartEdit(row)}>
                Chỉnh sửa
              </TextButton>
            )}
          </span>
        );
      },
    },
    {
      id: 'unit',
      header: 'Đơn vị xuất',
      className: 'min-w-[140px]',
      cell: (row) => {
        const p = ctx.productById.get(row.productId);
        if (isLocalRow(row)) {
          return (
            <UnitSelect
              product={p}
              value={row.unit}
              onChange={(v) => ctx.onUpdate(row.id, { unit: v })}
            />
          );
        }
        if (ctx.editing?.id === row.id) {
          return (
            <UnitSelect
              product={p}
              value={ctx.editing.unit}
              onChange={(v) => ctx.onDraft({ unit: v })}
            />
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface">
            {row.unit || '—'}
            {ctx.canEdit && (
              <TextButton title="Đổi đơn vị" onClick={() => ctx.onStartEdit(row)}>
                Chỉnh sửa
              </TextButton>
            )}
          </span>
        );
      },
    },
    {
      id: 'quantity',
      header: 'Số lượng',
      className: 'w-20 text-center',
      cell: (row) => {
        const p = ctx.productById.get(row.productId);
        if (isLocalRow(row)) {
          return (
            <div className="flex flex-col items-center gap-0.5">
              <input
                type="number"
                min={0}
                step="any"
                value={row.quantity}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  ctx.onUpdate(row.id, { quantity: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-16 rounded bg-surface-container px-1.5 py-1 text-center text-xs font-semibold focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <span className="text-[10px] text-on-surface-variant">
                Tồn: {formatStockQuantity(p?.stock_quantity || 0, p?.net_amount || 0, row.unit)}
              </span>
            </div>
          );
        }
        if (ctx.editing?.id === row.id) {
          return (
            <div className="flex flex-col items-center gap-0.5">
              <input
                type="number"
                min={0}
                step="any"
                value={ctx.editing.quantity}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  ctx.onDraft({ quantity: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-16 rounded bg-surface-container px-1.5 py-1 text-center text-xs font-semibold focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <span className="text-[10px] text-on-surface-variant">
                Tồn: {formatStockQuantity(p?.stock_quantity || 0, p?.net_amount || 0, p?.unit)}
              </span>
            </div>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface">
            {row.qtyText}
            {ctx.canEdit && (
              <TextButton title="Đổi số lượng" onClick={() => ctx.onStartEdit(row)}>
                Chỉnh sửa
              </TextButton>
            )}
          </span>
        );
      },
    },
    ...(ctx.canViewProfit
      ? [
          {
            id: 'unitCost',
            header: 'Đơn giá (đ)',
            className: 'text-right font-medium',
            cell: (row: MaterialRow) => formatPlain(row.unitCost),
          },
          {
            id: 'lineCost',
            header: 'Thành tiền (đ)',
            className: 'text-right font-semibold text-on-surface',
            cell: (row: MaterialRow) => formatPlain(row.lineCost),
          },
        ]
      : []),
    {
      id: 'actions',
      header: '',
      className: 'w-10 text-center',
      cell: (row) => {
        if (!isLocalRow(row) && ctx.editing?.id === row.id) {
          return (
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                title="Lưu thay đổi dòng này"
                onClick={() => ctx.onConfirmEdit(row)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-success transition-colors hover:bg-success/10"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Hủy"
                onClick={ctx.onCancelEdit}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          );
        }
        if (!ctx.canEdit) return null;
        return (
          <TextButton title="Xóa dòng" tone="danger" onClick={() => ctx.onDelete(row.id)}>
            Xóa
          </TextButton>
        );
      },
    },
  ];
}

type RetailTableCtx = {
  canEdit: boolean;
  canViewProfit: boolean;
  editingId: string | null;
  saving: boolean;
  onStartEdit: (id: string) => void;
  onConfirm: (id: string, qty: number) => void;
  onCancel: () => void;
  onEditStaff: (line: { id: string; name: string }) => void;
  onDelete: (line: { id: string; name: string }) => void;
};

function retailColumns(ctx: RetailTableCtx): DashColumn<EnrichedRetailLine>[] {
  return [
    {
      id: 'name',
      header: 'Tên sản phẩm',
      className: 'min-w-[200px]',
      cell: (row) => (
        <div>
          <div className="font-medium text-on-surface">{row.name}</div>
          {row.desc && <div className="text-xs text-on-surface-variant">{row.desc}</div>}
        </div>
      ),
    },
    {
      id: 'sku',
      header: 'Mã SKU',
      className: 'min-w-[110px] whitespace-nowrap',
      cell: (row) => <span className="font-mono text-xs text-on-surface-variant">{row.sku}</span>,
    },
    {
      id: 'staff',
      header: 'NV bán hàng',
      className: 'min-w-[180px]',
      cell: (row) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <div className="text-xs text-on-surface">{row.staffName}</div>
          {ctx.canEdit && (
            <TextButton title="Cập nhật nhân viên" onClick={() => ctx.onEditStaff(row)}>
              Chỉnh sửa
            </TextButton>
          )}
        </div>
      ),
    },
    {
      id: 'qtyText',
      header: 'Số lượng',
      className: 'min-w-[170px] text-center whitespace-nowrap',
      cell: (row) =>
        ctx.editingId === row.id ? (
          <QtyEditor
            key={row.id}
            initial={row.quantity}
            unit={row.unit}
            saving={ctx.saving}
            onConfirm={(q) => ctx.onConfirm(row.id, q)}
            onCancel={ctx.onCancel}
          />
        ) : (
          <span className="inline-flex items-center gap-1 font-medium text-on-surface">
            {row.qtyText}
            {ctx.canEdit && (
              <TextButton title="Đổi số lượng" onClick={() => ctx.onStartEdit(row.id)}>
                Chỉnh sửa
              </TextButton>
            )}
          </span>
        ),
    },
    {
      id: 'sellTotal',
      header: 'Giá bán lẻ',
      className: 'min-w-[140px] text-right whitespace-nowrap',
      cell: (row) => (
        <div>
          <div className="font-medium text-on-surface">{formatVND(row.sellTotal)}</div>
          <div className="text-[11px] text-on-surface-variant">({formatVND(row.sellUnit)}/đv)</div>
        </div>
      ),
    },
    ...(ctx.canViewProfit
      ? [
          {
            id: 'costTotal',
            header: 'Giá vốn nhập',
            className: 'min-w-[140px] text-right whitespace-nowrap',
            cell: (row: EnrichedRetailLine) => (
              <div className="text-xs text-on-surface-variant">
                <div>{formatVND(row.costTotal)}</div>
                <div className="text-[11px]">({formatVND(row.costUnit)}/đv)</div>
              </div>
            ),
          },
          {
            id: 'profit',
            header: 'Lợi nhuận gộp',
            className: 'min-w-[130px] text-right whitespace-nowrap',
            cell: (row: EnrichedRetailLine) => (
              <span className="font-semibold text-success">+{formatVND(row.profit)}</span>
            ),
          },
        ]
      : []),
    {
      id: 'actions',
      header: '',
      className: 'w-[52px] text-right',
      cell: (row) =>
        ctx.canEdit ? (
          <TextButton
            title="Xóa dòng"
            tone="danger"
            onClick={() => ctx.onDelete({ id: row.id, name: row.name })}
          >
            Xóa
          </TextButton>
        ) : null,
    },
  ];
}

export default function OrderDetailMain({
  services,
  materials,
  retail,
  staffList,
  products,
  hasPendingChanges,
  getInitialAssignments,
  onApplyStaff,
  onUpdateMaterial,
  onDeleteMaterial,
  onAddMaterial,
  onSaveMaterials,
  isSavingMaterials,
  canEditItems,
  canEditMaterials,
  onUpdateServiceQty,
  onDeleteService,
  onUpdateRetailQty,
  onDeleteRetail,
  canViewProfit,
}: {
  services: EnrichedServiceLine[];
  materials: EnrichedMaterialLine[];
  retail: EnrichedRetailLine[];
  staffList: Staff[];
  products: Product[];
  hasPendingChanges: boolean;
  getInitialAssignments: (itemId: string) => StaffAssignment[];
  onApplyStaff: (itemId: string, assignments: StaffAssignment[]) => Promise<void>;
  onUpdateMaterial: (materialId: string, patch: MaterialPatch) => void;
  onDeleteMaterial: (materialId: string) => void;
  onAddMaterial: (productId: string) => void;
  onSaveMaterials: () => Promise<void>;
  isSavingMaterials: boolean;
  /** false = đơn đã khóa: ẩn toàn bộ icon sửa/xóa dòng. */
  canEditItems: boolean;
  /** false = ẩn thêm/sửa/xóa vật tư (server cũng chặn đơn khóa). */
  canEditMaterials: boolean;
  onUpdateServiceQty: (itemId: string, quantity: number) => Promise<void>;
  onDeleteService: (line: { id: string; name: string }) => void;
  onUpdateRetailQty: (itemId: string, quantity: number, unit: string) => Promise<void>;
  onDeleteRetail: (line: { id: string; name: string }) => void;
  canViewProfit: boolean;
}) {
  const [updateTarget, setUpdateTarget] = React.useState<{
    id: string;
    name: string;
    kind: 'service' | 'retail';
  } | null>(null);
  const [editingQtyId, setEditingQtyId] = React.useState<string | null>(null);
  const [savingQtyId, setSavingQtyId] = React.useState<string | null>(null);
  // Nháp sửa 1 dòng vật tư: chỉ stage vào mảng replace khi bấm tích xác nhận.
  const [editingMat, setEditingMat] = React.useState<MaterialDraft | null>(null);

  const startMatEdit = React.useCallback((row: MaterialRow) => {
    setEditingMat({
      id: row.id,
      unit: row.unit,
      quantity: row.quantity,
      orderItemId: row.orderItemId ?? null,
    });
  }, []);

  const draftMatEdit = React.useCallback(
    (patch: { unit?: string; quantity?: number; orderItemId?: string | null }) => {
      setEditingMat((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [],
  );

  const cancelMatEdit = React.useCallback(() => setEditingMat(null), []);

  const confirmMatEdit = React.useCallback(
    (row: MaterialRow) => {
      const draft = editingMat;
      if (!draft || draft.id !== row.id) return;
      const patch: MaterialPatch = {};
      if (draft.unit !== row.unit) patch.unit = draft.unit;
      if (draft.quantity !== row.quantity) patch.quantity = draft.quantity;
      if ((draft.orderItemId ?? null) !== (row.orderItemId ?? null)) {
        patch.orderItemId = draft.orderItemId;
      }
      // Không đổi gì thì thoát êm, khỏi hiện nút Lưu thay đổi oan.
      if (Object.keys(patch).length > 0) onUpdateMaterial(row.id, patch);
      setEditingMat(null);
    },
    [editingMat, onUpdateMaterial],
  );
  const [matQuery, setMatQuery] = React.useState('');
  const [matFocused, setMatFocused] = React.useState(false);

  const cancelQtyEdit = React.useCallback(() => setEditingQtyId(null), []);

  const confirmServiceQty = React.useCallback(
    async (itemId: string, quantity: number) => {
      setSavingQtyId(itemId);
      try {
        await onUpdateServiceQty(itemId, quantity);
        setEditingQtyId(null);
      } finally {
        setSavingQtyId(null);
      }
    },
    [onUpdateServiceQty],
  );

  const confirmRetailQty = React.useCallback(
    async (itemId: string, quantity: number) => {
      const line = retail.find((l) => l.id === itemId);
      setSavingQtyId(itemId);
      try {
        await onUpdateRetailQty(itemId, quantity, line?.unit ?? '');
        setEditingQtyId(null);
      } finally {
        setSavingQtyId(null);
      }
    },
    [onUpdateRetailQty, retail],
  );
  const serviceTotal = services.reduce((s, l) => s + l.lineTotal, 0);
  const materialRows: MaterialRow[] = materials.map((m, i) => ({
    ...m,
    stt: i + 1,
    stripe: i % 2 === 1,
  }));
  const productById = React.useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  // Vật tư thêm được: loại material/both, chưa có trong bảng.
  const addedProductIds = React.useMemo(
    () => new Set(materials.map((m) => m.productId).filter(Boolean)),
    [materials],
  );
  const matSuggestions = React.useMemo(() => {
    const q = matQuery.trim().toLowerCase();
    return products
      .filter((p) => p.product_type !== 'retail' && !addedProductIds.has(p.id))
      .filter(
        (p) =>
          q === '' || p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [products, addedProductIds, matQuery]);
  const materialTotal = materials.reduce((s, l) => s + l.lineCost, 0);
  const retailRevenue = retail.reduce((s, l) => s + l.sellTotal, 0);
  const retailCost = retail.reduce((s, l) => s + l.costTotal, 0);
  const retailProfit = retailRevenue - retailCost;

  return (
    <>
      <section className="space-y-3 ">
        <div className="bg-surface rounded-lg p-4 shadow-sm">
          <CardHeader
            icon={Scissors}
            iconClass="bg-primary-container text-primary"
            title="Dịch vụ trong đơn"
            sub="Quy trình thực hiện bởi đội ngũ Stylist chính"
            badge={
              <span className="rounded-md bg-primary-container px-2.5 py-1 text-xs font-semibold text-primary">
                {services.length} dịch vụ
              </span>
            }
          />
        </div>
        <DashTable
          columns={serviceColumns({
            canEdit: canEditItems,
            editingId: editingQtyId,
            saving: savingQtyId !== null,
            onStartEdit: (id) => setEditingQtyId(id),
            onConfirm: (id, qty) => void confirmServiceQty(id, qty),
            onCancel: cancelQtyEdit,
            onEditStaff: (row) => setUpdateTarget({ id: row.id, name: row.name, kind: 'service' }),
            onDelete: onDeleteService,
          })}
          data={services}
          getRowId={(row) => row.id}
          selectable={false}
          emptyText="Đơn không có dịch vụ."
          footer={
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-medium text-on-surface-variant">
                Tổng giá trị dịch vụ thực hiện
              </span>
              <div className="text-base font-bold tracking-tight text-primary">
                {formatVND(serviceTotal)}
              </div>
            </div>
          }
        />
      </section>

      <section className="space-y-3 ">
        <div className="bg-surface space-y-3 rounded-lg p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="min-w-0 flex-1">
              <CardHeader
                icon={FlaskConical}
                iconClass="bg-orange-50 text-warning"
                title="Vật tư đã sử dụng (Tiêu hao nội bộ)"
                sub="Khấu trừ trực tiếp từ kho hóa chất salon"
                badge={
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-medium text-on-surface-variant">
                      {materials.length} mục
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Tự động xuất kho
                    </span>
                  </span>
                }
              />
            </div>
            {canEditMaterials && (
              <div className="relative w-full">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <input
                  value={matQuery}
                  onChange={(e) => setMatQuery(e.target.value)}
                  onFocus={() => setMatFocused(true)}
                  onBlur={() => setTimeout(() => setMatFocused(false), 150)}
                  placeholder="Thêm vật tư: tìm theo tên, SKU..."
                  className="w-full rounded-lg bg-surface-container py-2 pr-3 pl-9 text-xs text-on-surface shadow-inner placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {matFocused && (
                  <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-outline bg-surface shadow-md">
                    {matSuggestions.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-on-surface-variant">
                        Không tìm thấy vật tư phù hợp.
                      </div>
                    ) : (
                      matSuggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            onAddMaterial(p.id);
                            setMatQuery('');
                          }}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-container"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-on-surface">
                              {p.name}
                            </span>
                            <span className="font-mono text-[11px] text-on-surface-variant">
                              SKU: {p.sku} • {formatPlain(p.cost_price ?? 0)}đ
                            </span>
                          </span>
                          <PlusCircle className="h-4 w-4 shrink-0 text-primary" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <DashTable
          columns={materialColumns({
            services,
            productById,
            canEdit: canEditMaterials,
            canViewProfit,
            editing: editingMat,
            onStartEdit: startMatEdit,
            onDraft: draftMatEdit,
            onConfirmEdit: confirmMatEdit,
            onCancelEdit: cancelMatEdit,
            onUpdate: onUpdateMaterial,
            onDelete: onDeleteMaterial,
          })}
          data={materialRows}
          getRowId={(row) => row.id}
          selectable={false}
          emptyText="Đơn không tiêu hao vật tư."
          rowClassName={(row) => (row.stripe ? 'bg-surface-container/20' : undefined)}
          footer={
            canViewProfit ? (
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-medium text-on-surface-variant">
                  Tổng chi phí vật tư tiêu hao:
                </span>
                <div className="text-sm font-bold text-on-surface">{formatVND(materialTotal)}</div>
              </div>
            ) : undefined
          }
        />
        {hasPendingChanges && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-xs font-medium text-amber-800">
              Có thay đổi vật tư chưa lưu — bấm Lưu để đồng bộ (server tự quy đơn vị + tính giá).
            </span>
            <Button size="sm" disabled={isSavingMaterials} onClick={() => void onSaveMaterials()}>
              {isSavingMaterials ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3 ">
        <div className="bg-surface rounded-lg p-4 shadow-sm">
          <CardHeader
            icon={ShoppingBag}
            iconClass="bg-blue-50 text-primary"
            title="Sản phẩm bán lẻ mang về"
            sub="Chăm sóc tóc tại nhà chính hãng"
            badge={
              <span className="rounded-md bg-primary-container px-2.5 py-1 text-xs font-semibold text-primary">
                {retail.length} sản phẩm
              </span>
            }
          />
        </div>

        <DashTable
          columns={retailColumns({
            canEdit: canEditItems,
            canViewProfit,
            editingId: editingQtyId,
            saving: savingQtyId !== null,
            onStartEdit: (id) => setEditingQtyId(id),
            onConfirm: (id, qty) => void confirmRetailQty(id, qty),
            onCancel: cancelQtyEdit,
            onEditStaff: (row) => setUpdateTarget({ id: row.id, name: row.name, kind: 'retail' }),
            onDelete: onDeleteRetail,
          })}
          data={retail}
          getRowId={(row) => row.id}
          selectable={false}
          emptyText="Đơn không có sản phẩm bán lẻ."
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-on-surface-variant">
                Doanh thu bán lẻ:{' '}
                <span className="font-semibold text-on-surface">{formatVND(retailRevenue)}</span>
              </div>
              {canViewProfit && (
                <>
                  <div className="text-on-surface-variant">
                    Tổng giá vốn:{' '}
                    <span className="font-semibold text-on-surface">{formatVND(retailCost)}</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-success">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Lãi gộp sản phẩm: {formatVND(retailProfit)}
                  </div>
                </>
              )}
            </div>
          }
        />
      </section>
      {updateTarget && (
        <StaffUpdateDialog
          key={updateTarget.id}
          open={updateTarget !== null}
          onOpenChange={(v) => {
            if (!v) setUpdateTarget(null);
          }}
          serviceName={updateTarget.name}
          subjectKind={updateTarget.kind}
          staffList={staffList}
          initialAssignments={getInitialAssignments(updateTarget.id)}
          onApply={(assignments) => onApplyStaff(updateTarget.id, assignments)}
        />
      )}
    </>
  );
}
