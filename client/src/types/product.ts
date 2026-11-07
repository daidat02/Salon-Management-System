export interface Product {
  id: string;
  organization_id: string;
  category_id: string;
  category_name?: string | null;
  sku: string;
  name: string;
  unit: string;
  net_unit: string | null;
  net_amount: number | null;
  product_type: 'retail' | 'material' | 'both';
  show_on_web: boolean;
  cost_price: number;
  sell_price: number;
  stock_quantity: number;
  min_stock: number;
  is_active: boolean;
  /** Chỉ có trong response GET /products (doanh thu tháng hiện tại). */
  revenue_this_month?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductMonthlyRevenue {
  /** Nhãn tháng dạng T1..T12. */
  month: string;
  revenue: number;
}

export interface ProductDetail extends Product {
  sold_this_month: number;
  revenue_last_6_months: ProductMonthlyRevenue[];
}

export interface ProductStats {
  total_products: number;
  on_sale_products: number;
  low_stock_products: number;
  retail_revenue_month: number;
}
