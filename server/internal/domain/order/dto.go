package order

import (
	"errors"
	"strings"
	"time"
)

type ItemMaterialInput struct {
	ID             string  `json:"id"`
	OrderItemID    string  `json:"order_item_id"`
	ProductID      string  `json:"product_id"`
	Quantity       float64 `json:"quantity"`
	UnitCostAtTime float64 `json:"unit_cost_at_time"`
}

// OrderMaterialInput 1 dòng vật tư khi gán lại vật tư.
// Chỉ cần order_item_id, server tự suy đơn chứa nó nên 1 lần gọi
// xử lý được vật tư của nhiều đơn. Server tự quy Quantity về đơn vị
// nhỏ nhất và tự tính lại giá vốn theo đơn vị gửi (không tin client).
type OrderMaterialInput struct {
	OrderItemID string  `json:"order_item_id"`
	ProductID   string  `json:"product_id"`
	Quantity    float64 `json:"quantity"`
	// Unit đơn vị của Quantity (rỗng = đơn vị lớn của SP).
	Unit *string `json:"unit"`
}

type OrderItemInput struct {
	ItemType  string  `json:"item_type"`
	ServiceID *string `json:"service_id"`
	ProductID *string `json:"product_id"`
	StaffID   *string `json:"staff_id"`
	Quantity  float64 `json:"quantity"`
	// Unit đơn vị của Quantity (rỗng = đơn vị lớn của SP).
	// Server chuẩn hóa về đơn vị lớn để lưu dòng đơn; giữ chỗ/chốt/hoàn
	// kho quy về đơn vị nhỏ nhất ở tầng usecase lúc xử lý.
	Unit      *string             `json:"unit"`
	Materials []ItemMaterialInput `json:"materials"`
}

type CreateOrderRequest struct {
	CustomerID     *string          `json:"customer_id"`
	AppointmentID  *string          `json:"appointment_id"`
	DiscountAmount float64          `json:"discount_amount"`
	Items          []OrderItemInput `json:"items"`
	// Khách mới ghi tại POS: server tự tìm theo SĐT (dùng luôn nếu có),
	// chưa có thì tạo mới rồi gán vào đơn.
	NewCustomer *NewCustomerInput `json:"new_customer"`
}

// AddOrderItemsRequest thêm dòng hàng vào đơn có sẵn (chỉ pending/confirm).
// Items cùng ngữ nghĩa OrderItemInput lúc tạo đơn.
type AddOrderItemsRequest struct {
	Items []OrderItemInput `json:"items"`
}

type NewCustomerInput struct {
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
}

// InitPaymentResponse trả payment đang chờ xác nhận kèm số tiền hiện tại.
type InitPaymentResponse struct {
	Payment         *PaymentResponse `json:"payment"`
	RemainingAmount float64          `json:"remaining_amount"`
	TotalAmount     float64          `json:"total_amount"`
	PaidAmount      float64          `json:"paid_amount"`
	DiscountAmount  float64          `json:"discount_amount"`
}

// ConfirmPaymentRequest dữ liệu người dùng chọn trong dialog thu tiền.
// Server tự tính amount từ total/đã thu/giảm giá, không tin số client gửi.
type ConfirmPaymentRequest struct {
	Method          string  `json:"method"`
	MethodPaymentID *string `json:"method_payment_id"`
	Provider        *string `json:"provider"`
	ProviderTxnID   *string `json:"provider_txn_id"`
	DiscountAmount  float64 `json:"discount_amount"`
}

// ConfirmPaymentResponse trả payment đã ghi nhận + đơn đã chốt + phiếu bán hàng.
type ConfirmPaymentResponse struct {
	Payment      *PaymentResponse `json:"payment"`
	Order        *OrderResponse   `json:"order"`
	DocumentID   string           `json:"document_id"`
	DocumentCode string           `json:"document_code"`
}

// PaymentCompletion dữ liệu cập nhật payment trong cùng transaction chốt đơn.
type PaymentCompletion struct {
	PaymentID      string
	Method         string
	Provider       *string
	ProviderTxnID  *string
	DiscountAmount float64
}

// UpdateOrderCustomerRequest gán khách cho đơn đã tạo.
// customer_id: gắn khách có sẵn; new_customer: tìm theo SĐT (có thì dùng,
// chưa có thì tạo mới) — chỉ dùng 1 trong 2.
type UpdateOrderCustomerRequest struct {
	CustomerID  *string           `json:"customer_id"`
	NewCustomer *NewCustomerInput `json:"new_customer"`
}

