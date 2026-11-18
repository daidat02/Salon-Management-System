import type {
  OrderDetail,
  OrderDetailItem,
  OrderDetailMaterial,
  OrderItemProductInfo,
} from '@/types/order';
import type { Staff } from '@/types/staff';

export type EnrichedServiceLine = {
  id: string;
  name: string;
  desc: string;
  duration: string;
  staffId: string | null;
  staffName: string;
  staffRole: string;
  quantity: number;
  lineTotal: number;
};

export type EnrichedMaterialLine = {
  id: string;
  productId: string;
  orderItemId: string | null;
  serviceName: string;
  name: string;
  sku: string;
  spec: string;
  unit: string;
  quantity: number;
  qtyText: string;
  unitCost: number;
  lineCost: number;
  /** true khi dòng local, chưa có API lưu. */
  pending?: boolean;
};

export function materialSpec(
  p:
    | Pick<OrderItemProductInfo, 'net_amount' | 'net_unit' | 'unit'>
    | undefined
    | null,
): string {
  if (!p) return '';
  return p.net_amount ? `${p.net_amount}${p.net_unit ?? ''}` : `Đơn vị: ${p.unit ?? ''}`;
}

export type EnrichedRetailLine = {
  id: string;
  name: string;
  desc: string;
  sku: string;
  staffId: string | null;
  staffName: string;
  staffRole: string;
  quantity: number;
  /** Đơn vị lưu của dòng (đơn vị lớn của SP). */
  unit: string;
  qtyText: string;
  sellTotal: number;
  sellUnit: number;
  costTotal: number;
  costUnit: number;
  profit: number;
};

export type StaffCommission = {
  staffId: string;
  name: string;
  role: string;
  rateText: string;
  amount: number;
  /** true khi số này do thu ngân nhập tay (ghi đè), chưa có API lưu. */
  manual?: boolean;
};

/** Phân công nhân viên cho 1 dòng dịch vụ — nhập tay trong dialog, giữ local chờ API. */
export type CommissionKind = 'percent' | 'fixed' | 'profit';

export type StaffAssignment = {
  staffId: string;
  kind: CommissionKind;
  value: number;
};

/** Map NV server trả về sang shape dialog (mở lại dialog vẫn thấy số đã lưu). */
export function staffInfoToAssignments(
  staff: { staff_id: string | null; type: CommissionKind; share_pct: number; commission_amount: number }[] | null | undefined,
): StaffAssignment[] {
  return (staff ?? [])
    .filter((s) => s.staff_id)
    .map((s) => ({
      staffId: s.staff_id as string,
      kind: s.type,
      value: s.type === 'fixed' ? s.commission_amount : s.share_pct,
    }));
}

export function buildServiceLines(
  items: OrderDetailItem[],
  staff: Map<string, Staff>,
): EnrichedServiceLine[] {
  return items
    .filter((it) => it.item_type === 'service')
    .map((it) => {
      const svc = it.service;
      const assigned = resolveStaffDisplay(it, staff);
      return {
        id: it.id,
        name: svc?.name ?? 'Dịch vụ',
        desc: svc?.description ?? '',
        duration: svc ? `${svc.duration_minutes} phút` : '—',
        ...assigned,
        quantity: it.quantity,
        lineTotal: it.line_total,
      };
    });
}

/** Tên + vai trò NV hiển thị cho 1 dòng đơn (service/retail logic giống nhau).
 * Ưu tiên tên server trả về (kể cả NV đã nghỉ), fallback sang staff_id cũ. */
export function resolveStaffDisplay(
  it: Pick<OrderDetailItem, 'staff' | 'staff_id'>,
  staff: Map<string, Staff>,
): { staffId: string | null; staffName: string; staffRole: string } {
  const serverNames = (it.staff ?? [])
    .map((s) => s.full_name ?? staff.get(s.staff_id ?? '')?.full_name ?? 'NV')
    .filter(Boolean);
  const st = it.staff_id ? staff.get(it.staff_id) : undefined;
  return {
    staffId: it.staff?.[0]?.staff_id ?? it.staff_id,
    staffName:
      serverNames.length > 0 ? serverNames.join(', ') : st ? `Stylist ${st.full_name}` : '—',
    staffRole:
      serverNames.length > 1 ? `${serverNames.length} nhân viên` : (st?.position ?? ''),
  };
}

