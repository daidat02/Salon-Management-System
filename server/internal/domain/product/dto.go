package product

import "time"

type CreateProductRequest struct {
	CategoryID    *string  `json:"category_id"`
	SKU           string   `json:"sku"`
	Name          string   `json:"name"`
	Unit          string   `json:"unit"`
	NetUnit       *string  `json:"net_unit"`
	NetAmount     *float64 `json:"net_amount"`
	ProductType   string   `json:"product_type"`
	ShowOnWeb     *bool    `json:"show_on_web"`
	CostPrice     float64  `json:"cost_price"`
	SellPrice     float64  `json:"sell_price"`
	StockQuantity float64  `json:"stock_quantity"`
	MinStock      float64  `json:"min_stock"`
	IsActive      *bool    `json:"is_active"`
}

type UpdateProductRequest struct {
	CategoryID    *string  `json:"category_id"`
	SKU           string   `json:"sku"`
	Name          string   `json:"name"`
	Unit          string   `json:"unit"`
	NetUnit       *string  `json:"net_unit"`
	NetAmount     *float64 `json:"net_amount"`
	ProductType   string   `json:"product_type"`
	ShowOnWeb     *bool    `json:"show_on_web"`
	CostPrice     float64  `json:"cost_price"`
	SellPrice     float64  `json:"sell_price"`
	StockQuantity float64  `json:"stock_quantity"`
	MinStock      float64  `json:"min_stock"`
	IsActive      *bool    `json:"is_active"`
}

type ProductResponse struct {
	ID               string     `json:"id"`
	OrganizationID   string     `json:"organization_id"`
	CategoryID       *string    `json:"category_id"`
	CategoryName     *string    `json:"category_name"`
	SKU              string     `json:"sku"`
	Name             string     `json:"name"`
	Unit             string     `json:"unit"`
	NetUnit          *string    `json:"net_unit"`
	NetAmount        *float64   `json:"net_amount"`
	ProductType      string     `json:"product_type"`
	ShowOnWeb        bool       `json:"show_on_web"`
	CostPrice        float64    `json:"cost_price"`
	SellPrice        float64    `json:"sell_price"`
	StockQuantity    float64    `json:"stock_quantity"`
	MinStock         float64    `json:"min_stock"`
	IsActive         bool       `json:"is_active"`
	RevenueThisMonth float64    `json:"revenue_this_month"`
	CreatedAt        *time.Time `json:"created_at"`
	UpdatedAt        *time.Time `json:"updated_at"`
}

// ProductMonthlyRevenueResponse doanh thu của sản phẩm trong một tháng.
type ProductMonthlyRevenueResponse struct {
	Month   string  `json:"month"`
	Revenue float64 `json:"revenue"`
}

// ProductDetailResponse là thông tin đầy đủ của một sản phẩm kèm doanh số
// bán ra trong tháng hiện tại và 6 tháng gần nhất.
type ProductDetailResponse struct {
	ProductResponse
	SoldThisMonth      float64                         `json:"sold_this_month"`
	RevenueLast6Months []ProductMonthlyRevenueResponse `json:"revenue_last_6_months"`
}

// ProductStatsResponse thống kê tổng quan sản phẩm/kho của salon.
type ProductStatsResponse struct {
	TotalProducts      int64   `json:"total_products" db:"total_products"`
	OnSaleProducts     int64   `json:"on_sale_products" db:"on_sale_products"`
	LowStockProducts   int64   `json:"low_stock_products" db:"low_stock_products"`
	RetailRevenueMonth float64 `json:"retail_revenue_month" db:"retail_revenue_month"`
}
