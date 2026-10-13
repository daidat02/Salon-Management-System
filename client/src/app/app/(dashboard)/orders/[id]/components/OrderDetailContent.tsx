'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Pencil, Printer, Undo2 } from 'lucide-react';
import PageHeading from '@/components/dashboard/PageHeading';
import { Tag } from '@/components/ui/tag';
import { toast } from '@/components/ui/toast';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { getApiErrorMessage } from '@/services/apiClient';
import {
  saveItemStaff,
  saveOrderMaterials,
  type SaveItemStaffPayload,
  type SaveOrderMaterialPayload,
} from '@/services/order';
import useOrderDetail from '@/hooks/use-order-detail';
import useCustomer from '@/hooks/use-customer';
import useService from '@/hooks/use-service';
import useProduct from '@/hooks/use-product';
import useStaff from '@/hooks/use-staff';
import type { Customer } from '@/types/customer';
import type { Product } from '@/types/product';
import type { Service } from '@/types/service';
import type { Staff } from '@/types/staff';
import type { OrderDetailMaterial, OrderStatus } from '@/types/order';
import OrderDetailMain from './OrderDetailMain';
import OrderDetailSide from './OrderDetailSide';
import {
  buildMaterialLines,
  buildRetailLines,
  buildServiceLines,
  buildStaffCommissions,
  calcOrderProfit,
  formatDateTime,
  materialSpec,
  staffInfoToAssignments,
  type StaffAssignment,
} from './orderDetailUtils';
import { priceForUnit } from '@/app/app/(dashboard)/inventory/(create)/components/voucherData';

const statusMeta: Record<
  OrderStatus,
  { label: string; variant: 'success' | 'warning' | 'purple' | 'teal' | 'gray' | 'error' }
> = {
  pending: { label: 'Chờ xử lý', variant: 'warning' },
  confirm: { label: 'Đã xác nhận', variant: 'teal' },
  delivery: { label: 'Đang giao', variant: 'purple' },
  completed: { label: 'Hoàn tất', variant: 'success' },
  cancelled: { label: 'Đã hủy', variant: 'gray' },
  refunded: { label: 'Đã hoàn tiền', variant: 'error' },
};

function toMap<T extends { id: string }>(list: (T | null | undefined)[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of list ?? []) {
    if (item) map.set(item.id, item);
  }
  return map;
}

