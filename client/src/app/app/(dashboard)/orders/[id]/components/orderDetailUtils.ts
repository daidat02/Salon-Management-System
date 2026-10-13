import type {
  OrderDetail,
  OrderDetailItem,
  OrderDetailMaterial,
} from '@/types/order';
import type { Product } from '@/types/product';
import type { Service } from '@/types/service';
import type { Staff } from '@/types/staff';

export function formatVND(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

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

export function materialSpec(p: { net_amount?: number | null; net_unit?: string | null; unit: string } | undefined): string {
  if (!p) return '';
  return p.net_amount ? `${p.net_amount}${p.net_unit ?? ''}` : `Đơn vị: ${p.unit}`;
}

export type EnrichedRetailLine = {
  id: string;
  name: string;
  desc: string;
  sku: string;
  quantity: number;
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
  services: Map<string, Service>,
  staff: Map<string, Staff>,
): EnrichedServiceLine[] {
  return items
    .filter((it) => it.item_type === 'service')
    .map((it) => {
      const svc = it.service_id ? services.get(it.service_id) : undefined;
      // Ưu tiên tên server trả về (kể cả NV đã nghỉ), fallback sang staff_id cũ.
      const serverNames = (it.staff ?? [])
        .map((s) => s.full_name ?? staff.get(s.staff_id ?? '')?.full_name ?? 'NV')
        .filter(Boolean);
      const st = it.staff_id ? staff.get(it.staff_id) : undefined;
      const staffName =
        serverNames.length > 0 ? serverNames.join(', ') : st ? `Stylist ${st.full_name}` : '—';
      const staffRole =
        serverNames.length > 1
          ? `${serverNames.length} nhân viên`
          : (st?.position ?? '');
      return {
        id: it.id,
        name: svc?.name ?? 'Dịch vụ',
        desc: svc?.description ?? '',
        duration: svc ? `${svc.duration_minutes} phút` : '—',
        staffId: it.staff?.[0]?.staff_id ?? it.staff_id,
        staffName,
        staffRole,
        quantity: it.quantity,
        lineTotal: it.line_total,
      };
    });
}

export function buildMaterialLines(
  materials: OrderDetailMaterial[],
  products: Map<string, Product>,
  serviceNameByItemId?: Map<string, string>,
): EnrichedMaterialLine[] {
  return materials.map((m) => {
    const p = products.get(m.product_id);
    const unit = m.unit || p?.unit || '';
    return {
      id: m.id,
      productId: m.product_id,
      orderItemId: m.order_item_id,
      serviceName: (m.order_item_id && serviceNameByItemId?.get(m.order_item_id)) || '—',
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
  products: Map<string, Product>,
): EnrichedRetailLine[] {
  return items
    .filter((it) => it.item_type === 'product')
    .map((it) => {
      const p = it.product_id ? products.get(it.product_id) : undefined;
      const costUnit = p?.cost_price ?? 0;
      const costTotal = it.quantity * costUnit;
      return {
        id: it.id,
        name: p?.name ?? 'Sản phẩm',
        desc: p ? `Đơn vị: ${p.unit}` : '',
        sku: p?.sku ?? '—',
        quantity: it.quantity,
        qtyText: `x${it.quantity}${p ? ` ${p.unit}` : ''}`,
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

export function buildStaffCommissions(
  items: OrderDetailItem[],
  staff: Map<string, Staff>,
  assignments?: Record<string, StaffAssignment[]>,
  /** Biên lợi nhuận dịch vụ (%) — dùng khi loại hoa hồng là % lợi nhuận. */
  serviceMarginPct = 0,
): StaffCommission[] {
  const byStaff = new Map<string, StaffCommission>();
  const merge = (c: StaffCommission) => {
    const prev = byStaff.get(c.staffId);
    byStaff.set(c.staffId, prev ? { ...c, amount: prev.amount + c.amount } : c);
  };
  for (const it of items) {
    if (it.item_type !== 'service') continue;
    const manual = assignments?.[it.id];
    const saved = !manual || manual.length === 0 ? (it.staff ?? []) : [];
    if (saved.length > 0) {
      for (const s of saved) {
        if (!s.staff_id) continue;
        const st = staff.get(s.staff_id);
        const rateText =
          s.type === 'percent'
            ? `${s.share_pct}% doanh thu`
            : s.type === 'profit'
              ? `${s.share_pct}% lợi nhuận`
              : 'Cố định';
        merge({
          staffId: s.staff_id,
          name: s.full_name ?? st?.full_name ?? 'Nhân viên',
          role: st?.position ?? '',
          rateText,
          amount: Math.round(s.commission_amount),
        });
      }
      continue;
    }
    if (manual && manual.length > 0) {
      for (const a of manual) {
        const st = staff.get(a.staffId);
        const amount =
          a.kind === 'percent'
            ? Math.round((it.line_total * a.value) / 100)
            : a.kind === 'profit'
              ? Math.round(((it.line_total * serviceMarginPct) / 100) * (a.value / 100))
              : Math.round(a.value);
        const rateText =
          a.kind === 'percent'
            ? `${a.value}% doanh thu (nhập tay)`
            : a.kind === 'profit'
              ? `${a.value}% lợi nhuận (nhập tay)`
              : `Cố định (nhập tay)`;
        merge({
          staffId: a.staffId,
          name: st?.full_name ?? 'Nhân viên',
          role: st?.position ?? '',
          rateText,
          amount,
          manual: true,
        });
      }
    } else if (it.staff_id) {
      const st = staff.get(it.staff_id);
      const rate = st?.commission_rate ?? 0;
      merge({
        staffId: it.staff_id,
        name: st?.full_name ?? 'Nhân viên',
        role: st?.position ?? '',
        rateText: `${rate}% doanh thu đảm nhận`,
        amount: Math.round((it.line_total * rate) / 100),
      });
    }
  }
  return Array.from(byStaff.values());
}

export function customerTier(totalSpent: number): { label: string; sub: string } {
  if (totalSpent >= 10000000) return { label: 'Hạng Vàng', sub: 'Khách hàng thân thiết' };
  if (totalSpent >= 5000000) return { label: 'Hạng Bạc', sub: 'Khách hàng thân thiết' };
  return { label: 'Hạng Thường', sub: 'Khách hàng mới' };
}
