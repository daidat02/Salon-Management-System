'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  CheckCircle2,
  FlaskConical,
  Pencil,
  PlusCircle,
  Scissors,
  Search,
  ShoppingBag,
  Timer,
  Trash2,
  TrendingUp,
} from 'lucide-react';
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
import { formatVND } from './orderDetailUtils';
import StaffUpdateDialog from './StaffUpdateDialog';

function formatPlain(n: number): string {
  return n.toLocaleString('vi-VN');
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

function serviceColumns(
  onUpdate: (line: EnrichedServiceLine) => void,
): DashColumn<EnrichedServiceLine>[] {
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
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs">{row.duration}</span>
      ),
    },
    {
      id: 'staff',
      header: 'Stylist thực hiện',
      cell: (row) => (
        <div>
          <div className="text-xs text-on-surface">{row.staffName}</div>
        </div>
      ),
    },
    {
      id: 'quantity',
      header: 'Số lượng',
      className: 'text-center',
      cell: (row) => <span className="text-xs text-on-surface">x{row.quantity}</span>,
    },
    {
      id: 'lineTotal',
      header: 'Đơn giá & Thành tiền',
      className: 'text-right',
      cell: (row) => (
        <span className="text-xs font-semibold text-on-surface">{formatVND(row.lineTotal)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-[52px] text-right',
      cell: (row) => (
        <button
          type="button"
          title="Cập nhật nhân viên"
          onClick={() => onUpdate(row)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-outline text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];
}

type MaterialRow = EnrichedMaterialLine & { stt: number; stripe: boolean };

export type MaterialPatch = { unit?: string; quantity?: number; orderItemId?: string | null };

type MaterialTableCtx = {
  services: EnrichedServiceLine[];
  productById: Map<string, Product>;
  onUpdate: (materialId: string, patch: MaterialPatch) => void;
  onDelete: (materialId: string) => void;
};

const UNASSIGNED_SERVICE = '__none';

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
      cell: (row) => (
        <select
          value={row.orderItemId ?? UNASSIGNED_SERVICE}
          onChange={(e) => {
            const v = e.target.value;
            ctx.onUpdate(row.id, { orderItemId: v === UNASSIGNED_SERVICE ? null : v });
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-8 w-full cursor-pointer rounded bg-surface-container px-1.5 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value={UNASSIGNED_SERVICE}>—</option>
          {ctx.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: 'unit',
      header: 'Đơn vị xuất',
      className: 'min-w-[140px]',
      cell: (row) => {
        const p = ctx.productById.get(row.productId);
        return (
          <select
            value={row.unit}
            onChange={(e) => ctx.onUpdate(row.id, { unit: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="h-8 w-full cursor-pointer rounded bg-surface-container px-1.5 py-1 text-xs font-semibold text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {p ? (
              buildUnitOptions(p).options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            ) : (
              <option value={row.unit}>{row.unit || '—'}</option>
            )}
          </select>
        );
      },
    },
    {
      id: 'quantity',
      header: 'Số lượng',
      className: 'w-20 text-center',
      cell: (row) => {
        const p = ctx.productById.get(row.productId);
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
              Tồn: {(p?.stock_quantity ?? 0).toLocaleString('vi-VN')} {p?.unit ?? ''}
            </span>
          </div>
        );
      },
    },
    {
      id: 'unitCost',
      header: 'Đơn giá (đ)',
      className: 'text-right font-medium',
      cell: (row) => formatPlain(row.unitCost),
    },
    {
      id: 'lineCost',
      header: 'Thành tiền (đ)',
      className: 'text-right font-semibold text-on-surface',
      cell: (row) => formatPlain(row.lineCost),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-10 text-center',
      cell: (row) => (
        <button
          type="button"
          title="Xóa dòng"
          onClick={() => ctx.onDelete(row.id)}
          className="rounded p-1 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];
}

const retailColumns: DashColumn<EnrichedRetailLine>[] = [
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
    cell: (row) => <span className="font-mono text-xs text-on-surface-variant">{row.sku}</span>,
  },
  {
    id: 'qtyText',
    header: 'Số lượng',
    className: 'text-center',
    cell: (row) => <span className="font-medium text-on-surface">{row.qtyText}</span>,
  },
  {
    id: 'sellTotal',
    header: 'Giá bán lẻ',
    className: 'text-right',
    cell: (row) => (
      <div>
        <div className="font-medium text-on-surface">{formatVND(row.sellTotal)}</div>
        <div className="text-[11px] text-on-surface-variant">({formatVND(row.sellUnit)}/đv)</div>
      </div>
    ),
  },
  {
    id: 'costTotal',
    header: 'Giá vốn nhập',
    className: 'text-right',
    cell: (row) => (
      <div className="text-xs text-on-surface-variant">
        <div>{formatVND(row.costTotal)}</div>
        <div className="text-[11px]">({formatVND(row.costUnit)}/đv)</div>
      </div>
    ),
  },
  {
    id: 'profit',
    header: 'Lợi nhuận gộp',
    className: 'text-right',
    cell: (row) => <span className="font-semibold text-success">+{formatVND(row.profit)}</span>,
  },
];

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
}) {
  const [updateTarget, setUpdateTarget] = React.useState<EnrichedServiceLine | null>(null);
  const [matQuery, setMatQuery] = React.useState('');
  const [matFocused, setMatFocused] = React.useState(false);
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
          columns={serviceColumns((row) => setUpdateTarget(row))}
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
          </div>
        </div>
        <DashTable
          columns={materialColumns({
            services,
            productById,
            onUpdate: onUpdateMaterial,
            onDelete: onDeleteMaterial,
          })}
          data={materialRows}
          getRowId={(row) => row.id}
          selectable={false}
          emptyText="Đơn không tiêu hao vật tư."
          rowClassName={(row) => (row.stripe ? 'bg-surface-container/20' : undefined)}
          footer={
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-medium text-on-surface-variant">
                Tổng chi phí vật tư tiêu hao:
              </span>
              <div className="text-sm font-bold text-on-surface">{formatVND(materialTotal)}</div>
            </div>
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
          columns={retailColumns}
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
              <div className="text-on-surface-variant">
                Tổng giá vốn:{' '}
                <span className="font-semibold text-on-surface">{formatVND(retailCost)}</span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-success">
                <TrendingUp className="h-3.5 w-3.5" />
                Lãi gộp sản phẩm: {formatVND(retailProfit)}
              </div>
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
          staffList={staffList}
          initialAssignments={getInitialAssignments(updateTarget.id)}
          onApply={(assignments) => onApplyStaff(updateTarget.id, assignments)}
        />
      )}
    </>
  );
}
