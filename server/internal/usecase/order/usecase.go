package order

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
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

// generateOrderCode sinh mã đơn dạng ORD-ddMMyy-HHmm + 4 số ngẫu nhiên.
func generateOrderCode() string {
	now := time.Now()
	var randPart [4]byte
	for i := range randPart {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			randPart[i] = byte('0' + now.Nanosecond()%10)
			continue
		}
		randPart[i] = byte('0' + n.Int64())
	}
	// VD: ORD-300926-14304821
	return fmt.Sprintf("ORD-%02d%02d%02d-%02d%02d%s",
		now.Day(), int(now.Month()), now.Year()%100,
		now.Hour(), now.Minute(), string(randPart[:]))
}

// isUniqueViolation nhận diện lỗi unique PostgreSQL (mã 23505) để map
// sang message thân thiện (trùng mã đơn / trùng giao dịch thanh toán).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// toResponse map entity Order sang response (chưa kèm tên khách POS).
func toResponse(o *domain.Order) *domain.OrderResponse {
	return &domain.OrderResponse{
		ID:             o.ID,
		OrganizationID: o.OrganizationID,
		Code:           o.Code,
		CustomerID:     o.CustomerID,
		AppointmentID:  o.AppointmentID,
		SubtotalAmount: o.SubtotalAmount,
		DiscountAmount: o.DiscountAmount,
		TotalAmount:    o.TotalAmount,
		Status:         o.Status,
		CreatedAt:      o.CreatedAt,
		UpdatedAt:      o.UpdatedAt,
	}
}

// toPaymentResponse map entity Payment sang response.
func toPaymentResponse(p *domain.Payment) *domain.PaymentResponse {
	return &domain.PaymentResponse{
		ID: p.ID, OrderID: p.OrderID, Method: p.Method, Provider: p.Provider,
		ProviderTxnID: p.ProviderTxnID, Amount: p.Amount, Status: p.Status,
		PaidAt: p.PaidAt, CreatedAt: p.CreatedAt,
	}
}

// strPtr biến "" thành nil để chứa trong field nullable của response.
func strPtr(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	v := strings.TrimSpace(s)
	return &v
}

// ptrVal mở pointer string, nil thành "".
func ptrVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// ---------- 1. Tạo đơn ----------

