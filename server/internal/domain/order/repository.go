package order

import (
	"context"
	"errors"

	customerdomain "github.com/daidat02/server/internal/domain/customer"
)

// ErrOrderNotFound dùng để usecase map đúng 404 khi sai id/khác organization.
var ErrOrderNotFound = errors.New("order not found")

// ErrOrderNotReady dùng khi đơn chưa ở trạng thái cho phép hoàn tất
// (pending/confirm/delivery) nên không thể chốt đơn.
var ErrOrderNotReady = errors.New("order not ready to serve")

// ErrInsufficientStock dùng để usecase map 400 khi bán vượt tồn.
var ErrInsufficientStock = errors.New("insufficient stock")

// StockDeduction lượng tồn cần trừ (số dương), repo tự đổi dấu khi ghi sổ bán.
type StockDeduction struct {
	ProductID string
	Quantity  float64
}

// SaleSlipLine dòng hàng cho phiếu xuất của đơn (giá đã chốt, số dương).
type SaleSlipLine struct {
	ProductID string
	Quantity  float64
	UnitPrice float64
}

// SaleSlipResult phiếu xuất vừa sinh cho đơn.
type SaleSlipResult struct {
	DocumentID   string
	DocumentCode string
}

// ProductPricing giá tại thời điểm bán, đọc từ bảng products.
type ProductPricing struct {
	SellPrice float64
	CostPrice float64
}

// ServiceMaterialUsage định mức vật tư của 1 đơn vị dịch vụ kèm giá vốn hiện tại.
type ServiceMaterialUsage struct {
	ProductID          string
	QuantityPerService float64
	UnitCost           float64
	// Unit đơn vị của QuantityPerService (lưu trong service_materials.unit).
	Unit               string
}

// ErrServiceNotFound dùng để usecase map 404 khi giá dịch vụ không còn.
var ErrServiceNotFound = errors.New("service not found")

// ErrOrderNotEditable dùng khi đơn đã khóa sửa (đã hoàn tất/hủy/hoàn).
var ErrOrderNotEditable = errors.New("order not editable")

// OrderRepository gom mọi query đúng-domain order, sắp theo vòng đời đơn:
//  1. Tạo đơn -> 2. Đọc đơn -> 3. Gán lại NV/vật tư ->
//  4. Hủy/hoàn + phục vụ -> 5. Thanh toán -> 6. Catalog/POS.
type OrderRepository interface {
	// 1. Tạo đơn: ghi đơn + items + materials snapshot + giữ chỗ kho (1 tx).
	CreateOrder(ctx context.Context, order *Order, items []*OrderItem, materials []*OrderItemMaterial, deductions []StockDeduction) error
	// 2. Đọc đơn.
	GetOrdersByOrgID(ctx context.Context, orgID, status string, limit, offset int) ([]*Order, error)
	CountOrdersByOrgID(ctx context.Context, orgID, status string) (int64, error)
	GetOrderByID(ctx context.Context, orgID, id string) (*Order, error)
	// ListHistoriesOrderByCustomerId lịch sử đơn hàng của 1 khách (mới nhất trước).
	ListHistoriesOrderByCustomerId(ctx context.Context, orgID, customerID string, limit, offset int) ([]*Order, error)
	// CountHistoriesOrderByCustomerId đếm lịch sử đơn hàng của 1 khách.
	CountHistoriesOrderByCustomerId(ctx context.Context, orgID, customerID string) (int64, error)
	// GetOrderItems kèm NV thực hiện (join gom sẵn, item chưa gán thì Staff = []).
	GetOrderItems(ctx context.Context, orgID, orderID string) ([]*OrderItem, error)
	// GetOrderMaterials KHÔNG scope org — caller phải check đơn cha trước.
	GetOrderMaterials(ctx context.Context, orderID string) ([]*OrderItemMaterial, error)
	GetOrderPayments(ctx context.Context, orgID, orderID string) ([]*Payment, error)
	// 3. Gán lại sub-resource.
	// OrderItemExistsInOrg kiểm tra dòng đơn thuộc đúng salon (chống lẫn tenant).
	OrderItemExistsInOrg(ctx context.Context, orgID string, itemID string) (bool, error)
	// MapItemOrders trả về order_id chứa từng order_item_id (chỉ trong salon).
	// Item thiếu/khác salon thì vắng mặt trong map.
	MapItemOrders(ctx context.Context, orgID string, itemIDs []string) (map[string]string, error)
	// ReplaceStaffOrderItems thay toàn bộ NV của 1 dòng đơn (xóa cũ + chèn mới, 1 tx)
	// để dialog Áp dụng nhiều lần không bị trùng UNIQUE.
	ReplaceStaffOrderItems(ctx context.Context, orderItemID string, staffItems []*StaffOrderItem) error
	// ReplaceOrderMaterials thay toàn bộ vật tư của các đơn trong payload (1 tx):
	// khóa đơn + check trạng thái (chỉ pending/confirm/delivery) + đọc snapshot cũ
	// + xóa/chèn log + chỉnh giữ chỗ kho theo delta. Tồn thật không đổi.
	ReplaceOrderMaterials(ctx context.Context, orgID string, orderIDs []string, materials []*OrderItemMaterial) error
	// 4. Hủy/hoàn + hoàn tất (trạng thái + kho trong 1 tx).
	// ApplyCancel chuyển trạng thái + hoàn kho (restores) + nhả giữ chỗ (releases)
	// + vô hiệu phiếu xuất + sổ trả trong 1 transaction.
	// Hủy đơn chưa phục vụ: restores rỗng, chỉ nhả giữ chỗ.
	ApplyCancel(ctx context.Context, orgID, orderID, newStatus string, restores []StockDeduction, releases []StockDeduction) error
	// CompleteOrderWithSlip chốt đơn (pending/confirm/delivery -> completed):
	// trừ kho thật + nhả giữ chỗ + ghi sổ sale + sinh phiếu bán hàng,
	// tất cả 1 tx. Trả về mã phiếu vừa sinh.
	CompleteOrderWithSlip(ctx context.Context, orgID, orderID string, lines []SaleSlipLine) (SaleSlipResult, error)
	// 5. Thanh toán.
	// FindPaymentByProviderTxn tìm theo cặp cổng/mã GD (idempotency), không thấy -> (nil, nil).
	FindPaymentByProviderTxn(ctx context.Context, provider, txnID string) (*Payment, error)
	CreatePayment(ctx context.Context, payment *Payment) error
	GetTotalPaidByOrder(ctx context.Context, orgID, orderID string) (float64, error)
	UpdateOrderStatus(ctx context.Context, orgID, orderID, status string) error
	// UpdateOrderCustomer gán/đổi khách hàng của đơn (customer_id nullable).
	UpdateOrderCustomer(ctx context.Context, orgID, orderID string, customerID *string) error
	// 6. Danh mục bán hàng POS.
	GetPosItemsByOrgID(ctx context.Context, orgID string, limit int, name, itemType string, id string, search string, categoryFilter string) ([]*PosItemResponse, error)
}

