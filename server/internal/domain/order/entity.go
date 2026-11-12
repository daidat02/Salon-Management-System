package order

import (
	"errors"
	"time"
)

const (
	StatusPending   = "pending"
	StatusConfirm   = "confirm"
	StatusDelivery  = "delivery"
	StatusCompleted = "completed"
	StatusCancelled = "cancelled"
	StatusRefunded  = "refunded"
)

const (
	ItemTypeService = "service"
	ItemTypeProduct = "product"
)

const (
	PaymentMethodCash         = "cash"
	PaymentMethodBankTransfer = "bank_transfer"
	PaymentMethodGateway      = "gateway"
	PaymentMethodCard         = "card"
)

const (
	PaymentStatusPending   = "pending"
	PaymentStatusSucceeded = "succeeded"
	PaymentStatusFailed    = "failed"
	PaymentStatusRefunded  = "refunded"
)

type Order struct {
	ID             string  `json:"id" db:"id"`
	OrganizationID string  `json:"organization_id" db:"organization_id"`
	Code           string  `json:"code" db:"code"`
	CustomerID     *string `json:"customer_id" db:"customer_id"`
	AppointmentID  *string `json:"appointment_id" db:"appointment_id"`
	SubtotalAmount float64 `json:"subtotal_amount" db:"subtotal_amount"`
	DiscountAmount float64 `json:"discount_amount" db:"discount_amount"`
	TotalAmount    float64 `json:"total_amount" db:"total_amount"`
	// Description tóm tắt tên dịch vụ/sản phẩm, chốt lúc thanh toán thành công.
	Description string     `json:"description" db:"description"`
	Status      string     `json:"status" db:"status"`
	CreatedBy   *string    `json:"created_by" db:"created_by"`
	CreatedAt   *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at" db:"updated_at"`
}

func (o *Order) Validate() error {
	switch o.Status {
	case StatusPending, StatusConfirm, StatusDelivery, StatusCompleted, StatusCancelled, StatusRefunded:
	default:
		return errors.New("Trạng thái đơn hàng không hợp lệ")
	}
	if o.SubtotalAmount < 0 {
		return errors.New("Tổng tiền trước giảm giá không được âm")
	}
	if o.DiscountAmount < 0 {
		return errors.New("Giảm giá không được âm")
	}
	if o.DiscountAmount > o.SubtotalAmount {
		return errors.New("Giảm giá không được vượt tổng tiền")
	}
	if o.TotalAmount < 0 {
		return errors.New("Tổng tiền thanh toán không được âm")
	}
	return nil
}

type OrderItem struct {
	ID             string  `json:"id" db:"id"`
	OrganizationID string  `json:"organization_id" db:"organization_id"`
	OrderID        string  `json:"order_id" db:"order_id"`
	ItemType       string  `json:"item_type" db:"item_type"`
	ServiceID      *string `json:"service_id" db:"service_id"`
	ProductID      *string `json:"product_id" db:"product_id"`
	StaffID        *string `json:"staff_id" db:"staff_id"`
	Quantity       float64 `json:"quantity" db:"quantity"`
	// Unit đơn vị của Quantity (đơn vị lớn của SP, NULL với dòng dịch vụ).
	// Giữ chỗ/chốt/hoàn kho quy về đơn vị nhỏ nhất ở tầng usecase lúc xử lý.
	Unit      *string `json:"unit" db:"unit"`
	UnitPrice float64 `json:"unit_price" db:"unit_price"`
	LineTotal float64 `json:"line_total" db:"line_total"`
	// Staff NV thực hiện (join từ order_item_staff, nil khi không query kèm).
	Staff []*OrderItemStaffInfo `json:"staff,omitempty"`
}

func (it *OrderItem) Validate() error {
	if it.Quantity <= 0 {
		return errors.New("Số lượng dòng hàng phải lớn hơn 0")
	}
	if it.UnitPrice < 0 {
		return errors.New("Đơn giá dòng hàng không được âm")
	}
	switch it.ItemType {
	case ItemTypeService:
		if it.ServiceID == nil || *it.ServiceID == "" {
			return errors.New("Dòng dịch vụ thiếu service_id")
		}
		if it.ProductID != nil {
			return errors.New("Dòng dịch vụ không được kèm product_id")
		}
	case ItemTypeProduct:
		if it.ProductID == nil || *it.ProductID == "" {
			return errors.New("Dòng sản phẩm thiếu product_id")
		}
		if it.ServiceID != nil {
			return errors.New("Dòng sản phẩm không được kèm service_id")
		}
	default:
		return errors.New("Loại dòng hàng không hợp lệ (service | product)")
	}
	return nil
}

// OrderItemMaterial snapshot vật tư tiêu hao + giá vốn tại thời điểm bán.
type OrderItemMaterial struct {
	ID             string  `json:"id" db:"id"`
	OrderItemID    string  `json:"order_item_id" db:"order_item_id"`
	ProductID      string  `json:"product_id" db:"product_id"`
	Quantity       float64 `json:"quantity" db:"quantity"`
	UnitCostAtTime float64 `json:"unit_cost_at_time" db:"unit_cost_at_time"`
	// Unit đơn vị của Quantity (VD tuýp khi snapshot theo định mức lớn, ml khi đã quy đổi).
	Unit string `json:"unit" db:"unit"`
}

func (m *OrderItemMaterial) Validate() error {
	if m.ProductID == "" {
		return errors.New("Thiếu product_id của vật tư tiêu hao")
	}
	if m.Quantity <= 0 {
		return errors.New("Số lượng vật tư tiêu hao phải lớn hơn 0")
	}
	if m.UnitCostAtTime < 0 {
		return errors.New("Giá vốn tại thời điểm bán không được âm")
	}
	return nil
}

type Payment struct {
	ID             string     `json:"id" db:"id"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	OrderID        string     `json:"order_id" db:"order_id"`
	Method         string     `json:"method" db:"method"`
	Provider       *string    `json:"provider" db:"provider"`
	ProviderTxnID  *string    `json:"provider_txn_id" db:"provider_txn_id"`
	Amount         float64    `json:"amount" db:"amount"`
	Status         string     `json:"status" db:"status"`
	PaidAt         *time.Time `json:"paid_at" db:"paid_at"`
	CreatedAt      *time.Time `json:"created_at" db:"created_at"`
}

func (p *Payment) Validate() error {
	switch p.Method {
	case PaymentMethodCash, PaymentMethodBankTransfer, PaymentMethodGateway, PaymentMethodCard:
	default:
		return errors.New("Hình thức thanh toán không hợp lệ (cash | bank_transfer | gateway | card)")
	}
	switch p.Status {
	case PaymentStatusPending, PaymentStatusSucceeded, PaymentStatusFailed, PaymentStatusRefunded:
	default:
		return errors.New("Trạng thái thanh toán không hợp lệ")
	}
	if p.Amount <= 0 {
		return errors.New("Số tiền thanh toán phải lớn hơn 0")
	}
	return nil
}