// CreateOrder tạo đơn từ POS: validate dòng hàng, resolve khách (cũ/mới/walk-in),
// server tự tra giá + snapshot vật tư, giữ chỗ kho trong 1 tx.
// Đơn tổng 0đ thì paid luôn, ngược lại pending_payment.
func (u *OrderUsecase) CreateOrder(ctx context.Context, req *domain.CreateOrderRequest) (*domain.OrderResponse, error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
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
	seenService := map[string]struct{}{}
	seenProduct := map[string]struct{}{}
	for i, in := range req.Items {
		if in.Quantity <= 0 {
			return nil, apperror.New(400, fmt.Sprintf("Số lượng ở dòng thứ %d phải lớn hơn 0", i+1), nil)
		}
		switch strings.TrimSpace(in.ItemType) {
		case domain.ItemTypeService:
			if in.ServiceID == nil || strings.TrimSpace(*in.ServiceID) == "" {
				return nil, apperror.New(400, fmt.Sprintf("Dòng thứ %d thiếu service_id", i+1), nil)
			}
			if _, ok := seenService[strings.TrimSpace(*in.ServiceID)]; !ok {
				seenService[strings.TrimSpace(*in.ServiceID)] = struct{}{}
				serviceIDs = append(serviceIDs, strings.TrimSpace(*in.ServiceID))
			}
		case domain.ItemTypeProduct:
			if in.ProductID == nil || strings.TrimSpace(*in.ProductID) == "" {
				return nil, apperror.New(400, fmt.Sprintf("Dòng thứ %d thiếu product_id", i+1), nil)
			}
			if _, ok := seenProduct[strings.TrimSpace(*in.ProductID)]; !ok {
				seenProduct[strings.TrimSpace(*in.ProductID)] = struct{}{}
				productIDs = append(productIDs, strings.TrimSpace(*in.ProductID))
			}
		default:
			return nil, apperror.New(400, fmt.Sprintf("Loại dòng thứ %d không hợp lệ (service | product)", i+1), nil)
		}
	}

	if len(serviceIDs) > 0 {
		missing, err := u.catalog.ServicesExistInOrg(ctx, orgID, serviceIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi kiểm tra dịch vụ", err)
		}
		if len(missing) > 0 {
			return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy dịch vụ trong tổ chức: %s", strings.Join(missing, ", ")), nil)
		}
	}
	if len(productIDs) > 0 {
		missing, err := u.catalog.ProductsExistInOrg(ctx, orgID, productIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi kiểm tra sản phẩm", err)
		}
		if len(missing) > 0 {
			return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", strings.Join(missing, ", ")), nil)
		}
	}

	// Giá + đơn vị tại thời điểm bán do server quyết định, không tin client.
	// Số lượng tồn kho/giữ chỗ/snapshot vật tư LUÔN lưu ở đơn vị nhỏ nhất.
	pricing := map[string]domain.ProductPricing{}
	units := map[string]domain.ProductUnit{}
	if len(productIDs) > 0 {
		pricing, err = u.products.GetProductPricing(ctx, orgID, productIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi lấy giá sản phẩm", err)
		}
		units, err = u.products.GetProductUnits(ctx, orgID, productIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi lấy đơn vị sản phẩm", err)
		}
		for _, id := range productIDs {
			if _, ok := pricing[id]; !ok {
				return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", id), nil)
			}
			if _, ok := units[id]; !ok {
				return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", id), nil)
			}
		}
	}
	materialMap := map[string][]domain.ServiceMaterialUsage{}
	if len(serviceIDs) > 0 {
		materialMap, err = u.services.GetServiceMaterials(ctx, orgID, serviceIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi lấy định mức vật tư", err)
		}
	}

	// Định mức có thể lưu đơn vị lớn hoặc nhỏ (cột service_materials.unit) nên
	// nạp thêm đơn vị các SP vật tư để quy về đơn vị nhỏ nhất lúc snapshot.
	var recipePIDs []string
	seenRecipe := map[string]struct{}{}
	for _, usages := range materialMap {
		for _, mu := range usages {
			if _, ok := units[mu.ProductID]; ok {
				continue
			}
			if _, ok := seenRecipe[mu.ProductID]; !ok {
				seenRecipe[mu.ProductID] = struct{}{}
				recipePIDs = append(recipePIDs, mu.ProductID)
			}
		}
	}
	if len(recipePIDs) > 0 {
		recipeUnits, err := u.products.GetProductUnits(ctx, orgID, recipePIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi lấy đơn vị vật tư", err)
		}
		for id, pu := range recipeUnits {
			units[id] = pu
		}
		for _, id := range recipePIDs {
			if _, ok := units[id]; !ok {
				return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", id), nil)
			}
		}
	}

	orderID := utils.NewID()
	var items []*domain.OrderItem
	var materials []*domain.OrderItemMaterial
	deductions := map[string]float64{}
	var subtotal float64

	for _, in := range req.Items {
		itemType := strings.TrimSpace(in.ItemType)
		var unitPrice float64
		var unit *string
		quantity := in.Quantity
		if itemType == domain.ItemTypeProduct {
			pid := strings.TrimSpace(*in.ProductID)
			unitPrice = pricing[pid].SellPrice
			u := strings.TrimSpace(units[pid].Unit)
			unit = &u
		} else {
			// Giá dịch vụ đọc từ service repo? Tạm dùng giá 0 và để repo FK giữ đúng tham chiếu;
			// giá dịch vụ thực tế lấy từ bảng services qua pricing mở rộng sau.
			// Để đơn đúng tiền ngay, yêu cầu client không gửi giá mà server tra giá dịch vụ:
			unitPrice, err = u.servicePrice(ctx, orgID, strings.TrimSpace(*in.ServiceID))
			if err != nil {
				return nil, err
			}
		}
		item := &domain.OrderItem{
			ID:             utils.NewID(),
			OrganizationID: orgID,
			OrderID:        orderID,
			ItemType:       itemType,
			Quantity:       quantity,
			UnitPrice:      unitPrice,
			Unit:           unit,
			LineTotal:      quantity * unitPrice,
		}
		fmt.Println("Creating order item:", item.Quantity, item.UnitPrice, item.LineTotal)
		if in.ServiceID != nil {
			v := strings.TrimSpace(*in.ServiceID)
			item.ServiceID = &v
		}
		if in.ProductID != nil {
			v := strings.TrimSpace(*in.ProductID)
			item.ProductID = &v
		}
		if in.StaffID != nil {
			v := strings.TrimSpace(*in.StaffID)
			item.StaffID = &v
		}
		if err := item.Validate(); err != nil {
			return nil, apperror.New(400, err.Error(), err)
		}
		items = append(items, item)
		subtotal += item.LineTotal

		if itemType == domain.ItemTypeProduct {
			pu := units[*item.ProductID]
			costPrice := pricing[*item.ProductID].CostPrice
			baseQty,_ ,err := productdomain.ToBase(pu.Unit,"", pu.NetUnit, pu.NetAmount, item.Quantity, costPrice)
			if err != nil {
				return nil, apperror.New(400, fmt.Sprintf("Lỗi khi chuyển đổi đơn vị sản phẩm: %s", err.Error()), err)
			}
			deductions[*item.ProductID] += baseQty
		} else {
			// Snapshot vật tư: quy định mức về đơn vị nhỏ nhất (recipe có thể
			// lưu đơn vị lớn như tuýp/can hoặc nhỏ như ml/g) và giá vốn về
			// giá trên đơn vị nhỏ nhất để cặp (quantity, unit_cost) đồng nhất.
			for idx, mu := range materialMap[*item.ServiceID] {
				pu, ok := units[mu.ProductID]
				if !ok {
					return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", mu.ProductID), nil)
				}
				recipeUnit := strings.TrimSpace(mu.Unit)
				if recipeUnit == "" {
					recipeUnit = pu.Unit
				}
				factor, ferr := productdomain.BaseFactor(pu.Unit, recipeUnit, pu.NetUnit, pu.NetAmount)
				if ferr != nil {
					return nil, apperror.New(400, fmt.Sprintf("Định mức vật tư thứ %d: %s", idx+1, ferr.Error()), ferr)
				}
				large := productdomain.LargeFactor(pu.Unit, pu.NetUnit, pu.NetAmount)
				if large <= 0 {
					large = 1
				}
				qty := mu.QuantityPerService * factor * item.Quantity
				materials = append(materials, &domain.OrderItemMaterial{
					ID:             utils.NewID(),
					OrderItemID:    item.ID,
					ProductID:      mu.ProductID,
					Quantity:       qty,
					UnitCostAtTime: mu.UnitCost / large,
					Unit:           baseUnitOf(pu),
				})
				deductions[mu.ProductID] += qty
			}
		}
	}

	if req.DiscountAmount > subtotal {
		return nil, apperror.New(400, "Giảm giá không được vượt tổng tiền", nil)
	}
	total := subtotal - req.DiscountAmount
	status := domain.StatusPending

	order := &domain.Order{
		ID:             orderID,
		OrganizationID: orgID,
		Code:           generateOrderCode(),
		CustomerID:     strPtr(ptrVal(req.CustomerID)),
		AppointmentID:  strPtr(ptrVal(req.AppointmentID)),
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

// checkReferencesInOrg đảm bảo customer/appointment đi kèm (nếu có) thuộc đúng salon.
func (u *OrderUsecase) checkReferencesInOrg(ctx context.Context, orgID string, req *domain.CreateOrderRequest) error {
	if req.CustomerID != nil && strings.TrimSpace(*req.CustomerID) != "" {
		exists, err := u.customers.CustomerExistsInOrg(ctx, orgID, strings.TrimSpace(*req.CustomerID))
		if err != nil {
			return apperror.New(500, "Lỗi khi kiểm tra khách hàng", err)
		}
		if !exists {
			return apperror.New(404, "Không tìm thấy khách hàng trong tổ chức", nil)
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

// servicePrice tra giá dịch vụ tại thời điểm bán (sai org/hết hiệu lực thì 404).
func (u *OrderUsecase) servicePrice(ctx context.Context, orgID, serviceID string) (float64, error) {
	price, err := u.services.GetServicePrice(ctx, orgID, serviceID)
	if err != nil {
		if errors.Is(err, domain.ErrServiceNotFound) {
			return 0, apperror.New(404, "Không tìm thấy dịch vụ trong tổ chức", err)
		}
		return 0, apperror.New(500, "Lỗi khi lấy giá dịch vụ", err)
	}
	return price, nil
}

// ---------- 2. Đọc đơn ----------

// GetOrdersByOrgID lấy danh sách đơn phân trang (lọc status tùy chọn).
func (u *OrderUsecase) GetOrdersByOrgID(ctx context.Context, page, pageSize int, status string) (*pagination.Result[*domain.OrderResponse], error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
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

// GetOrderDetail lấy chi tiết đơn: header + dòng hàng (kèm NV) + vật tư + thanh toán.
func (u *OrderUsecase) GetOrderDetail(ctx context.Context, id string) (*domain.OrderDetailResponse, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id đơn hàng", nil)
	}

	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}

	order, err := u.repo.GetOrderByID(ctx, orgID, strings.TrimSpace(id))
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy đơn hàng", err)
	}

	items, err := u.repo.GetOrderItems(ctx, orgID, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy dòng đơn hàng", err)
	}

	materials, err := u.repo.GetOrderMaterials(ctx, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy vật tư đơn hàng", err)
	}

	payments, err := u.repo.GetOrderPayments(ctx, orgID, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy thanh toán đơn hàng", err)
	}

	detail := &domain.OrderDetailResponse{
		Order:     toResponse(order),
		Items:     make([]*domain.OrderItemResponse, 0, len(items)),
		Materials: make([]*domain.OrderMaterialResponse, 0, len(materials)),
		Payments:  make([]*domain.PaymentResponse, 0, len(payments)),
	}
	for _, it := range items {
		detail.Items = append(detail.Items, &domain.OrderItemResponse{
			ID: it.ID, ItemType: it.ItemType, ServiceID: it.ServiceID,
			ProductID: it.ProductID, StaffID: it.StaffID,
			Quantity: it.Quantity, UnitPrice: it.UnitPrice, LineTotal: it.LineTotal,
			Staff: it.Staff,
		})
	}
	for _, m := range materials {
		detail.Materials = append(detail.Materials, &domain.OrderMaterialResponse{
			ID: m.ID, OrderItemID: m.OrderItemID, ProductID: m.ProductID,
			Quantity: m.Quantity, UnitCostAtTime: m.UnitCostAtTime, Unit: m.Unit,
		})
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
	items, err := u.repo.GetOrderItems(ctx, orgID, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy dòng đơn hàng", err)
	}
	materials, err := u.repo.GetOrderMaterials(ctx, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy vật tư đơn hàng", err)
	}

	productIDs := []string{}
	for _, it := range items{
		if it.ItemType == domain.ItemTypeProduct && it.ProductID !=nil{
			productIDs = append(productIDs, *it.ProductID)
		}
	}

	pricing := map[string]domain.ProductPricing{}
	units := map[string]domain.ProductUnit{}
	if len(productIDs) > 0 {
		pricing, err = u.products.GetProductPricing(ctx, orgID, productIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi lấy giá sản phẩm", err)
		}
		units, err = u.products.GetProductUnits(ctx, orgID, productIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi lấy đơn vị sản phẩm", err)
		}
		for _, id := range productIDs {
			if _, ok := pricing[id]; !ok {
				return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", id), nil)
			}
			if _, ok := units[id]; !ok {
				return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", id), nil)
			}
		}
	}

	var lines []domain.SaleSlipLine
	for _, it := range items {
		if it.ItemType == domain.ItemTypeProduct && it.ProductID != nil {
			
			qty,basePrice, err := productdomain.ToBase(units[*it.ProductID].Unit, units[*it.ProductID].Unit, units[*it.ProductID].NetUnit, units[*it.ProductID].NetAmount, it.Quantity, pricing[*it.ProductID].CostPrice)
			if err != nil {
				return nil, apperror.New(400, fmt.Sprintf("Lỗi khi chuyển đổi đơn vị sản phẩm: %s", err.Error()), err)
			}
			lines = append(lines, domain.SaleSlipLine{
				ProductID: *it.ProductID,
				Quantity:  qty,
				UnitPrice: basePrice,
			})
		}
	}
	for _, m := range materials {
		lines = append(lines, domain.SaleSlipLine{
			ProductID: m.ProductID,
			Quantity:  m.Quantity,
			UnitPrice: m.UnitCostAtTime,
		})
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
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id đơn hàng", nil)
	}

	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}

	order, err := u.repo.GetOrderByID(ctx, orgID, strings.TrimSpace(id))
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy đơn hàng", err)
	}
	switch order.Status {
	case domain.StatusPending, domain.StatusConfirm, domain.StatusDelivery:
	default:
		return nil, apperror.New(400, "Chỉ chốt đơn ở trạng thái chờ/xác nhận/giao hàng", nil)
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
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id đơn hàng", nil)
	}
	if req == nil {
		return nil, apperror.New(400, "Thiếu thông tin khách hàng", nil)
	}

	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}

	order, err := u.repo.GetOrderByID(ctx, orgID, strings.TrimSpace(id))
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy đơn hàng", err)
	}
	switch order.Status {
	case domain.StatusPending, domain.StatusConfirm, domain.StatusDelivery:
	default:
		return nil, apperror.New(400, "Đơn đã khóa, không đổi được khách hàng", nil)
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
		exists, err := u.customers.CustomerExistsInOrg(ctx, orgID, cid)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi kiểm tra khách hàng", err)
		}
		if !exists {
			return nil, apperror.New(404, "Không tìm thấy khách hàng trong tổ chức", nil)
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

// closeOrder khung chung cho hủy/hoàn: check trạng thái cho phép, gom tồn cần
// xử lý từ snapshot live, rồi giao repo ApplyCancel (1 tx).
// Refund (đã trừ thật) thì hoàn tồn; cancel (mới giữ chỗ) thì chỉ nhả giữ chỗ.
func (u *OrderUsecase) closeOrder(ctx context.Context, id, newStatus string, allowed []string, denyMsg string) (*domain.OrderResponse, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id đơn hàng", nil)
	}

	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}

	order, err := u.repo.GetOrderByID(ctx, orgID, strings.TrimSpace(id))
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy đơn hàng", err)
	}

	ok := false
	for _, s := range allowed {
		if order.Status == s {
			ok = true
			break
		}
	}
	if !ok {
		return nil, apperror.New(400, denyMsg, nil)
	}

	items, err := u.repo.GetOrderItems(ctx, orgID, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy dòng đơn hàng", err)
	}
	materials, err := u.repo.GetOrderMaterials(ctx, order.ID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy vật tư đơn hàng", err)
	}

	restores := map[string]float64{}
	for _, it := range items {
		if it.ItemType == domain.ItemTypeProduct && it.ProductID != nil {
			restores[*it.ProductID] += it.Quantity
		}
	}
	for _, m := range materials {
		restores[m.ProductID] += m.Quantity
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
	if strings.TrimSpace(orderID) == "" {
		return nil, apperror.New(400, "Thiếu id đơn hàng", nil)
	}

	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}

	payment := &domain.Payment{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		OrderID:        strings.TrimSpace(orderID),
		Method:         strings.TrimSpace(req.Method),
		Provider:       req.Provider,
		ProviderTxnID:  req.ProviderTxnID,
		Amount:         req.Amount,
		Status:         domain.PaymentStatusSucceeded,
	}
	if t := time.Now(); true {
		payment.PaidAt = &t
	}
	if err := payment.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	order, err := u.repo.GetOrderByID(ctx, orgID, payment.OrderID)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy đơn hàng", err)
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
// type = loại hoa hồng (percent | fixed | profit), hoa hồng do UI tự nhập.
// Tổng share_pct của các dòng percent/profit trong 1 món phải bằng 100.
func (u *OrderUsecase) ReplaceStaffOrderItems(ctx context.Context, orderItemID string, staffItems []*domain.StaffOrderItemInput) ([]*domain.StaffOrderItemResponse, error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}
	orderItemID = strings.TrimSpace(orderItemID)
	if orderItemID == "" {
		return nil, apperror.New(400, "Thiếu id dòng đơn hàng", nil)
	}
	if len(staffItems) == 0 {
		return nil, apperror.New(400, "Danh sách nhân viên trống", nil)
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

	// Dòng đơn phải thuộc đúng salon (chống lẫn tenant).
	exists, err := u.repo.OrderItemExistsInOrg(ctx, orgID, orderItemID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi kiểm tra dòng đơn hàng", err)
	}
	if !exists {
		return nil, apperror.New(404, "Không tìm thấy dòng đơn hàng trong tổ chức", nil)
	}

	// NV phải thuộc đúng salon (bỏ NV đã xóa mềm).
	missing, err := u.staff.StaffsExistInOrg(ctx, orgID, staffIDs)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi kiểm tra nhân viên", err)
	}
	if len(missing) > 0 {
		return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy nhân viên trong tổ chức: %s", strings.Join(missing, ", ")), nil)
	}

	staffs := make([]*domain.StaffOrderItem, 0, len(staffItems))
	for _, item := range staffItems {
		id := strings.TrimSpace(item.StaffID)
		var commission float64
		if item.CommissionAmount != nil {
			commission = *item.CommissionAmount
		}
		staffs = append(staffs, &domain.StaffOrderItem{
			ID:               utils.NewID(),
			OrganizationID:   orgID,
			OrderItemID:      orderItemID,
			StaffID:          id,
			Type:             item.NormalizeType(),
			SharePct:         *item.SharePct,
			CommissionAmount: commission,
		})
	}

	if err := u.repo.ReplaceStaffOrderItems(ctx, orderItemID, staffs); err != nil {
		log.Println("Error replacing staff order items:", err)
		return nil, apperror.New(500, "Lỗi khi gán nhân viên cho dòng đơn hàng", err)
	}

	resp := make([]*domain.StaffOrderItemResponse, 0, len(staffs))
	for _, s := range staffs {
		resp = append(resp, &domain.StaffOrderItemResponse{
			ID: s.ID, OrganizationID: s.OrganizationID, OrderItemID: s.OrderItemID,
			StaffID: s.StaffID, Type: s.Type, SharePct: s.SharePct,
			CommissionAmount: s.CommissionAmount,
		})
	}
	return resp, nil
}

