package order

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	customerdomain "github.com/daidat02/server/internal/domain/customer"
	domain "github.com/daidat02/server/internal/domain/order"
	productdomain "github.com/daidat02/server/internal/domain/product"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/pagination"
	"github.com/daidat02/server/pkg/utils"
	"github.com/jackc/pgx/v5/pgconn"
)

type OrderUsecase struct {
	repo         domain.OrderRepository
	catalog      CatalogChecker
	products     domain.ProductStore
	services     domain.ServiceStore
	customers    domain.CustomerStore
	appointments domain.AppointmentStore
	staff        domain.StaffStore
}

// CatalogChecker kiểm tra service/product của dòng đơn có thuộc đúng organization không.
// PostgresServiceRepository thỏa mãn ngầm.
type CatalogChecker interface {
	ServicesExistInOrg(ctx context.Context, orgID string, serviceIDs []string) ([]string, error)
	ProductsExistInOrg(ctx context.Context, orgID string, productIDs []string) ([]string, error)
}

func NewOrderUsecase(repo domain.OrderRepository, catalog CatalogChecker, products domain.ProductStore, services domain.ServiceStore, customers domain.CustomerStore, appointments domain.AppointmentStore, staff domain.StaffStore) *OrderUsecase {
	return &OrderUsecase{
		repo:         repo,
		catalog:      catalog,
		products:     products,
		services:     services,
		customers:    customers,
		appointments: appointments,
		staff:        staff,
	}
}

// ---------- Helper thuần túy (không chạm DB) ----------

// isUniqueViolation nhận diện lỗi unique PostgreSQL (mã 23505) để map
// sang message thân thiện (trùng mã đơn / trùng giao dịch thanh toán).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// ---------- 1. Tạo đơn ----------

// CreateOrder tạo đơn từ POS: validate dòng hàng, resolve khách (cũ/mới/walk-in),
// server tự tra giá + snapshot vật tư, giữ chỗ kho trong 1 tx.
// Đơn tổng 0đ thì paid luôn, ngược lại pending_payment.
func (u *OrderUsecase) CreateOrder(ctx context.Context, req *domain.CreateOrderRequest) (*domain.OrderResponse, error) {
	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if len(req.Items) == 0 {
		return nil, apperror.New(400, "Đơn hàng phải có ít nhất một dòng hàng", nil)
	}
	if req.DiscountAmount < 0 {
		return nil, apperror.New(400, "Giảm giá không được âm", nil)
	}
	// POS gửi khách mới: tự tìm theo SĐT (dùng luôn nếu có), chưa có thì tạo mới.
	customerName, customerReused, err := u.resolveNewCustomer(ctx, orgID, req)
	if err != nil {
		return nil, err
	}
	if err := u.checkReferencesInOrg(ctx, orgID, req); err != nil {
		return nil, err
	}

	var serviceIDs, productIDs []string
	serviceIDs, productIDs, err = splitItemIDs(req.Items)
	if err != nil {
		return nil, err
	}

	// Giá + đơn vị tại thời điểm bán do server quyết định, không tin client.
	cat, err := u.fetchOrderCatalog(ctx, orgID, serviceIDs, productIDs)
	if err != nil {
		return nil, err
	}

	orderID := utils.NewID()
	items, materials, deductions, subtotal, err := buildOrderLines(orgID, orderID, req.Items, cat.pricing, cat.units, cat.materialMap, cat.servicePrices)
	if err != nil {
		return nil, err
	}

	if req.DiscountAmount > subtotal {
		return nil, apperror.New(400, "Giảm giá không được vượt tổng tiền", nil)
	}
	total := subtotal - req.DiscountAmount
	status := domain.StatusPending

	order := &domain.Order{
		ID:             orderID,
		OrganizationID: orgID,
		Code:           utils.GenerateOrderCode(),
		CustomerID:     utils.StrPtr(utils.StrVal(req.CustomerID)),
		AppointmentID:  utils.StrPtr(utils.StrVal(req.AppointmentID)),
		SubtotalAmount: subtotal,
		DiscountAmount: req.DiscountAmount,
		TotalAmount:    total,
		Status:         status,
	}
	if err := order.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}
	for _, m := range materials {
		if err := m.Validate(); err != nil {
			return nil, apperror.New(400, err.Error(), err)
		}
	}

	var deductList []domain.StockDeduction
	for pid, qty := range deductions {
		deductList = append(deductList, domain.StockDeduction{ProductID: pid, Quantity: qty})
	}

	if err := u.repo.CreateOrder(ctx, order, items, materials, deductList); err != nil {
		log.Println("Error creating order:", err)
		if errors.Is(err, domain.ErrInsufficientStock) {
			return nil, apperror.New(400, "Tồn kho không đủ cho đơn hàng này", err)
		}
		if isUniqueViolation(err) {
			return nil, apperror.New(500, "Trùng mã đơn hàng, vui lòng thử lại", err)
		}
		return nil, apperror.New(500, "Lỗi khi tạo đơn hàng", err)
	}

	if total == 0 {
		// Đơn 0đ (khuyến mãi 100%) chốt luôn: trừ kho + sinh phiếu bán hàng ngay.
		// Đơn thuần dịch vụ không có dòng kho thì chỉ flip trạng thái.
		var zeroLines []domain.SaleSlipLine
		for _, it := range items {
			if it.ItemType == domain.ItemTypeProduct && it.ProductID != nil {
				zeroLines = append(zeroLines, domain.SaleSlipLine{
					ProductID: *it.ProductID, Quantity: it.Quantity, UnitPrice: it.UnitPrice,
				})
			}
		}
		for _, m := range materials {
			zeroLines = append(zeroLines, domain.SaleSlipLine{
				ProductID: m.ProductID, Quantity: m.Quantity, UnitPrice: m.UnitCostAtTime,
			})
		}
		if len(zeroLines) == 0 {
			if err := u.repo.UpdateOrderStatus(ctx, orgID, orderID, domain.StatusCompleted); err != nil {
				log.Println("Error auto-completing zero-total order:", err)
				return nil, apperror.New(500, "Lỗi khi chốt đơn 0đ", err)
			}
			order.Status = domain.StatusCompleted
		} else if _, err := u.repo.CompleteOrderWithSlip(ctx, orgID, orderID, zeroLines); err != nil {
			log.Println("Error auto-completing zero-total order:", err)
			return nil, apperror.New(500, "Lỗi khi chốt đơn 0đ", err)
		} else {
			order.Status = domain.StatusCompleted
		}
	}

	resp := toResponse(order)
	resp.CustomerName = customerName
	resp.CustomerReused = customerReused
	return resp, nil
}