export function buildMaterialLines(materials: OrderDetailMaterial[]): EnrichedMaterialLine[] {
  return materials.map((m) => {
    const p = m.product;
    const unit = m.unit || p?.unit || '';
    return {
      id: m.id,
      productId: m.product_id,
      orderItemId: m.order_item_id,
      serviceName: m.service_name || '—',
      name: p?.name ?? 'Vật tư',
      sku: p?.sku ?? '—',
      spec: materialSpec(p),
      unit,
      quantity: m.quantity,
      qtyText: `${m.quantity} ${unit}`.trim(),
      unitCost: m.unit_cost_at_time,
      lineCost: m.quantity * m.unit_cost_at_time,
    };
  });
}

export function buildRetailLines(
  items: OrderDetailItem[],
  staff: Map<string, Staff>,
): EnrichedRetailLine[] {
  return items
    .filter((it) => it.item_type === 'product')
    .map((it) => {
      const p = it.product;
      const costUnit = it.cost_price ?? 0;
      const costTotal = it.quantity * costUnit;
      const unit = it.unit ?? p?.unit ?? '';
      return {
        id: it.id,
        name: p?.name ?? 'Sản phẩm',
        desc: p?.unit ? `Đơn vị: ${p.unit}` : '',
        sku: p?.sku ?? '—',
        ...resolveStaffDisplay(it, staff),
        quantity: it.quantity,
        unit,
        qtyText: `x${it.quantity}${unit ? ` ${unit}` : ''}`,
        sellTotal: it.line_total,
        sellUnit: it.quantity > 0 ? it.line_total / it.quantity : 0,
        costTotal,
        costUnit,
        profit: it.line_total - costTotal,
      };
    });
}

export type OrderProfit = {
  serviceRevenue: number;
  materialCost: number;
  serviceProfit: number;
  serviceMargin: number;
  retailRevenue: number;
  retailCost: number;
  retailProfit: number;
  retailMargin: number;
  totalProfit: number;
  totalRevenue: number;
  totalMargin: number;
};

export function calcOrderProfit(detail: OrderDetail, retailLines: EnrichedRetailLine[]): OrderProfit {
  const serviceRevenue = detail.items
    .filter((it) => it.item_type === 'service')
    .reduce((s, it) => s + it.line_total, 0);
  const materialCost = detail.materials.reduce((s, m) => s + m.quantity * m.unit_cost_at_time, 0);
  const serviceProfit = serviceRevenue - materialCost;
  const retailRevenue = retailLines.reduce((s, l) => s + l.sellTotal, 0);
  const retailCost = retailLines.reduce((s, l) => s + l.costTotal, 0);
  const retailProfit = retailRevenue - retailCost;
  const totalProfit = serviceProfit + retailProfit;
  const totalRevenue = serviceRevenue + retailRevenue;
  const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
  return {
    serviceRevenue,
    materialCost,
    serviceProfit,
    serviceMargin: pct(serviceProfit, serviceRevenue),
    retailRevenue,
    retailCost,
    retailProfit,
    retailMargin: pct(retailProfit, retailRevenue),
    totalProfit,
    totalRevenue,
    totalMargin: pct(totalProfit, totalRevenue),
  };
}

export function customerTier(totalSpent: number): { label: string; sub: string } {
  if (totalSpent >= 10000000) return { label: 'Hạng Vàng', sub: 'Khách hàng thân thiết' };
  if (totalSpent >= 5000000) return { label: 'Hạng Bạc', sub: 'Khách hàng thân thiết' };
  return { label: 'Hạng Thường', sub: 'Khách hàng mới' };
}