// ReplaceOrderMaterials gán lại toàn bộ vật tư tiêu hao cho các đơn có trong payload.
// Client chỉ gửi order_item_id, server tự suy đơn chứa nó nên 1 lần gọi
// xử lý được vật tư của nhiều đơn. Mảng rỗng = không làm gì.
// Chỉ ghi log tiêu hao, không động kho.
// unit_cost_at_time do UI gửi (đã quy đổi theo đơn vị xuất).
// baseUnitOf trả đơn vị nhỏ nhất của sản phẩm (delegate về productdomain
// để dùng chung logic hasNet, khỏi lệch với BaseFactor/LargeFactor).
func baseUnitOf(pu domain.ProductUnit) string {
	return productdomain.BaseUnit(pu.Unit, pu.NetUnit, pu.NetAmount)
}

func (u *OrderUsecase) ReplaceOrderMaterials(ctx context.Context, inputs []*domain.OrderMaterialInput) ([]*domain.OrderMaterialResponse, error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
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
	units, err := u.products.GetProductUnits(ctx, orgID, productIDs)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy đơn vị sản phẩm", err)
	}
	pricing, err := u.products.GetProductPricing(ctx, orgID, productIDs)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy giá sản phẩm", err)
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

	if len(productIDs) > 0 {
		missing, err := u.catalog.ProductsExistInOrg(ctx, orgID, productIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi kiểm tra sản phẩm", err)
		}
		if len(missing) > 0 {
			return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", strings.Join(missing, ", ")), nil)
		}
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
		resp = append(resp, &domain.OrderMaterialResponse{
			ID: m.ID, OrderItemID: m.OrderItemID, ProductID: m.ProductID,
			Quantity: m.Quantity, UnitCostAtTime: m.UnitCostAtTime,
			Unit: m.Unit,
		})
	}
	return resp, nil
}

// ---------- 6. Danh mục bán hàng POS ----------

// GetPosItemsByOrgID lấy danh mục bán hàng POS (union sản phẩm + dịch vụ).
// Limit clamp 1..100, còn lại (search/category/cursor) repo tự xử.
func (u *OrderUsecase) GetPosItemsByOrgID(ctx context.Context, limit int, name, itemType string, id string, search string, categoryFilter string) ([]*domain.PosItemResponse, error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
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
		return nil, apperror.New(500, "Lỗi khi lấy danh sách sản phẩm/dịch vụ", err)
	}

	return items, nil
}