// AddOrderItems thêm dòng hàng vào đơn (chỉ pending/confirm).
// Tái dùng toàn bộ pipeline của tạo đơn (validate, catalog, giá, build)
// nên luật giá/tồn đồng nhất; tổng mới = tổng cũ + tổng dòng thêm.
func (u *OrderUsecase) AddOrderItems(ctx context.Context, orderID string, items []domain.OrderItemInput) (*domain.OrderResponse, error) {
	if len(items) == 0 {
		return nil, apperror.New(400, "Không có mục nào để thêm vào đơn hàng", nil)
	}
	order, orgID, err := u.withEditableOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	serviceIDs, productIDs, err := splitItemIDs(items)
	if err != nil {
		return nil, err
	}
	cat, err := u.fetchOrderCatalog(ctx, orgID, serviceIDs, productIDs)
	if err != nil {
		return nil, err
	}

	lines, materials, deductions, addedSubtotal, err := buildOrderLines(orgID, order.ID, items, cat.pricing, cat.units, cat.materialMap, cat.servicePrices)
	if err != nil {
		return nil, err
	}

	// Thêm dòng chỉ làm tổng tăng nên discount cũ vẫn hợp lệ;
	// check đã-thu để chắc khi dữ liệu thanh toán bất thường.
	newSubtotal := order.SubtotalAmount + addedSubtotal
	newTotal := newSubtotal - order.DiscountAmount
	totalPaid, err := u.repo.GetTotalPaidByOrder(ctx, orgID, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi tính tổng đã thu", err)
	}
	if totalPaid > newTotal {
		return nil, apperror.New(400, "Đã thu vượt tổng mới, không thể thêm dòng", nil)
	}

	var deductList []domain.StockDeduction
	for pid, qty := range deductions {
		deductList = append(deductList, domain.StockDeduction{ProductID: pid, Quantity: qty})
	}

	if err := u.repo.AddOrderItems(ctx, orgID, order.ID, lines, materials, deductList, newSubtotal, newTotal); err != nil {
		log.Println("Error adding order items:", err)
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		if errors.Is(err, domain.ErrOrderNotEditable) {
			return nil, apperror.New(400, "Đơn đã khóa, không thêm được dòng hàng", err)
		}
		if errors.Is(err, domain.ErrInsufficientStock) {
			return nil, apperror.New(400, "Tồn kho không đủ cho dòng thêm này", err)
		}
		return nil, apperror.New(500, "Lỗi khi thêm dòng hàng", err)
	}

	updated := *order
	updated.SubtotalAmount = newSubtotal
	updated.TotalAmount = newTotal
	return toResponse(&updated), nil
}

// checkReferencesInOrg đảm bảo customer/appointment đi kèm (nếu có) thuộc đúng salon.
func (u *OrderUsecase) checkReferencesInOrg(ctx context.Context, orgID string, req *domain.CreateOrderRequest) error {
	if req.CustomerID != nil && strings.TrimSpace(*req.CustomerID) != "" {
		if err := u.ensureCustomerInOrg(ctx, orgID, strings.TrimSpace(*req.CustomerID)); err != nil {
			return err
		}
	}
	if req.AppointmentID != nil && strings.TrimSpace(*req.AppointmentID) != "" {
		exists, err := u.appointments.AppointmentExistsInOrg(ctx, orgID, strings.TrimSpace(*req.AppointmentID))
		if err != nil {
			return apperror.New(500, "Lỗi khi kiểm tra lịch hẹn", err)
		}
		if !exists {
			return apperror.New(404, "Không tìm thấy lịch hẹn trong tổ chức", nil)
		}
	}
	return nil
}

// normalizePhone chuẩn hóa SĐT POS: bỏ khoảng trắng/gạch/chấm, +84/84 -> 0.
func normalizePhone(raw string) string {
	p := strings.TrimSpace(raw)
	p = strings.ReplaceAll(p, " ", "")
	p = strings.ReplaceAll(p, "-", "")
	p = strings.ReplaceAll(p, ".", "")
	if strings.HasPrefix(p, "+84") {
		p = "0" + p[3:]
	} else if strings.HasPrefix(p, "84") && len(p) > 10 {
		p = "0" + p[2:]
	}
	return p
}

// resolveNewCustomer xử lý new_customer từ POS: SĐT đã có thì dùng luôn,
// chưa có thì tạo khách mới (chỉ tên + SĐT) rồi gán vào req để flow cũ tiếp tục.
// Trả về (tên khách hiển thị, có phải dùng lại không, lỗi).
// Không có new_customer thì trả về nil, false, nil (giữ walk-in).
func (u *OrderUsecase) resolveNewCustomer(ctx context.Context, orgID string, req *domain.CreateOrderRequest) (*string, bool, error) {
	if req.CustomerID != nil && strings.TrimSpace(*req.CustomerID) != "" {
		return nil, false, nil
	}
	if req.NewCustomer == nil {
		return nil, false, nil
	}
	customerID, customerName, reused, err := u.findOrCreateCustomer(ctx, orgID, req.NewCustomer.FullName, req.NewCustomer.Phone)
	if err != nil {
		return nil, false, err
	}
	req.CustomerID = customerID
	return customerName, reused, nil
}