// UpdateOrderItemQtyRequest đổi số lượng 1 dòng đơn (chỉ pending/confirm).
// Quantity + Unit cùng ngữ nghĩa lúc tạo đơn: Unit rỗng = đơn vị lớn của SP,
// server tự chuẩn hóa về đơn vị lớn để lưu. Dòng service bỏ qua Unit.
type UpdateOrderItemQtyRequest struct {
	Quantity float64 `json:"quantity"`
	Unit     *string `json:"unit"`
}

type OrderItemResponse struct {
	ID        string  `json:"id"`
	ItemType  string  `json:"item_type"`
	ServiceID *string `json:"service_id"`
	ProductID *string `json:"product_id"`
	StaffID   *string `json:"staff_id"`
	Quantity  float64 `json:"quantity"`
	// Unit đơn vị của Quantity (đơn vị lớn của SP, nil với dòng dịch vụ).
	Unit      *string `json:"unit"`
	UnitPrice float64 `json:"unit_price"`
	LineTotal float64 `json:"line_total"`
	// Staff NV thực hiện theo bảng order_item_staff (join sẵn ở query).
	Staff []*OrderItemStaffInfo `json:"staff,omitempty"`
}

// OrderItemStaffInfo 1 NV trong 1 dòng đơn kèm tên hiển thị.
type OrderItemStaffInfo struct {
	ID               string  `json:"id"`
	StaffID          *string `json:"staff_id"`
	FullName         *string `json:"full_name"`
	Type             string  `json:"type"`
	SharePct         float64 `json:"share_pct"`
	CommissionAmount float64 `json:"commission_amount"`
}

type OrderMaterialResponse struct {
	ID             string  `json:"id"`
	OrderItemID    string  `json:"order_item_id"`
	ProductID      string  `json:"product_id"`
	Quantity       float64 `json:"quantity"`
	UnitCostAtTime float64 `json:"unit_cost_at_time"`
	// Unit đơn vị của Quantity (đơn vị nhỏ nhất sau quy đổi ở luồng gán lại;
	// đơn vị định mức ở snapshot tự động từ dịch vụ).
	Unit string `json:"unit"`
}

type PaymentResponse struct {
	ID            string     `json:"id"`
	OrderID       string     `json:"order_id"`
	Method        string     `json:"method"`
	Provider      *string    `json:"provider"`
	ProviderTxnID *string    `json:"provider_txn_id"`
	Amount        float64    `json:"amount"`
	Status        string     `json:"status"`
	PaidAt        *time.Time `json:"paid_at"`
	CreatedAt     *time.Time `json:"created_at"`
}

type OrderResponse struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	Code           string     `json:"code"`
	CustomerID     *string    `json:"customer_id"`
	AppointmentID  *string    `json:"appointment_id"`
	SubtotalAmount float64    `json:"subtotal_amount"`
	DiscountAmount float64    `json:"discount_amount"`
	TotalAmount    float64    `json:"total_amount"`
	Status         string     `json:"status"`
	CreatedAt      *time.Time `json:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at"`
	// Thông tin khách sau resolve new_customer (để client toast đúng tên,
	// biết SĐT đã tồn tại thì dùng luôn khách cũ).
	CustomerName   *string `json:"customer_name,omitempty"`
	CustomerReused bool    `json:"customer_reused,omitempty"`
}

type OrderDetailResponse struct {
	Order       *OrderResponse           `json:"order"`
	Items       []*OrderItemResponse     `json:"items"`
	Materials   []*OrderMaterialResponse `json:"materials"`
	Payments    []*PaymentResponse       `json:"payments"`
	Commissions []*StaffCommission       `json:"commissions"`
}

// StaffCommission 1 dòng hoa hồng trong mảng commissions của chi tiết đơn.
// Dựng từ order_item_staff đã lưu (server join sẵn, không query thêm).
type StaffCommission struct {
	StaffID     string  `json:"staff_id"`
	FullName    string  `json:"full_name"`
	Type        string  `json:"type"`
	SharePct    float64 `json:"share_pct"`
	Amount      float64 `json:"amount"`
	OrderItemID string  `json:"order_item_id"`
}

// OrderStatsResponse 4 số thẻ thống kê đơn hàng:
// tổng đơn + doanh thu hôm nay, chờ thanh toán, hủy/hoàn.
type OrderStatsResponse struct {
	TodayTotal        int64   `json:"today_total" db:"today_total"`
	TodayCompleted    int64   `json:"today_completed" db:"today_completed"`
	TodayProcessing   int64   `json:"today_processing" db:"today_processing"`
	TodayRevenue      float64 `json:"today_revenue" db:"today_revenue"`
	YesterdayRevenue  float64 `json:"yesterday_revenue" db:"yesterday_revenue"`
	RevenueChangePct  float64 `json:"revenue_change_pct"`
	PendingCount      int64   `json:"pending_count" db:"pending_count"`
	PendingAmount     float64 `json:"pending_amount" db:"pending_amount"`
	CancelRefundToday int64   `json:"cancel_refund_today" db:"cancel_refund_today"`
	CancelRefundMonth int64   `json:"cancel_refund_month" db:"cancel_refund_month"`
	CancelRefundRate  float64 `json:"cancel_refund_rate"`
	MonthTotal        int64   `json:"month_total" db:"month_total"`
}