export default function OrderDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: detail, isLoading, isError, error } = useOrderDetail(id);
  const { data: customerData } = useCustomer({ page: 1, pageSize: 100 });
  const { data: serviceData } = useService({ page: 1, pageSize: 100 });
  const { data: productData } = useProduct({ page: 1, pageSize: 100 });
  const { data: staffData } = useStaff({ page: 1, pageSize: 100 });

  const services = React.useMemo(() => toMap<Service>(serviceData?.data ?? []), [serviceData]);
  const products = React.useMemo(() => toMap<Product>(productData?.data ?? []), [productData]);
  const staff = React.useMemo(() => toMap<Staff>(staffData?.data ?? []), [staffData]);
  const customers = React.useMemo(() => toMap<Customer>(customerData?.data ?? []), [customerData]);

  const staffList = React.useMemo(
    () => (staffData?.data ?? []).filter((s): s is Staff => s !== null && s !== undefined),
    [staffData],
  );
  const productList = React.useMemo(
    () => (productData?.data ?? []).filter((p): p is Product => p !== null && p !== undefined),
    [productData],
  );

  const [localMaterials, setLocalMaterials] = React.useState<
    { key: string; itemId: string; productId: string; unit: string; quantity: number }[]
  >([]);
  const localSeq = React.useRef(0);

  // Giá trị mở dialog: ưu tiên phân công server đã lưu, fallback staff_id cũ.
  const effectiveAssignments = React.useCallback(
    (item: {
      staff?:
        | {
            staff_id: string | null;
            type: StaffAssignment['kind'];
            share_pct: number;
            commission_amount: number;
          }[]
        | null;
      staff_id: string | null;
    }): StaffAssignment[] => {
      const saved = staffInfoToAssignments(item.staff);
      if (saved.length > 0) return saved;
      if (!item.staff_id) return [];
      const st = staff.get(item.staff_id);
      return [{ staffId: item.staff_id, kind: 'percent', value: st?.commission_rate ?? 0 }];
    },
    [staff],
  );

  const queryClient = useQueryClient();

  // Dialog Áp dụng -> gọi API trực tiếp, không giữ trạng thái chờ ngoài.
  const handleApplyStaff = React.useCallback(
    async (itemId: string, assignments: StaffAssignment[]) => {
      const items = detail?.items ?? [];
      const line = items.find((it) => it.id === itemId);
      const lineTotal = line?.line_total ?? 0;
      const serviceRevenue = items
        .filter((it) => it.item_type === 'service')
        .reduce((s, it) => s + it.line_total, 0);
      const materialCost = (detail?.materials ?? []).reduce(
        (s, m) => s + m.quantity * m.unit_cost_at_time,
        0,
      );
      const marginPct =
        serviceRevenue > 0 ? ((serviceRevenue - materialCost) / serviceRevenue) * 100 : 0;

      const payload: SaveItemStaffPayload[] = assignments
        .filter((a) => a.staffId)
        .map((a) => ({
          staff_id: a.staffId,
          type: a.kind,
          share_pct: a.kind === 'fixed' ? 0 : Math.max(0, a.value),
          commission_amount:
            a.kind === 'fixed'
              ? Math.max(0, Math.round(a.value))
              : a.kind === 'profit'
                ? Math.round(((lineTotal * marginPct) / 100) * (a.value / 100))
                : Math.round((lineTotal * a.value) / 100),
        }));

      try {
        await saveItemStaff(itemId, payload);
      } catch (err) {
        toast.add({
          title: 'Lưu nhân viên thất bại',
          description: getApiErrorMessage(err),
          type: 'error',
        });
        throw err;
      }
      // Server là nguồn đúng — refetch để hiện phân công vừa lưu.
      await queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
      toast.add({
        title: 'Đã lưu nhân viên thực hiện',
        description: 'Phân công và hoa hồng đã đồng bộ lên server.',
        type: 'success',
      });
    },
    [detail, id, queryClient],
  );

  // TODO(api): thay bằng endpoint vật tư khi backend có — tạm giữ local.
  const [materialOverrides, setMaterialOverrides] = React.useState<
    Record<string, { unit?: string; quantity?: number; orderItemId?: string | null }>
  >({});
  const [deletedMaterialIds, setDeletedMaterialIds] = React.useState<string[]>([]);
  const [isSavingMaterials, setIsSavingMaterials] = React.useState(false);

  const handleUpdateMaterial = React.useCallback(
    (
      materialId: string,
      patch: { unit?: string; quantity?: number; orderItemId?: string | null },
    ) => {
      if (materialId.startsWith('local-')) {
        setLocalMaterials((prev) =>
          prev.map((lm) => {
            if (lm.key !== materialId) return lm;
            return {
              ...lm,
              ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
              ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
              ...(patch.orderItemId !== undefined ? { itemId: patch.orderItemId ?? '' } : {}),
            };
          }),
        );
        return;
      }
      setMaterialOverrides((prev) => ({
        ...prev,
        [materialId]: { ...prev[materialId], ...patch },
      }));
    },
    [],
  );

  const handleDeleteMaterial = React.useCallback((materialId: string) => {
    if (materialId.startsWith('local-')) {
      setLocalMaterials((prev) => prev.filter((lm) => lm.key !== materialId));
    } else {
      setDeletedMaterialIds((prev) => (prev.includes(materialId) ? prev : [...prev, materialId]));
      toast.add({
        title: 'Đã xóa vật tư (chưa lưu)',
        description: 'Dòng này đang ẩn local — sẽ đồng bộ khi có API.',
        type: 'info',
      });
    }
  }, []);

  const handleAddMaterial = React.useCallback(
    (productId: string) => {
      const firstService = detail?.items.find((it) => it.item_type === 'service');
      const p = products.get(productId);
      localSeq.current += 1;
      const key = `local-${localSeq.current}`;
      setLocalMaterials((prev) => [
        ...prev,
        { key, itemId: firstService?.id ?? '', productId, unit: p?.unit ?? '', quantity: 1 },
      ]);
      toast.add({
        title: 'Đã thêm vật tư (chưa lưu)',
        description: `${p?.name ?? 'Vật tư'} — chọn dịch vụ và đơn vị ngay trong bảng.`,
        type: 'info',
      });
    },
    [detail, products],
  );

  const enrichedRef = React.useRef<{
    materialLines: {
      id: string;
      productId: string;
      orderItemId: string | null;
      name: string;
      quantity: number;
      unit: string;
    }[];
  } | null>(null);

  // Lưu toàn bộ vật tư đang hiển thị (server replace + tự quy đơn vị/tính giá).
  // Dòng nào chưa chọn "Dùng cho" thì chặn lại để thu ngân gán trước.
  const handleSaveMaterials = React.useCallback(async () => {
    const lines = enrichedRef.current?.materialLines ?? [];
    const payload: SaveOrderMaterialPayload[] = [];
    for (const l of lines) {
      if (!l.orderItemId) {
        const msg = `Vật tư "${l.name}" chưa chọn dịch vụ (cột Dùng cho).`;
        toast.add({ title: 'Thiếu dịch vụ', description: msg, type: 'error' });
        throw new Error(msg);
      }
      payload.push({
        order_item_id: l.orderItemId,
        product_id: l.productId,
        quantity: l.quantity,
        unit: l.unit || undefined,
      });
    }
    setIsSavingMaterials(true);
    try {
      await saveOrderMaterials(payload);
    } catch (err) {
      toast.add({
        title: 'Lưu vật tư thất bại',
        description: getApiErrorMessage(err),
        type: 'error',
      });
      throw err;
    } finally {
      setIsSavingMaterials(false);
    }
    // Server là nguồn đúng — xóa local, refetch để hiện số đã quy đổi.
    setMaterialOverrides({});
    setDeletedMaterialIds([]);
    setLocalMaterials([]);
    await queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
    toast.add({
      title: 'Đã lưu vật tư',
      description: 'Vật tư đã đồng bộ, kho giữ chỗ cập nhật theo.',
      type: 'success',
    });
  }, [id, queryClient]);

  const enriched = React.useMemo(() => {
    if (!detail) return null;
    const items = detail.items;
    const serviceLines = buildServiceLines(items, services, staff);
    const serviceNameByItemId = new Map(
      items.map((it) => {
        const svc = it.service_id ? services.get(it.service_id) : undefined;
        return [it.id, svc?.name ?? 'Dịch vụ'] as const;
      }),
    );
    const visibleServerMaterials = detail.materials.filter(
      (m) => !deletedMaterialIds.includes(m.id),
    );
    const serverMaterials = buildMaterialLines(
      visibleServerMaterials,
      products,
      serviceNameByItemId,
    ).map((l) => {
      const ov = materialOverrides[l.id];
      if (!ov) return l;
      const p = products.get(l.productId);
      const unit = ov.unit ?? l.unit;
      const quantity = ov.quantity ?? l.quantity;
      const unitCost = p && ov.unit !== undefined ? priceForUnit(p, unit || p.unit) : l.unitCost;
      return {
        ...l,
        orderItemId: ov.orderItemId !== undefined ? ov.orderItemId : l.orderItemId,
        serviceName:
          ov.orderItemId !== undefined
            ? (serviceNameByItemId.get(ov.orderItemId ?? '') ?? '—')
            : l.serviceName,
        unit,
        quantity,
        qtyText: `${quantity} ${unit}`.trim(),
        unitCost,
        lineCost: quantity * unitCost,
        pending: true as const,
      };
    });
    const localLines = localMaterials.map((lm) => {
      const p = products.get(lm.productId);
      const unit = lm.unit || p?.unit || '';
      const unitCost = p ? priceForUnit(p, unit || p.unit) : 0;
      return {
        id: lm.key,
        productId: lm.productId,
        orderItemId: lm.itemId,
        serviceName: serviceNameByItemId.get(lm.itemId) ?? '—',
        name: p?.name ?? 'Vật tư',
        sku: p?.sku ?? '—',
        spec: materialSpec(p),
        unit,
        quantity: lm.quantity,
        qtyText: `${lm.quantity} ${unit}`.trim(),
        unitCost,
        lineCost: lm.quantity * unitCost,
        pending: true as const,
      };
    });
    const adjustedDetail = {
      ...detail,
      items,
      materials: [
        ...visibleServerMaterials.map((m) => {
          const ov = materialOverrides[m.id];
          if (!ov) return m;
          const p = products.get(m.product_id);
          const unit = ov.unit ?? '';
          return {
            ...m,
            ...(ov.quantity !== undefined ? { quantity: ov.quantity } : {}),
            ...(ov.orderItemId ? { order_item_id: ov.orderItemId } : {}),
            ...(ov.unit !== undefined && p
              ? { unit_cost_at_time: priceForUnit(p, unit || p.unit) }
              : {}),
          };
        }),
        ...localMaterials.map((lm) => {
          const p = products.get(lm.productId);
          const unit = lm.unit || p?.unit || '';
          return {
            id: lm.key,
            order_item_id: lm.itemId,
            product_id: lm.productId,
            quantity: lm.quantity,
            unit_cost_at_time: p ? priceForUnit(p, unit || p.unit) : 0,
          } satisfies OrderDetailMaterial;
        }),
      ],
    };
    const retailLines = buildRetailLines(items, products);
    const profit = calcOrderProfit(adjustedDetail, retailLines);
    return {
      serviceLines,
      materialLines: [...serverMaterials, ...localLines],
      retailLines,
      profit,
      commissions: buildStaffCommissions(items, staff, undefined, profit.serviceMargin),
      customer: detail.order.customer_id ? customers.get(detail.order.customer_id) : undefined,
      hasPendingChanges:
        Object.keys(materialOverrides).length > 0 ||
        deletedMaterialIds.length > 0 ||
        localMaterials.length > 0,
    };
  }, [
    detail,
    services,
    products,
    staff,
    customers,
    localMaterials,
    materialOverrides,
    deletedMaterialIds,
  ]);

  React.useEffect(() => {
    enrichedRef.current = enriched;
  }, [enriched]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError || !detail || !enriched) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Không tải được chi tiết đơn hàng: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc
          kiểm tra kết nối API.
        </div>
      </div>
    );
  }

  const { order } = detail;
  const meta = statusMeta[order.status] ?? { label: order.status, variant: 'slate' as const };

  return (
    <div className="space-y-4">
      <PageHeading
        backButton={{ label: 'Quay lại danh sách đơn' }}
        breadcrumbs={[
          { label: 'Trang chủ', href: '#' },
          { label: 'Đơn hàng', href: '/app/orders' },
          { label: order.code },
        ]}
        title={`Chi tiết đơn hàng ${order.code}`}
        badge={meta.label}
        badgeVariant="soft"
        description={
          <p className="mt-0.5 flex items-center gap-2 text-xs text-on-surface-variant">
            <span>Thời gian tạo đơn: {formatDateTime(order.created_at)}</span>
          </p>
        }
        actions={[
          { label: 'In hóa đơn', icon: Printer, variant: 'outline', onClick: () => window.print() },
          { label: 'Hoàn tiền', icon: Undo2, variant: 'outline' },
          {
            label: 'Chỉnh sửa',
            icon: Pencil,
            variant: 'primary',
            onClick: () => router.push(`/app/cashier/pos?orderId=${order.id}`),
          },
        ]}
      />
      <div className="flex items-center gap-2">
        <Tag variant={meta.variant} shape="pill" size="md" dot>
          {meta.label}
        </Tag>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <OrderDetailMain
            services={enriched.serviceLines}
            materials={enriched.materialLines}
            retail={enriched.retailLines}
            staffList={staffList}
            products={productList}
            hasPendingChanges={enriched.hasPendingChanges}
            getInitialAssignments={(itemId) => {
              const it = detail.items.find((x) => x.id === itemId);
              if (!it) return [];
              return effectiveAssignments(it);
            }}
            onApplyStaff={handleApplyStaff}
            onUpdateMaterial={handleUpdateMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            onAddMaterial={handleAddMaterial}
            onSaveMaterials={handleSaveMaterials}
            isSavingMaterials={isSavingMaterials}
          />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <OrderDetailSide
            customer={enriched.customer}
            commissions={enriched.commissions}
            profit={enriched.profit}
            order={order}
            payments={detail.payments}
            cashierName="Thu ngân"
            services={enriched.serviceLines}
            retail={enriched.retailLines}
          />
        </div>
      </div>
    </div>
  );
}