// findOrCreateCustomer tìm khách theo SĐT (đã chuẩn hóa), chưa có thì tạo mới.
// Trả về (customerID, fullName, reused).
func (u *OrderUsecase) findOrCreateCustomer(ctx context.Context, orgID, fullName, phone string) (*string, *string, bool, error) {
	name := strings.TrimSpace(fullName)
	phone = normalizePhone(phone)
	if name == "" {
		return nil, nil, false, apperror.New(400, "Tên khách hàng mới không được để trống", nil)
	}
	if phone == "" {
		return nil, nil, false, apperror.New(400, "Số điện thoại khách mới không được để trống", nil)
	}
	existing, err := u.customers.FindCustomerByPhone(ctx, orgID, phone)
	if err != nil {
		return nil, nil, false, apperror.New(500, "Lỗi khi tìm khách theo SĐT", err)
	}
	if existing != nil {
		return &existing.ID, &existing.FullName, true, nil
	}
	c := &customerdomain.Customer{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		FullName:       name,
		Phone:          phone,
		Gender:         "other",
	}
	if err := c.Validate(); err != nil {
		return nil, nil, false, apperror.New(400, err.Error(), err)
	}
	if err := u.customers.CreateCustomer(ctx, c); err != nil {
		// Race: SĐT vừa được tạo ở request khác -> dùng luôn khách đó.
		if isUniqueViolation(err) {
			existing, findErr := u.customers.FindCustomerByPhone(ctx, orgID, phone)
			if findErr != nil {
				return nil, nil, false, apperror.New(500, "Lỗi khi tìm khách theo SĐT", findErr)
			}
			if existing != nil {
				return &existing.ID, &existing.FullName, true, nil
			}
		}
		log.Println("Error creating new customer:", err)
		return nil, nil, false, apperror.New(500, "Lỗi khi tạo khách hàng mới", err)
	}
	return &c.ID, &c.FullName, false, nil
}

// ---------- 2. Đọc đơn ----------

// GetOrdersByOrgID lấy danh sách đơn phân trang (lọc status tùy chọn).
func (u *OrderUsecase) GetOrdersByOrgID(ctx context.Context, page, pageSize int, status string) (*pagination.Result[*domain.OrderResponse], error) {
	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	params := pagination.Normalize(page, pageSize)
	status = strings.TrimSpace(status)

	orders, err := u.repo.GetOrdersByOrgID(ctx, orgID, status, params.PageSize, params.Offset())
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách đơn hàng", err)
	}
	results := []*domain.OrderResponse{}
	for _, o := range orders {
		results = append(results, toResponse(o))
	}
	total, err := u.repo.CountOrdersByOrgID(ctx, orgID, status)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm danh sách đơn hàng", err)
	}

	return pagination.NewResult(results, params, total), nil
}

// GetOrderStats lấy 4 số thẻ thống kê đơn: tổng + doanh thu hôm nay,
// chờ thanh toán, hủy/hoàn. % so hôm qua và % hủy/hoàn tính ở đây
// (chia cho 0 thì trả 0).
func (u *OrderUsecase) GetOrderStats(ctx context.Context) (*domain.OrderStatsResponse, error) {
	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	stats, err := u.repo.GetOrderStats(ctx, orgID)
	if err != nil {
		log.Println("Error getting order stats:", err)
		return nil, apperror.New(500, "Lỗi khi lấy thống kê đơn hàng", err)
	}

	if stats.YesterdayRevenue > 0 {
		stats.RevenueChangePct = (stats.TodayRevenue - stats.YesterdayRevenue) / stats.YesterdayRevenue * 100
	}
	if stats.MonthTotal > 0 {
		stats.CancelRefundRate = float64(stats.CancelRefundMonth) / float64(stats.MonthTotal) * 100
	}

	return stats, nil
}