// StaffCommissionStats thống kê hoa hồng dịch vụ của 1 nhân viên trong khoảng ngày.
type StaffCommissionStats struct {
	TotalOrders     int64   `json:"total_orders" db:"total_orders"`
	TotalItems      int64   `json:"total_items" db:"total_items"`
	TotalCommission float64 `json:"total_commission" db:"total_commission"`
	TotalAmount     float64 `json:"total_amount" db:"total_amount_value"`
}

// OrderCompleteResponse kết quả chốt đơn kèm phiếu bán hàng vừa sinh.
type OrderCompleteResponse struct {
	Order        *OrderResponse `json:"order"`
	DocumentID   string         `json:"document_id"`
	DocumentCode string         `json:"document_code"`
}

type PosItemResponse struct {
	ID              string   `json:"id" db:"id"`
	OrganizationID  string   `json:"organization_id" db:"organization_id"`
	CategoryID      *string  `json:"category_id" db:"category_id"`
	Type            string   `json:"type" db:"type"`
	Name            string   `json:"name" db:"name"`
	Description     *string  `json:"description" db:"description"`
	DurationMinutes *int     `json:"duration_minutes" db:"duration_minutes"`
	Unit            *string  `json:"unit" db:"unit"`
	Price           float64  `json:"price" db:"price"`
	StockQuantity   *float64 `json:"stock_quantity" db:"stock_quantity"`
	IsActive        bool     `json:"is_active" db:"is_active"`
}

const (
	StaffTypePercent = "percent"
	StaffTypeFixed   = "fixed"
	StaffTypeProfit  = "profit"
)

// StaffOrderItemInput NV tham gia 1 dòng đơn.
// type = loại hoa hồng (percent | fixed | profit, mặc định percent).
// share_pct: % chia khi type percent/profit, = 0 khi fixed.
// commission_amount: chỉ dùng khi type fixed (nhập tay); percent/profit
// do server tự tính, gửi kèm sẽ bị bỏ qua.
type StaffOrderItemInput struct {
	StaffID          string   `json:"staff_id"`
	Type             *string  `json:"type"`
	SharePct         *float64 `json:"share_pct"`
	CommissionAmount *float64 `json:"commission_amount"`
}

func (in *StaffOrderItemInput) NormalizeType() string {
	if in.Type == nil || strings.TrimSpace(*in.Type) == "" {
		return StaffTypePercent
	}
	return strings.TrimSpace(*in.Type)
}

func (in *StaffOrderItemInput) Validate() error {
	if strings.TrimSpace(in.StaffID) == "" {
		return errors.New("Thiếu staff_id")
	}
	switch in.NormalizeType() {
	case StaffTypePercent, StaffTypeFixed, StaffTypeProfit:
	default:
		return errors.New("type không hợp lệ (percent | fixed | profit)")
	}
	if in.SharePct == nil || *in.SharePct < 0 || *in.SharePct > 100 {
		return errors.New("share_pct phải từ 0 đến 100")
	}
	if in.NormalizeType() != StaffTypeFixed && *in.SharePct <= 0 {
		return errors.New("share_pct phải lớn hơn 0 với loại percent/profit")
	}
	if in.CommissionAmount != nil && *in.CommissionAmount < 0 {
		return errors.New("commission_amount không được âm")
	}
	return nil
}

type StaffOrderItem struct {
	ID               string     `json:"id"`
	OrganizationID   string     `json:"organization_id"`
	OrderItemID      string     `json:"order_item_id"`
	StaffID          string     `json:"staff_id"`
	Type             string     `json:"type"`
	SharePct         float64    `json:"share_pct"`
	CommissionAmount float64    `json:"commission_amount"`
	CreatedAt        *time.Time `json:"created_at"`
}

type StaffOrderItemResponse struct {
	ID               string     `json:"id" db:"id"`
	OrganizationID   string     `json:"organization_id" db:"organization_id"`
	OrderItemID      string     `json:"order_item_id" db:"order_item_id"`
	StaffID          string     `json:"staff_id" db:"staff_id"`
	Type             string     `json:"type" db:"type"`
	SharePct         float64    `json:"share_pct" db:"share_pct"`
	CommissionAmount float64    `json:"commission_amount" db:"commission_amount"`
	CreatedAt        *time.Time `json:"created_at" db:"created_at"`
}