// ProductUnit đơn vị + hệ số quy đổi của 1 sản phẩm (để server tự quy
// số lượng/giá về đơn vị nhỏ nhất, không tin số client gửi).
type ProductUnit struct {
	Unit      string
	NetUnit   *string
	NetAmount *float64
}

// ProductStore giá + đơn vị + tồn tại sản phẩm.
// PostgresProductRepository thỏa mãn ngầm.
type ProductStore interface {
	GetProductPricing(ctx context.Context, orgID string, productIDs []string) (map[string]ProductPricing, error)
	GetProductUnits(ctx context.Context, orgID string, productIDs []string) (map[string]ProductUnit, error)
	// ProductsExistInOrg trả về id KHÔNG thuộc salon (rỗng = tất cả hợp lệ).
	ProductsExistInOrg(ctx context.Context, orgID string, productIDs []string) ([]string, error)
}

// ServiceStore giá + định mức dịch vụ tại thời điểm bán.
// PostgresServiceRepository thỏa mãn ngầm.
type ServiceStore interface {
	GetServicePrice(ctx context.Context, orgID, serviceID string) (float64, error)
	GetServiceMaterials(ctx context.Context, orgID string, serviceIDs []string) (map[string][]ServiceMaterialUsage, error)
}

// StaffStore các query nhân viên mà order cần.
// PostgresStaffRepository thỏa mãn ngầm.
type StaffStore interface {
	// StaffsExistInOrg trả về danh sách staffID KHÔNG thuộc salon (bỏ NV đã xóa mềm).
	// Rỗng nghĩa là tất cả hợp lệ.
	StaffsExistInOrg(ctx context.Context, orgID string, staffIDs []string) ([]string, error)
}

// CustomerStore các query khách hàng mà order cần.
// PostgresCustomerRepository thỏa mãn ngầm.
type CustomerStore interface {
	// CustomerExistsInOrg kiểm tra khách thuộc đúng salon.
	CustomerExistsInOrg(ctx context.Context, orgID, customerID string) (bool, error)
	// FindCustomerByPhone tìm khách theo SĐT để dedupe khi POS gửi new_customer.
	// Không thấy trả về (nil, nil).
	FindCustomerByPhone(ctx context.Context, orgID, phone string) (*customerdomain.Customer, error)
	// CreateCustomer tạo khách mới phát sinh tại POS (trước khi tạo đơn).
	CreateCustomer(ctx context.Context, c *customerdomain.Customer) error
}

// AppointmentStore các query lịch hẹn mà order cần.
// PostgresAppointmentRepository thỏa mãn ngầm.
type AppointmentStore interface {
	// AppointmentExistsInOrg kiểm tra lịch hẹn thuộc đúng salon.
	AppointmentExistsInOrg(ctx context.Context, orgID, appointmentID string) (bool, error)
}
