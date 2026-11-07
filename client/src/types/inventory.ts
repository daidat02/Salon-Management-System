export type InventoryTransactionType = 'import' | 'export' | 'adjust' | 'sale' | 'return';

export interface InventoryTransaction {
  id: string;
  organization_id: string;
  product_id: string;
  type: InventoryTransactionType;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
}

export type InventoryDocumentType = 'import' | 'export' | 'adjust' | 'sale' | 'return';

export interface InventoryDocument {
  id: string;
  organization_id: string;
  document_code: string;
  type: InventoryDocumentType;
  total_amount: number;
  note: string | null;
  reason: string | null;
  items_count: number;
  supplier_id: string | null;
  supplier_name: string | null;
  order_id: string | null;
  order_code: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string | null;
  payment_tracked: boolean;
  due_date: string | null;
  gross_amount: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  shipping_fee: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: InventoryPaymentStatus;
  is_overdue: boolean;
  invoice_code: string | null;
}

export type InventoryPaymentStatus = 'paid' | 'partial' | 'unpaid' | 'not_tracked';

export interface InventoryDocumentItem {
  id: string;
  document_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  net_unit: string;
  net_amount: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_percent: number;
  discount_amount: number;
  /** Số lượng/đơn vị/giá đã quy đổi để hiển thị (tính ở API detail, fallback về field gốc). */
  display_quantity?: number;
  display_unit?: string;
  display_unit_price?: number;
}

export interface InventoryStats {
  total_skus: number;
  retail_skus: number;
  material_skus: number;
  low_stock_skus: number;
  inventory_value: number;
  import_cost_month: number;
  import_documents_month: number;
}

export interface InventoryDocumentDetail {
  document: InventoryDocument;
  items: InventoryDocumentItem[];
}