// GetOrderDetail lấy chi tiết đơn: header + dòng hàng (kèm NV) + vật tư + thanh toán.
func (u *OrderUsecase) GetOrderDetail(ctx context.Context, id string) (*domain.OrderDetailResponse, error) {
	id, err := requireID(id, "Thiếu id đơn hàng")
	if err != nil {
		return nil, err
	}

	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	order, err := u.loadOrder(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	items, materials, err := u.loadItemsAndMaterials(ctx, orgID, order.ID)
	if err != nil {
		return nil, err
	}

	payments, err := u.repo.GetOrderPayments(ctx, orgID, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy thanh toán đơn hàng", err)
	}

	detail := &domain.OrderDetailResponse{
		Order:       toResponse(order),
		Items:       make([]*domain.OrderItemResponse, 0, len(items)),
		Materials:   make([]*domain.OrderMaterialResponse, 0, len(materials)),
		Payments:    make([]*domain.PaymentResponse, 0, len(payments)),
		Commissions: buildCommissions(items),
	}
	for _, it := range items {
		detail.Items = append(detail.Items, toItemResponse(it))
	}
	for _, m := range materials {
		detail.Materials = append(detail.Materials, toMaterialResponse(m))
	}
	for _, p := range payments {
		detail.Payments = append(detail.Payments, toPaymentResponse(p))
	}
	return detail, nil
}

// ---------- 3. Hoàn tất / hủy / hoàn ----------

// completeWithSlip chốt 1 đơn đã load sẵn: gom lines SP + vật tư rồi gọi
// repo chạy 1 tx (flip completed + trừ kho + nhả giữ chỗ + sổ sale + phiếu).
// Dùng chung cho nút chốt tay và auto-chốt khi thu đủ tiền.
func (u *OrderUsecase) completeWithSlip(ctx context.Context, orgID string, order *domain.Order) (*domain.OrderCompleteResponse, error) {
	items, materials, err := u.loadItemsAndMaterials(ctx, orgID, order.ID)
	if err != nil {
		return nil, err
	}

	productIDs := []string{}
	seenPID := map[string]struct{}{}
	for _, it := range items {
		if it.ItemType == domain.ItemTypeProduct && it.ProductID != nil {
			if _, ok := seenPID[*it.ProductID]; !ok {
				seenPID[*it.ProductID] = struct{}{}
				productIDs = append(productIDs, *it.ProductID)
			}
		}
	}

	pricing, units, err := u.fetchPricingUnits(ctx, orgID, productIDs)
	if err != nil {
		return nil, err
	}

	// Dòng SP đã lưu ở đơn vị nhỏ nhất từ lúc tạo đơn nên ráp thẳng
	// số lượng đã lưu + giá vốn base, không quy đổi lại.
	lines, err := saleSlipLines(items, materials, pricing, units)
	if err != nil {
		return nil, err
	}

	slip, err := u.repo.CompleteOrderWithSlip(ctx, orgID, order.ID, lines)
	if err != nil {
		log.Println("Error completing order:", err)
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		if errors.Is(err, domain.ErrOrderNotReady) {
			return nil, apperror.New(400, "Đơn không ở trạng thái chờ/xác nhận/giao hàng nên không thể chốt", err)
		}
		if errors.Is(err, domain.ErrInsufficientStock) {
			return nil, apperror.New(400, "Tồn kho không đủ để chốt đơn này", err)
		}
		return nil, apperror.New(500, "Lỗi khi chốt đơn hàng", err)
	}

	completed := *order
	completed.Status = domain.StatusCompleted
	return &domain.OrderCompleteResponse{
		Order:        toResponse(&completed),
		DocumentID:   slip.DocumentID,
		DocumentCode: slip.DocumentCode,
	}, nil
}

// CompleteOrder chốt tay đơn pending/confirm/delivery: trừ kho thật +
// nhả giữ chỗ + ghi sổ sale + sinh phiếu bán hàng. Tồn không đủ thì 400.
func (u *OrderUsecase) CompleteOrder(ctx context.Context, id string) (*domain.OrderCompleteResponse, error) {
	id, err := requireID(id, "Thiếu id đơn hàng")
	if err != nil {
		return nil, err
	}

	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	order, err := u.loadOrder(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if err := requireOrderStatus(order,
		[]string{domain.StatusPending, domain.StatusConfirm, domain.StatusDelivery},
		"Chỉ chốt đơn ở trạng thái chờ/xác nhận/giao hàng"); err != nil {
		return nil, err
	}

	return u.completeWithSlip(ctx, orgID, order)
}

// CancelOrder hủy đơn chưa chốt (pending/confirm/delivery), chỉ nhả giữ chỗ kho.
func (u *OrderUsecase) CancelOrder(ctx context.Context, id string) (*domain.OrderResponse, error) {
	return u.closeOrder(ctx, id, domain.StatusCancelled, []string{domain.StatusPending, domain.StatusConfirm, domain.StatusDelivery},
		"Chỉ được hủy đơn chưa chốt")
}

// RefundOrder hoàn đơn đã chốt, hoàn kho đã trừ.
func (u *OrderUsecase) RefundOrder(ctx context.Context, id string) (*domain.OrderResponse, error) {
	return u.closeOrder(ctx, id, domain.StatusRefunded, []string{domain.StatusCompleted},
		"Chỉ được hoàn đơn đã chốt")
}

// UpdateOrderCustomer gán/đổi khách hàng cho đơn chưa khóa
// (draft/pending_payment/paid). Nhận customer_id có sẵn hoặc new_customer
// (tìm theo SĐT, chưa có thì tạo mới — cùng luật với lúc tạo đơn).
func (u *OrderUsecase) UpdateOrderCustomer(ctx context.Context, id string, req *domain.UpdateOrderCustomerRequest) (*domain.OrderResponse, error) {
	id, err := requireID(id, "Thiếu id đơn hàng")
	if err != nil {
		return nil, err
	}
	if req == nil {
		return nil, apperror.New(400, "Thiếu thông tin khách hàng", nil)
	}

	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	order, err := u.loadOrder(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if err := requireOrderStatus(order,
		[]string{domain.StatusPending, domain.StatusConfirm, domain.StatusDelivery},
		"Đơn đã khóa, không đổi được khách hàng"); err != nil {
		return nil, err
	}

	var customerID *string
	if req.NewCustomer != nil {
		foundID, _, _, err := u.findOrCreateCustomer(ctx, orgID, req.NewCustomer.FullName, req.NewCustomer.Phone)
		if err != nil {
			return nil, err
		}
		customerID = foundID
	} else if req.CustomerID != nil && strings.TrimSpace(*req.CustomerID) != "" {
		cid := strings.TrimSpace(*req.CustomerID)
		if err := u.ensureCustomerInOrg(ctx, orgID, cid); err != nil {
			return nil, err
		}
		customerID = &cid
	} else {
		return nil, apperror.New(400, "Cần customer_id hoặc new_customer", nil)
	}

	if err := u.repo.UpdateOrderCustomer(ctx, orgID, order.ID, customerID); err != nil {
		log.Println("Error updating order customer:", err)
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi gán khách hàng cho đơn", err)
	}

	order.CustomerID = customerID
	return toResponse(order), nil
}

// UpdateOrderItemQty đổi số lượng 1 dòng đơn (chỉ pending/confirm).
// Quantity + Unit cùng ngữ nghĩa lúc tạo đơn (Unit rỗng = đơn vị lớn,
// server chuẩn hóa về lớn để lưu); dòng service bỏ qua Unit.
// Giá snapshot và NV được giữ; vật tư thuộc dòng scale theo tỷ lệ
// (giữ chỉnh tay, không regenerate từ định mức).
// Tổng mới phải chịu được discount và số đã thu, không thì 400.
func (u *OrderUsecase) UpdateOrderItemQty(ctx context.Context, orderID, itemID string, req *domain.UpdateOrderItemQtyRequest) (*domain.OrderItemResponse, error) {
	itemID, err := requireID(itemID, "Thiếu id dòng đơn hàng")
	if err != nil {
		return nil, err
	}
	if req == nil || req.Quantity <= 0 {
		return nil, apperror.New(400, "Số lượng phải lớn hơn 0", nil)
	}

	order, orgID, err := u.withEditableOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	items, materials, err := u.loadItemsAndMaterials(ctx, orgID, order.ID)
	if err != nil {
		return nil, err
	}
	var line *domain.OrderItem
	for _, it := range items {
		if it.ID == itemID {
			line = it
			break
		}
	}
	if line == nil {
		return nil, apperror.New(404, "Không tìm thấy dòng đơn trong tổ chức", nil)
	}

	// Chuẩn hóa SL mới về đơn vị lớn (dòng SP); dòng service là số suất.
	newQty := req.Quantity
	var large float64 = 1
	var pu domain.ProductUnit
	if line.ItemType == domain.ItemTypeProduct {
		if line.ProductID == nil || strings.TrimSpace(*line.ProductID) == "" {
			return nil, apperror.New(500, "Dữ liệu dòng đơn không hợp lệ", nil)
		}
		pid := strings.TrimSpace(*line.ProductID)
		units, err := u.fetchUnits(ctx, orgID, []string{pid})
		if err != nil {
			return nil, err
		}
		pu = units[pid]
		fromUnit := ""
		if req.Unit != nil {
			fromUnit = strings.TrimSpace(*req.Unit)
		}
		factor, ferr := productdomain.BaseFactor(pu.Unit, fromUnit, pu.NetUnit, pu.NetAmount)
		if ferr != nil {
			return nil, apperror.New(400, fmt.Sprintf("Lỗi khi chuyển đổi đơn vị sản phẩm: %s", ferr.Error()), ferr)
		}
		large = productdomain.LargeFactor(pu.Unit, pu.NetUnit, pu.NetAmount)
		if large <= 0 {
			large = 1
		}
		newQty = req.Quantity * factor / large
	}
	if line.Quantity <= 0 {
		return nil, apperror.New(500, "Dữ liệu dòng đơn không hợp lệ", nil)
	}
	ratio := newQty / line.Quantity

	updated := *line
	updated.Quantity = newQty

	updated.LineTotal = newQty * line.UnitPrice
	if err := updated.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	// Vật tư thuộc dòng scale theo tỷ lệ; delta giữ chỗ tính base.
	materialQtys := map[string]float64{}
	deltas := map[string]float64{}
	if line.ItemType == domain.ItemTypeProduct {
		deltas[strings.TrimSpace(*line.ProductID)] = (newQty - line.Quantity) * large
	}
	for _, m := range materials {
		if m.OrderItemID != itemID {
			continue
		}
		nq := m.Quantity * ratio
		materialQtys[m.ID] = nq
		deltas[m.ProductID] += nq - m.Quantity
	}

	newSubtotal := order.SubtotalAmount - line.LineTotal + updated.LineTotal
	if order.DiscountAmount > newSubtotal {
		return nil, apperror.New(400, "Giảm giá không được vượt tổng tiền", nil)
	}
	newTotal := newSubtotal - order.DiscountAmount
	totalPaid, err := u.repo.GetTotalPaidByOrder(ctx, orgID, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi tính tổng đã thu", err)
	}
	if totalPaid > newTotal {
		return nil, apperror.New(400, "Đã thu vượt tổng mới, không thể giảm đơn", nil)
	}

	var deductList []domain.StockDeduction
	for pid, qty := range deltas {
		if qty == 0 {
			continue
		}
		deductList = append(deductList, domain.StockDeduction{ProductID: pid, Quantity: qty})
	}
	if err := u.repo.ApplyItemQtyUpdate(ctx, orgID, order.ID, &updated, materialQtys, deductList, newSubtotal, newTotal); err != nil {
		log.Println("Error updating order item qty:", err)
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		if errors.Is(err, domain.ErrOrderNotEditable) {
			return nil, apperror.New(400, "Đơn đã khóa, không sửa được dòng hàng", err)
		}
		if errors.Is(err, domain.ErrInsufficientStock) {
			return nil, apperror.New(400, "Tồn kho không đủ cho số lượng mới", err)
		}
		return nil, apperror.New(500, "Lỗi khi đổi số lượng dòng hàng", err)
	}

	return toItemResponse(&updated), nil
}

// DeleteOrderItem xóa 1 dòng đơn (chỉ pending/confirm): cascade vật tư + NV
// của dòng, nhả giữ chỗ kho, chốt tổng mới. Cấm xóa dòng cuối cùng —
// muốn bỏ cả đơn thì dùng Hủy đơn.
func (u *OrderUsecase) DeleteOrderItem(ctx context.Context, orderID, itemID string) (string, error) {
	itemID, err := requireID(itemID, "Thiếu id dòng đơn hàng")
	if err != nil {
		return "", err
	}

	order, orgID, err := u.withEditableOrder(ctx, orderID)
	if err != nil {
		return "", err
	}

	items, materials, err := u.loadItemsAndMaterials(ctx, orgID, order.ID)
	if err != nil {
		return "", err
	}
	var line *domain.OrderItem
	for _, it := range items {
		if it.ID == itemID {
			line = it
			break
		}
	}
	if line == nil {
		return "", apperror.New(404, "Không tìm thấy dòng đơn trong tổ chức", nil)
	}
	if len(items) <= 1 {
		return "", apperror.New(400, "Không thể xóa dòng cuối cùng — hãy Hủy đơn nếu muốn bỏ cả đơn", nil)
	}

	// Số cần nhả (base): dòng SP quy từ đơn vị lớn, vật tư đã base.
	releases := map[string]float64{}
	if line.ItemType == domain.ItemTypeProduct {
		if line.ProductID == nil || strings.TrimSpace(*line.ProductID) == "" {
			return "", apperror.New(500, "Dữ liệu dòng đơn không hợp lệ", nil)
		}
		pid := strings.TrimSpace(*line.ProductID)
		units, err := u.fetchUnits(ctx, orgID, []string{pid})
		if err != nil {
			return "", err
		}
		pu := units[pid]
		factor, ferr := productdomain.BaseFactor(pu.Unit, pu.Unit, pu.NetUnit, pu.NetAmount)
		if ferr != nil {
			return "", apperror.New(400, fmt.Sprintf("Lỗi khi chuyển đổi đơn vị sản phẩm: %s", ferr.Error()), ferr)
		}
		releases[pid] = line.Quantity * factor
	}
	for _, m := range materials {
		if m.OrderItemID == itemID {
			releases[m.ProductID] += m.Quantity
		}
	}

	newSubtotal := order.SubtotalAmount - line.LineTotal
	if order.DiscountAmount > newSubtotal {
		return "", apperror.New(400, "Giảm giá không được vượt tổng tiền", nil)
	}
	newTotal := newSubtotal - order.DiscountAmount
	totalPaid, err := u.repo.GetTotalPaidByOrder(ctx, orgID, order.ID)
	if err != nil {
		return "", apperror.New(500, "Lỗi khi tính tổng đã thu", err)
	}
	if totalPaid > newTotal {
		return "", apperror.New(400, "Đã thu vượt tổng mới, không thể xóa dòng", nil)
	}

	var releaseList []domain.StockDeduction
	for pid, qty := range releases {
		if qty == 0 {
			continue
		}
		releaseList = append(releaseList, domain.StockDeduction{ProductID: pid, Quantity: qty})
	}
	if err := u.repo.ApplyDeleteItem(ctx, orgID, order.ID, itemID, releaseList, newSubtotal, newTotal); err != nil {
		log.Println("Error deleting order item:", err)
		if errors.Is(err, domain.ErrOrderNotFound) {
			return "", apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		if errors.Is(err, domain.ErrOrderNotEditable) {
			return "", apperror.New(400, "Đơn đã khóa, không xóa được dòng hàng", err)
		}
		return "", apperror.New(500, "Lỗi khi xóa dòng hàng", err)
	}

	return itemID, nil
}

// closeOrder khung chung cho hủy/hoàn: check trạng thái cho phép, gom tồn cần
// xử lý từ snapshot live, rồi giao repo ApplyCancel (1 tx).
// Refund (đã trừ thật) thì hoàn tồn; cancel (mới giữ chỗ) thì chỉ nhả giữ chỗ.
func (u *OrderUsecase) closeOrder(ctx context.Context, id, newStatus string, allowed []string, denyMsg string) (*domain.OrderResponse, error) {
	id, err := requireID(id, "Thiếu id đơn hàng")
	if err != nil {
		return nil, err
	}

	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	order, err := u.loadOrder(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	if err := requireOrderStatus(order, allowed, denyMsg); err != nil {
		return nil, err
	}

	items, materials, err := u.loadItemsAndMaterials(ctx, orgID, order.ID)
	if err != nil {
		return nil, err
	}

	// Dòng SP lưu theo đơn vị lớn nên phải quy về base mới khớp số đã giữ/trừ.
	var productIDs []string
	seenPID := map[string]struct{}{}
	for _, it := range items {
		if it.ItemType == domain.ItemTypeProduct && it.ProductID != nil {
			if _, ok := seenPID[*it.ProductID]; !ok {
				seenPID[*it.ProductID] = struct{}{}
				productIDs = append(productIDs, *it.ProductID)
			}
		}
	}
	units, err := u.fetchUnits(ctx, orgID, productIDs)
	if err != nil {
		return nil, err
	}
	restores, err := restoreQuantities(items, materials, units)
	if err != nil {
		return nil, err
	}
	// Chỉ đơn đã chốt (refund) mới từng bị trừ kho thật nên cần hoàn.
	// Đơn hủy trước chốt chỉ nhả giữ chỗ (releases), tồn thật không đổi.
	var restoreList, releaseList []domain.StockDeduction
	for pid, qty := range restores {
		if newStatus == domain.StatusRefunded {
			restoreList = append(restoreList, domain.StockDeduction{ProductID: pid, Quantity: qty})
		} else {
			releaseList = append(releaseList, domain.StockDeduction{ProductID: pid, Quantity: qty})
		}
	}

	if err := u.repo.ApplyCancel(ctx, orgID, order.ID, newStatus, restoreList, releaseList); err != nil {
		log.Println("Error cancelling order:", err)
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi hủy/hoàn đơn hàng", err)
	}

	order.Status = newStatus
	return toResponse(order), nil
}

// ---------- 4. Thanh toán ----------

// CreatePayment ghi nhận thanh toán, idempotent theo cặp provider/txn.
// Thu đủ tổng thì đơn tự chốt sang completed (trừ kho + phiếu bán hàng).
func (u *OrderUsecase) CreatePayment(ctx context.Context, orderID string, req *domain.CreatePaymentRequest) (*domain.PaymentResponse, error) {
	orderID, err := requireID(orderID, "Thiếu id đơn hàng")
	if err != nil {
		return nil, err
	}

	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	payment := &domain.Payment{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		OrderID:        orderID,
		Method:         strings.TrimSpace(req.Method),
		Provider:       req.Provider,
		ProviderTxnID:  req.ProviderTxnID,
		Amount:         req.Amount,
		Status:         domain.PaymentStatusSucceeded,
	}
	paidAt := time.Now()
	payment.PaidAt = &paidAt
	if err := payment.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	order, err := u.loadOrder(ctx, orgID, payment.OrderID)
	if err != nil {
		return nil, err
	}
	if order.Status == domain.StatusCancelled || order.Status == domain.StatusRefunded {
		return nil, apperror.New(400, "Không thể thanh toán đơn đã hủy/hoàn", nil)
	}
	if order.Status == domain.StatusCompleted {
		return nil, apperror.New(400, "Đơn hàng đã chốt, không thu thêm", nil)
	}

	// Idempotency: cùng cổng + mã giao dịch thì trả về bản ghi cũ.
	if payment.Provider != nil && strings.TrimSpace(*payment.Provider) != "" &&
		payment.ProviderTxnID != nil && strings.TrimSpace(*payment.ProviderTxnID) != "" {
		existing, err := u.repo.FindPaymentByProviderTxn(ctx, strings.TrimSpace(*payment.Provider), strings.TrimSpace(*payment.ProviderTxnID))
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi kiểm tra thanh toán", err)
		}
		if existing != nil {
			return toPaymentResponse(existing), nil
		}
	}

	if err := u.repo.CreatePayment(ctx, payment); err != nil {
		log.Println("Error creating payment:", err)
		if isUniqueViolation(err) {
			if payment.Provider != nil && payment.ProviderTxnID != nil {
				existing, findErr := u.repo.FindPaymentByProviderTxn(ctx, strings.TrimSpace(*payment.Provider), strings.TrimSpace(*payment.ProviderTxnID))
				if findErr == nil && existing != nil {
					return toPaymentResponse(existing), nil
				}
			}
			return nil, apperror.New(400, "Giao dịch thanh toán đã tồn tại", err)
		}
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi tạo thanh toán", err)
	}

	totalPaid, err := u.repo.GetTotalPaidByOrder(ctx, orgID, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi tính tổng đã thu", err)
	}
	if totalPaid >= order.TotalAmount {
		// Thu đủ thì chốt đơn luôn: trừ kho + nhả giữ chỗ + sổ sale + phiếu bán hàng.
		// NOTE: thanh toán ở trên đã ghi nhận; nếu chốt lỗi (vd hết kho) thì đơn
		// ở lại trạng thái cũ để nhân viên xử lý, tiền đã thu không mất.
		if _, err := u.completeWithSlip(ctx, orgID, order); err != nil {
			log.Println("Error auto-completing paid order:", err)
			return nil, err
		}
	}

	return toPaymentResponse(payment), nil
}

// ---------- 5. Gán lại NV thực hiện / vật tư tiêu hao ----------

// ReplaceStaffOrderItems gán lại toàn bộ NV thực hiện cho 1 dòng đơn.
// type = loại hoa hồng (percent | fixed | profit); percent/profit do server
// tự tính, chỉ fixed lấy số client gửi.
// Tổng share_pct của các dòng percent/profit trong 1 món phải bằng 100.
// Danh sách rỗng = gỡ hết NV của dòng.
func (u *OrderUsecase) ReplaceStaffOrderItems(ctx context.Context, orderItemID string, staffItems []*domain.StaffOrderItemInput) ([]*domain.StaffOrderItemResponse, error) {
	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	orderItemID, err = requireID(orderItemID, "Thiếu id dòng đơn hàng")
	if err != nil {
		return nil, err
	}

	// Validate từng dòng + chống trùng NV + cộng tổng share (bỏ dòng fixed).
	seen := map[string]struct{}{}
	staffIDs := make([]string, 0, len(staffItems))
	var totalShare float64
	hasSplit := false
	for i, item := range staffItems {
		if item == nil {
			return nil, apperror.New(400, fmt.Sprintf("Nhân viên thứ %d rỗng", i+1), nil)
		}
		if err := item.Validate(); err != nil {
			return nil, apperror.New(400, fmt.Sprintf("Nhân viên thứ %d: %s", i+1, err.Error()), err)
		}
		id := strings.TrimSpace(item.StaffID)
		if _, dup := seen[id]; dup {
			return nil, apperror.New(400, fmt.Sprintf("Nhân viên %s bị trùng trong dòng đơn", id), nil)
		}
		seen[id] = struct{}{}
		staffIDs = append(staffIDs, id)
		if item.NormalizeType() != domain.StaffTypeFixed {
			hasSplit = true
			totalShare += *item.SharePct
		}
	}
	if hasSplit && (totalShare < 99.999 || totalShare > 100.001) {
		return nil, apperror.New(400, fmt.Sprintf("Tổng share_pct phải bằng 100 (đang %.2f)", totalShare), nil)
	}

	// Dòng đơn phải thuộc đúng salon (chống lẫn tenant), đồng thời suy đơn
	// chứa nó để tải dữ liệu tính hoa hồng server-side.
	itemOrders, err := u.repo.MapItemOrders(ctx, orgID, []string{orderItemID})
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi kiểm tra dòng đơn hàng", err)
	}
	orderID, ok := itemOrders[orderItemID]
	if !ok {
		return nil, apperror.New(404, "Không tìm thấy dòng đơn hàng trong tổ chức", nil)
	}

	// NV phải thuộc đúng salon (bỏ NV đã xóa mềm).
	if err := u.ensureStaffsInOrg(ctx, orgID, staffIDs); err != nil {
		return nil, err
	}

	// Tải dòng + cả đơn: mẫu số margin cho profit (service: cả đơn,
	// SP: giá vốn chính dòng), line_total làm gốc cho percent/profit.
	items, materials, err := u.loadItemsAndMaterials(ctx, orgID, orderID)
	if err != nil {
		return nil, err
	}
	var line *domain.OrderItem
	for _, it := range items {
		if it.ID == orderItemID {
			line = it
			break
		}
	}
	if line == nil {
		return nil, apperror.New(404, "Không tìm thấy dòng đơn hàng trong tổ chức", nil)
	}
	var serviceRevenue, materialCost float64
	for _, it := range items {
		if it.ItemType == domain.ItemTypeService {
			serviceRevenue += it.LineTotal
		}
	}
	for _, m := range materials {
		materialCost += m.Quantity * m.UnitCostAtTime
	}
	costPrice := 0.0
	if line.ItemType == domain.ItemTypeProduct && line.ProductID != nil {
		for _, in := range staffItems {
			if in.NormalizeType() == domain.StaffTypeProfit {
				pricing, _, err := u.fetchPricingUnits(ctx, orgID, []string{strings.TrimSpace(*line.ProductID)})
				if err != nil {
					return nil, err
				}
				costPrice = pricing[strings.TrimSpace(*line.ProductID)].CostPrice
				break
			}
		}
	}

	staffs := make([]*domain.StaffOrderItem, 0, len(staffItems))
	for _, item := range staffItems {
		id := strings.TrimSpace(item.StaffID)
		typ := item.NormalizeType()
		// commission_amount client gửi chỉ dùng cho fixed (nhập tay);
		// percent/profit do server tự tính, gửi kèm sẽ bị bỏ qua.
		fixed := 0.0
		if item.CommissionAmount != nil {
			fixed = *item.CommissionAmount
		}
		revenue, cost := serviceRevenue, materialCost
		if line.ItemType == domain.ItemTypeProduct {
			revenue = line.LineTotal
			cost = line.Quantity * costPrice
		}
		staffs = append(staffs, &domain.StaffOrderItem{
			ID:               utils.NewID(),
			OrganizationID:   orgID,
			OrderItemID:      orderItemID,
			StaffID:          id,
			Type:             typ,
			SharePct:         *item.SharePct,
			CommissionAmount: computeCommission(typ, *item.SharePct, line.LineTotal, revenue, cost, fixed),
		})
	}

	if err := u.repo.ReplaceStaffOrderItems(ctx, orgID, orderItemID, staffs); err != nil {
		log.Println("Error replacing staff order items:", err)
		return nil, apperror.New(500, "Lỗi khi gán nhân viên cho dòng đơn hàng", err)
	}

	resp := make([]*domain.StaffOrderItemResponse, 0, len(staffs))
	for _, s := range staffs {
		resp = append(resp, toStaffResponse(s))
	}
	return resp, nil
}

// ReplaceOrderMaterials gán lại toàn bộ vật tư tiêu hao cho các đơn có trong payload.
// Client chỉ gửi order_item_id, server tự suy đơn chứa nó nên 1 lần gọi
// xử lý được vật tư của nhiều đơn. Mảng rỗng = không làm gì.
// Chỉ ghi log tiêu hao, không động kho.
// unit_cost_at_time do UI gửi (đã quy đổi theo đơn vị xuất).
func (u *OrderUsecase) ReplaceOrderMaterials(ctx context.Context, inputs []*domain.OrderMaterialInput) ([]*domain.OrderMaterialResponse, error) {
	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if inputs == nil {
		inputs = []*domain.OrderMaterialInput{}
	}

	type rawRow struct {
		idx  int
		unit string
		m    *domain.OrderItemMaterial
	}
	raws := make([]rawRow, 0, len(inputs))
	seenItem := map[string]struct{}{}
	var itemIDs []string
	seenProduct := map[string]struct{}{}
	var productIDs []string
	for i, in := range inputs {
		if in == nil {
			return nil, apperror.New(400, fmt.Sprintf("Vật tư thứ %d rỗng", i+1), nil)
		}
		m := &domain.OrderItemMaterial{
			ID:          utils.NewID(),
			OrderItemID: strings.TrimSpace(in.OrderItemID),
			ProductID:   strings.TrimSpace(in.ProductID),
			Quantity:    in.Quantity,
		}
		if m.OrderItemID == "" {
			return nil, apperror.New(400, fmt.Sprintf("Vật tư thứ %d thiếu order_item_id", i+1), nil)
		}
		if m.Quantity <= 0 {
			return nil, apperror.New(400, fmt.Sprintf("Vật tư thứ %d: số lượng phải lớn hơn 0", i+1), nil)
		}
		unit := ""
		if in.Unit != nil {
			unit = *in.Unit
		}
		raws = append(raws, rawRow{idx: i + 1, unit: unit, m: m})
		if _, ok := seenItem[m.OrderItemID]; !ok {
			seenItem[m.OrderItemID] = struct{}{}
			itemIDs = append(itemIDs, m.OrderItemID)
		}
		if _, ok := seenProduct[m.ProductID]; !ok {
			seenProduct[m.ProductID] = struct{}{}
			productIDs = append(productIDs, m.ProductID)
		}
	}

	if len(raws) == 0 {
		return []*domain.OrderMaterialResponse{}, nil
	}

	// Suy đơn từ dòng đơn trước (rẻ + chặn sớm dòng lạ/khác salon),
	// rồi mới fetch giá/đơn vị để quy đổi.
	itemOrders, err := u.repo.MapItemOrders(ctx, orgID, itemIDs)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi tra đơn của dòng hàng", err)
	}
	orderSet := map[string]struct{}{}
	for i, r := range raws {
		orderID, ok := itemOrders[r.m.OrderItemID]
		if !ok {
			return nil, apperror.New(404, fmt.Sprintf("Vật tư thứ %d: không tìm thấy dòng đơn trong tổ chức", i+1), nil)
		}
		orderSet[orderID] = struct{}{}
	}
	orderIDs := make([]string, 0, len(orderSet))
	for id := range orderSet {
		orderIDs = append(orderIDs, id)
	}

	// Đơn vị + giá vốn do server quyết: quy Quantity về đơn vị nhỏ nhất
	// và tính lại giá vốn theo đơn vị gửi, không tin số client.
	pricing, units, err := u.fetchPricingUnits(ctx, orgID, productIDs)
	if err != nil {
		return nil, err
	}
	materials := make([]*domain.OrderItemMaterial, 0, len(raws))
	for _, r := range raws {
		pu, ok := units[r.m.ProductID]
		if !ok {
			return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", r.m.ProductID), nil)
		}
		cost, ok := pricing[r.m.ProductID]
		if !ok {
			return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", r.m.ProductID), nil)
		}
		baseQty, baseCost, convErr := productdomain.ToBase(pu.Unit, r.unit, pu.NetUnit, pu.NetAmount, r.m.Quantity, cost.CostPrice)
		if convErr != nil {
			return nil, apperror.New(400, fmt.Sprintf("Vật tư thứ %d: %s", r.idx, convErr.Error()), convErr)
		}
		r.m.Quantity, r.m.UnitCostAtTime = baseQty, baseCost
		// Unit lưu theo quantity đã quy đổi (đơn vị nhỏ nhất), không phải đơn vị hiển thị.
		r.m.Unit = baseUnitOf(pu)
		if err := r.m.Validate(); err != nil {
			return nil, apperror.New(400, fmt.Sprintf("Vật tư thứ %d: %s", r.idx, err.Error()), err)
		}
		materials = append(materials, r.m)
	}

	if err := u.ensureProductsInOrg(ctx, orgID, productIDs); err != nil {
		return nil, err
	}

	if err := u.repo.ReplaceOrderMaterials(ctx, orgID, orderIDs, materials); err != nil {
		log.Println("Error replacing order materials:", err)
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		if errors.Is(err, domain.ErrOrderNotEditable) {
			return nil, apperror.New(400, "Đơn đã chốt/khóa, không sửa vật tư — hãy hoàn đơn để làm lại", err)
		}
		if errors.Is(err, domain.ErrInsufficientStock) {
			return nil, apperror.New(400, "Tồn kho không đủ cho vật tư mới này", err)
		}
		return nil, apperror.New(500, "Lỗi khi gán vật tư cho đơn hàng", err)
	}

	resp := make([]*domain.OrderMaterialResponse, 0, len(materials))
	for _, m := range materials {
		resp = append(resp, toMaterialResponse(m))
	}
	return resp, nil
}

// ---------- 6. Danh mục bán hàng POS ----------

// GetPosItemsByOrgID lấy danh mục bán hàng POS (union sản phẩm + dịch vụ).
// Limit clamp 1..100, còn lại (search/category/cursor) repo tự xử.
func (u *OrderUsecase) GetPosItemsByOrgID(ctx context.Context, limit int, name, itemType string, id string, search string, categoryFilter string) ([]*domain.PosItemResponse, error) {
	orgID, err := requireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	// Giới hạn page_size hợp lệ, mặc định 20
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	items, err := u.repo.GetPosItemsByOrgID(ctx, orgID, limit, name, itemType, id, search, categoryFilter)
	if err != nil {
		log.Println("Error getting POS items:", err)
		return nil, apperror.New(500, "Lỗi khi lấy danh sách sản phẩm/dịch vụ", err)
	}

	return items, nil
}
