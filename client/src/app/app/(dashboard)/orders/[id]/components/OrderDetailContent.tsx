'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Printer, Undo2, X } from 'lucide-react';
import PageHeading from '@/components/dashboard/PageHeading';
import { DashDialog } from '@/components/dashboard/DashDialog';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { toast } from '@/components/ui/toast';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { getApiErrorMessage } from '@/services/apiClient';
import {
  cancelOrder,
  deleteOrderItem,
  refundOrder,
  saveItemStaff,
  saveOrderMaterials,
  updateOrderItemQty,
  type SaveItemStaffPayload,
  type SaveOrderMaterialPayload,
} from '@/services/order';
import { useOrderDetail } from '@/hooks/order';
import { queryKeys } from '@/hooks/query-keys';
import { useGeneralSettings, usePaymentSettings } from '@/hooks/settings';
import { useAppSelector } from '@/store/hook';
import { selectAuthUser } from '@/store/slices/authSlice';
import { printInvoice } from '@/lib/invoice';
import { useMaterialProducts } from '@/hooks/product';
import { useStaff } from '@/hooks/staff';
import useAuth from '@/hooks/use-auth';
import type { Product } from '@/types/product';
import type { Staff } from '@/types/staff';
import type { OrderDetailMaterial, OrderStatus } from '@/types/order';
import OrderDetailMain from './OrderDetailMain';
import OrderDetailSide from './OrderDetailSide';
import {
  buildMaterialLines,
  buildRetailLines,
  buildServiceLines,
  calcOrderProfit,
  materialSpec,
  staffInfoToAssignments,
  type StaffAssignment,
} from './orderDetailUtils';
import { formatDateTime } from '@/lib/format';
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
  const { data: productData, isLoading: productsLoading } = useMaterialProducts();
  const { data: staffData } = useStaff({ page: 1, pageSize: 100 });
  const { data: generalSettings } = useGeneralSettings();
  const { data: paymentSettings } = usePaymentSettings();
  const authUser = useAppSelector(selectAuthUser);
  const { can } = useAuth();
  const canViewProfit = can('reports:profit-view');

  const products = React.useMemo(() => toMap<Product>(productData ?? []), [productData]);
  const staff = React.useMemo(() => toMap<Staff>(staffData?.data ?? []), [staffData]);

  const staffList = React.useMemo(
    () => (staffData?.data ?? []).filter((s): s is Staff => s !== null && s !== undefined),
    [staffData],
  );
  const productList = React.useMemo(
    () => (productData ?? []).filter((p): p is Product => p !== null && p !== undefined),
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

  // Tích xác nhận ở bảng dịch vụ/SP -> PATCH số lượng, server quy đơn vị + chỉnh kho.
  const handleUpdateItemQty = React.useCallback(
    async (itemId: string, quantity: number, unit?: string) => {
      if (!id) return;
      try {
        await updateOrderItemQty(id, itemId, { quantity, unit: unit || null });
      } catch (err) {
        toast.add({
          title: 'Đổi số lượng thất bại',
          description: getApiErrorMessage(err),
          type: 'error',
        });
        throw err;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.order.detail(id) });
      toast.add({
        title: 'Đã đổi số lượng',
        description: 'Dòng hàng và giữ chỗ kho đã đồng bộ.',
        type: 'success',
      });
    },
    [id, queryClient],
  );

  const handleUpdateServiceQty = React.useCallback(
    (itemId: string, quantity: number) => handleUpdateItemQty(itemId, quantity),
    [handleUpdateItemQty],
  );

  const handleUpdateRetailQty = React.useCallback(
    (itemId: string, quantity: number, unit: string) =>
      handleUpdateItemQty(itemId, quantity, unit || undefined),
    [handleUpdateItemQty],
  );

  // Nút Xóa ở 2 bảng: confirm dialog rồi gọi API xóa dòng (server nhả kho + chốt tổng).
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Hủy / Hoàn cả đơn: confirm dialog rồi gọi API (server xử lý kho + trạng thái).
  const [orderAction, setOrderAction] = React.useState<'cancel' | 'refund' | null>(null);
  const [isActing, setIsActing] = React.useState(false);

  const confirmOrderAction = React.useCallback(async () => {
    if (!id || !orderAction || isActing) return;
    setIsActing(true);
    try {
      const acted = orderAction === 'cancel' ? await cancelOrder(id) : await refundOrder(id);
      setOrderAction(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.order.detail(id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.order.lists() });
      toast.add({
        title: orderAction === 'cancel' ? 'Đã hủy đơn hàng' : 'Đã hoàn đơn hàng',
        description: `Đơn ${acted.code} — kho và trạng thái đã cập nhật.`,
        type: 'success',
      });
    } catch (err) {
      toast.add({
        title: orderAction === 'cancel' ? 'Hủy đơn thất bại' : 'Hoàn đơn thất bại',
        description: getApiErrorMessage(err),
        type: 'error',
      });
    } finally {
      setIsActing(false);
    }
  }, [id, orderAction, isActing, queryClient]);

  const handleDeleteLine = React.useCallback((line: { id: string; name: string }) => {
    setDeleteTarget(line);
  }, []);

  const confirmDeleteLine = React.useCallback(async () => {
    if (!id || !deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteOrderItem(id, deleteTarget.id);
    } catch (err) {
      toast.add({
        title: 'Xóa dòng thất bại',
        description: getApiErrorMessage(err),
        type: 'error',
      });
      return;
    } finally {
      setIsDeleting(false);
    }
    setDeleteTarget(null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.order.detail(id) });
    toast.add({
      title: 'Đã xóa dòng hàng',
      description: `"${deleteTarget.name}" đã gỡ khỏi đơn, kho và tổng tiền cập nhật theo.`,
      type: 'success',
    });
  }, [id, deleteTarget, isDeleting, queryClient]);

  // Dialog Áp dụng -> gửi share thuần, server tự tính tiền (chỉ fixed gửi số nhập tay).
  const handleApplyStaff = React.useCallback(
    async (itemId: string, assignments: StaffAssignment[]) => {
      const payload: SaveItemStaffPayload[] = assignments
        .filter((a) => a.staffId)
        .map((a) => ({
          staff_id: a.staffId,
          type: a.kind,
          share_pct: a.kind === 'fixed' ? 0 : Math.max(0, a.value),
          commission_amount: a.kind === 'fixed' ? Math.max(0, Math.round(a.value)) : undefined,
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.order.detail(id) });
      toast.add({
        title: 'Đã lưu nhân viên thực hiện',
        description: 'Phân công và hoa hồng đã được đồng bộ.',
        type: 'success',
      });
    },
    [id, queryClient],
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
    await queryClient.invalidateQueries({ queryKey: queryKeys.order.detail(id) });
    toast.add({
      title: 'Đã lưu vật tư',
      description: 'Vật tư đã đồng bộ, kho giữ chỗ cập nhật theo.',
      type: 'success',
    });
  }, [id, queryClient]);

  const enriched = React.useMemo(() => {
    if (!detail) return null;
    const items = detail.items;
    const serviceLines = buildServiceLines(items, staff);
    const serviceNameByItemId = new Map(
      items.map((it) => [it.id, it.service?.name ?? 'Dịch vụ'] as const),
    );
    const visibleServerMaterials = detail.materials.filter(
      (m) => !deletedMaterialIds.includes(m.id),
    );
    const serverMaterials = buildMaterialLines(visibleServerMaterials).map((l) => {
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
            service_name: serviceNameByItemId.get(lm.itemId) ?? '',
            product: p
              ? {
                  name: p.name,
                  sku: p.sku,
                  unit: p.unit ?? null,
                  net_unit: p.net_unit ?? null,
                  net_amount: p.net_amount ?? null,
                }
              : null,
          } satisfies OrderDetailMaterial;
        }),
      ],
    };
    const retailLines = buildRetailLines(items, staff);
    const profit = calcOrderProfit(adjustedDetail, retailLines);
    // Hoa hồng do server tính sẵn (detail.commissions) — client chỉ map hiển thị.
    const itemTypeById = new Map(items.map((it) => [it.id, it.item_type] as const));
    return {
      serviceLines,
      materialLines: [...serverMaterials, ...localLines],
      retailLines,
      profit,
      commissions: (detail.commissions ?? []).map((c) => {
        const st = staff.get(c.staff_id);
        const suffix = itemTypeById.get(c.order_item_id) === 'product' ? ' SP' : '';
        return {
          staffId: c.staff_id,
          name: c.full_name || st?.full_name || 'Nhân viên',
          role: st?.position ?? '',
          rateText:
            c.type === 'percent'
              ? `${c.share_pct}% doanh thu${suffix}`
              : c.type === 'profit'
                ? `${c.share_pct}% lợi nhuận${suffix}`
                : 'Cố định',
          amount: Math.round(c.amount),
        };
      }),
      customer: detail.customer ?? undefined,
      hasPendingChanges:
        Object.keys(materialOverrides).length > 0 ||
        deletedMaterialIds.length > 0 ||
        localMaterials.length > 0,
    };
  }, [detail, products, staff, localMaterials, materialOverrides, deletedMaterialIds]);

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
  // Chỉ đơn chờ/xác nhận mới sửa được (thêm món qua POS) — khớp guard backend.
  const canEditOrder = order.status === 'pending' || order.status === 'confirm';

  const handlePrintInvoice = () => {
    const lines = detail.items.map((item) => ({
      name:
        item.service?.name ??
        item.product?.name ??
        (item.item_type === 'service' ? 'Dịch vụ' : 'Sản phẩm'),
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    }));

    const opened = printInvoice({
      order,
      lines,
      payments: detail.payments,
      organization: generalSettings?.organization,
      receipt: paymentSettings?.receipt,
      customer: enriched.customer
        ? { full_name: enriched.customer.full_name, phone: enriched.customer.phone }
        : undefined,
      cashierName: authUser?.full_name,
    });

    if (!opened) {
      toast.add({
        title: 'Không mở được cửa sổ in',
        description: 'Trình duyệt đang chặn popup. Vui lòng cho phép popup rồi thử lại.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeading
        backButton={{ label: 'Quay lại danh sách đơn' }}
        breadcrumbs={[
          { label: 'Trang chủ', href: '#' },
          { label: 'Đơn hàng', href: '/orders' },
          { label: order.code },
        ]}
        title={`Chi tiết đơn hàng ${order.code}`}
        badge={meta.label}
        badgeVariant="soft"
        description={
          <div className="mt-0.5 space-y-1 text-xs text-on-surface-variant">
            <p>Thời gian tạo đơn: {formatDateTime(order.created_at)}</p>
            {order.description && <p className="max-w-3xl text-on-surface">{order.description}</p>}
          </div>
        }
        actions={[
          { label: 'In hóa đơn', icon: Printer, variant: 'outline', onClick: handlePrintInvoice },
          ...((order.status === 'pending' || order.status === 'confirm') && can('order:cancel')
            ? [
                {
                  label: 'Hủy đơn',
                  icon: X,
                  variant: 'outline' as const,
                  onClick: () => setOrderAction('cancel'),
                },
              ]
            : []),
          ...(order.status === 'completed' && can('order:refund')
            ? [
                {
                  label: 'Hoàn đơn',
                  icon: Undo2,
                  variant: 'outline' as const,
                  onClick: () => setOrderAction('refund'),
                },
              ]
            : []),
          ...(canEditOrder
            ? [
                {
                  label: 'Chỉnh sửa',
                  icon: Pencil,
                  variant: 'primary' as const,
                  onClick: () => router.push(`/cashier/pos?orderId=${order.id}`),
                },
              ]
            : []),
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
            productsLoading={productsLoading}
            hasPendingChanges={enriched.hasPendingChanges}
            canEditItems={canEditOrder}
            canEditMaterials={canEditOrder}
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
            onUpdateServiceQty={handleUpdateServiceQty}
            onDeleteService={handleDeleteLine}
            onUpdateRetailQty={handleUpdateRetailQty}
            onDeleteRetail={handleDeleteLine}
            canViewProfit={canViewProfit}
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
            canViewProfit={canViewProfit}
          />
        </div>
      </div>

      <DashDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        title="Xóa dòng hàng?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" sẽ bị gỡ khỏi đơn ${order.code}. Tiền đơn và giữ chỗ kho cập nhật theo.`
            : undefined
        }
        maxWidth="max-w-[480px]"
        footer={
          <div className="flex w-full items-center justify-end gap-2.5">
            <Button variant="outline" disabled={isDeleting} onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              disabled={isDeleting}
              onClick={() => void confirmDeleteLine()}
              className="bg-error text-white hover:bg-error/90"
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa dòng'}
            </Button>
          </div>
        }
      >
        <p className="text-xs text-on-surface-variant">
          Hành động này không thể hoàn tác. Muốn bỏ cả đơn thì dùng Hủy đơn thay thế.
        </p>
      </DashDialog>

      <DashDialog
        open={orderAction !== null}
        onOpenChange={(v) => {
          if (!v) setOrderAction(null);
        }}
        title={orderAction === 'cancel' ? 'Hủy đơn hàng?' : 'Hoàn đơn hàng?'}
        description={
          orderAction === 'cancel'
            ? `Đơn ${order.code} sẽ bị hủy, giữ chỗ kho được nhả.`
            : `Đơn ${order.code} sẽ được hoàn, kho đã trừ được cộng lại.`
        }
        maxWidth="max-w-[480px]"
        footer={
          <div className="flex w-full items-center justify-end gap-2.5">
            <Button variant="outline" disabled={isActing} onClick={() => setOrderAction(null)}>
              Hủy
            </Button>
            <Button
              disabled={isActing}
              onClick={() => void confirmOrderAction()}
              className="bg-error text-white hover:bg-error/90"
            >
              {isActing ? 'Đang xử lý...' : orderAction === 'cancel' ? 'Hủy đơn' : 'Hoàn đơn'}
            </Button>
          </div>
        }
      >
        <p className="text-xs text-on-surface-variant">Hành động này không thể hoàn tác.</p>
      </DashDialog>
    </div>
  );
}
