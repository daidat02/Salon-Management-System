package inventory

import "time"

type InventoryDocumentInput struct {
	ProductID string  `json:"product_id"`
	Type      string  `json:"type"`
	Quantity  float64 `json:"quantity"`
}

type CreateInventoryRequest struct {
	ProductID string  `json:"product_id"`
	Type      string  `json:"type"`
	Quantity  float64 `json:"quantity"`
}

type InventoryResponse struct {
	ID             string     `json:"id" db:"id"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	ProductID      string     `json:"product_id" db:"product_id"`
	Type           string     `json:"type" db:"type"`
	Quantity       float64    `json:"quantity" db:"quantity"`
	ReferenceType  *string    `json:"reference_type" db:"reference_type"`
	ReferenceID    *string    `json:"reference_id" db:"reference_id"`
	CreatedAt      *time.Time `json:"created_at" db:"created_at"`
}

type DocumentItemInput struct {
	ProductID       string  `json:"product_id"`
	Unit            string  `json:"unit"`
	Quantity        float64 `json:"quantity"`
	UnitPrice       float64 `json:"unit_price"`
	DiscountPercent float64 `json:"discount_percent"`
	DiscountAmount  float64 `json:"discount_amount"`
}

type CreateDocumentRequest struct {
	SupplierID   *string             `json:"supplier_id"`
	OrderID      *string             `json:"order_id"`
	DocumentCode string              `json:"document_code"`
	Type         string              `json:"type"`
	Note         *string             `json:"note"`
	Reason       *string             `json:"reason"`
	Items        []DocumentItemInput `json:"items"`
	CreatedBy    *string             `json:"created_by"`

	// Thanh toán / công nợ — chỉ áp dụng cho phiếu nhập.
	DueDate     *string `json:"due_date"`
	VATRate     float64 `json:"vat_rate"`
	ShippingFee float64 `json:"shipping_fee"`
	PaidAmount  float64 `json:"paid_amount"`
	FundID      *string `json:"fund_id"`
	InvoiceCode *string `json:"invoice_code"`
}

type DocumentItemResponse struct {
	ID              string  `json:"id" db:"id"`
	DocumentID      string  `json:"document_id" db:"document_id"`
	ProductID       string  `json:"product_id" db:"product_id"`
	ProductName     string  `json:"product_name" db:"product_name"`
	SKU             string  `json:"sku" db:"sku"`
	Unit            string  `json:"unit" db:"unit"`
	NetUnit         string  `json:"net_unit" db:"net_unit"`
	NetAmount       float64 `json:"net_amount" db:"net_amount"`
	Quantity        float64 `json:"quantity" db:"quantity"`
	UnitPrice       float64 `json:"unit_price" db:"unit_price"`
	TotalPrice      float64 `json:"total_price" db:"total_price"`
	DiscountPercent float64 `json:"discount_percent" db:"discount_percent"`
	DiscountAmount  float64 `json:"discount_amount" db:"discount_amount"`
	// Field hiển thị đã quy đổi (tính ở query detail, không lưu DB)
	DisplayQuantity  float64 `json:"display_quantity" db:"display_quantity"`
	DisplayUnit      string  `json:"display_unit" db:"display_unit"`
	DisplayUnitPrice float64 `json:"display_unit_price" db:"display_unit_price"`
}

type DocumentResponse struct {
	ID             string  `json:"id" db:"id"`
	OrganizationID string  `json:"organization_id" db:"organization_id"`
	DocumentCode   string  `json:"document_code" db:"document_code"`
	Type           string  `json:"type" db:"type"`
	TotalAmount    float64 `json:"total_amount" db:"total_amount"`
	Note           *string `json:"note" db:"note"`
	Reason         *string `json:"reason" db:"reason"`
	ItemsCount     *int    `json:"items_count" db:"items_count"`

	SupplierID      *string `json:"supplier_id" db:"supplier_id"`
	SupplierName    *string `json:"supplier_name" db:"supplier_name"`
	SupplierPhone   *string `json:"supplier_phone" db:"supplier_phone"`
	SupplierAddress *string `json:"supplier_address" db:"supplier_address"`
	OrderID         *string `json:"order_id" db:"order_id"`
	OrderCode       *string `json:"order_code" db:"order_code"`

	CreatedBy     *string    `json:"created_by" db:"created_by"`
	CreatedByName *string    `json:"created_by_name" db:"created_by_name"`
	CreatedAt     *time.Time `json:"created_at" db:"created_at"`

	PaymentTracked  bool       `json:"payment_tracked" db:"payment_tracked"`
	DueDate         *time.Time `json:"due_date" db:"due_date"`
	GrossAmount     float64    `json:"gross_amount" db:"gross_amount"`
	DiscountAmount  float64    `json:"discount_amount" db:"discount_amount"`
	VATRate         float64    `json:"vat_rate" db:"vat_rate"`
	VATAmount       float64    `json:"vat_amount" db:"vat_amount"`
	ShippingFee     float64    `json:"shipping_fee" db:"shipping_fee"`
	PaidAmount      float64    `json:"paid_amount" db:"paid_amount"`
	RemainingAmount float64    `json:"remaining_amount" db:"remaining_amount"`
	PaymentStatus   string     `json:"payment_status" db:"payment_status"`
	IsOverdue       bool       `json:"is_overdue" db:"is_overdue"`
	InvoiceCode     *string    `json:"invoice_code" db:"invoice_code"`
}

type DocumentDetailResponse struct {
	Document *DocumentResponse           `json:"document"`
	Items    []*DocumentItemResponse     `json:"items"`
	Payments []*InventoryPaymentResponse `json:"payments"`
}

type CreateInventoryPaymentRequest struct {
	FundID string  `json:"fund_id"`
	Amount float64 `json:"amount"`
	Note   *string `json:"note"`
}

type InventoryPaymentResponse struct {
	ID          string     `json:"id" db:"id"`
	Code        string     `json:"code" db:"code"`
	Amount      float64    `json:"amount" db:"amount"`
	FundID      string     `json:"fund_id" db:"fund_id"`
	FundName    string     `json:"fund_name" db:"fund_name"`
	Description *string    `json:"description" db:"description"`
	OccurredAt  *time.Time `json:"occurred_at" db:"occurred_at"`
	Status      string     `json:"status" db:"status"`
	CreatedAt   *time.Time `json:"created_at" db:"created_at"`
}
type DocumentQueryResult struct {
	DocumentResponse
	ItemsRaw []byte `db:"items"` // Hứng chuỗi JSON từ lệnh jsonb_agg
}

// InventoryStatsResponse thống kê tổng quan trang kho hàng.
type InventoryStatsResponse struct {
	TotalSKUs            int64   `json:"total_skus" db:"total_skus"`
	RetailSKUs           int64   `json:"retail_skus" db:"retail_skus"`
	MaterialSKUs         int64   `json:"material_skus" db:"material_skus"`
	LowStockSKUs         int64   `json:"low_stock_skus" db:"low_stock_skus"`
	InventoryValue       float64 `json:"inventory_value" db:"inventory_value"`
	ImportCostMonth      float64 `json:"import_cost_month" db:"import_cost_month"`
	ImportDocumentsMonth int64   `json:"import_documents_month" db:"import_documents_month"`
}

type InventoryTransactionResponse struct {
	ID             string     `json:"id" db:"id"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	Type           string     `json:"type" db:"type"`
	Quantity       float64    `json:"quantity" db:"quantity"`
	RefrenceType   *string    `json:"reference_type" db:"reference_type"`
	ReferenceID    *string    `json:"reference_id" db:"reference_id"`
	CreatedAt      *time.Time `json:"created_at" db:"created_at"`
	ProductID      string     `json:"product_id" db:"product_id"`
	DocumentID     *string    `json:"document_id" db:"document_id"`
	DocumentCode   *string    `json:"document_code" db:"document_code"`
	OrderID        *string    `json:"order_id" db:"order_id"`
	OrderCode      *string    `json:"order_code" db:"order_code"`
	SupplierID     *string    `json:"supplier_id" db:"supplier_id"`
	SupplierName   *string    `json:"supplier_name" db:"supplier_name"`
}
