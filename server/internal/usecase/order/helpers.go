package order

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	domain "github.com/daidat02/server/internal/domain/order"
	productdomain "github.com/daidat02/server/internal/domain/product"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/utils"
)

// ---------- Guard dùng chung ----------

// requireOrgID lấy organization_id từ context, thiếu thì 400.
func requireOrgID(ctx context.Context) (string, error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return "", apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}
	return orgID, nil
}

// requireID trim id, rỗng thì 400 với message của caller.
func requireID(id, msg string) (string, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return "", apperror.New(400, msg, nil)
	}
	return id, nil
}

// requireOrderStatus đảm bảo đơn đang ở một trong các trạng thái cho phép.
func requireOrderStatus(order *domain.Order, allowed []string, denyMsg string) error {
	for _, s := range allowed {
		if order.Status == s {
			return nil
		}
	}
	return apperror.New(400, denyMsg, nil)
}

// ---------- Loader dùng chung ----------

// loadOrder lấy đơn theo id, map ErrOrderNotFound sang 404.
func (u *OrderUsecase) loadOrder(ctx context.Context, orgID, id string) (*domain.Order, error) {
	order, err := u.repo.GetOrderByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return nil, apperror.New(404, "Không tìm thấy đơn hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy đơn hàng", err)
	}
	return order, nil
}

// loadItemsAndMaterials lấy dòng hàng + vật tư của đơn trong 1 chỗ
// (sau này bọc errgroup để chạy song song mà không sửa callsite).
func (u *OrderUsecase) loadItemsAndMaterials(ctx context.Context, orgID, orderID string) ([]*domain.OrderItem, []*domain.OrderItemMaterial, error) {
	items, err := u.repo.GetOrderItems(ctx, orgID, orderID)
	if err != nil {
		return nil, nil, apperror.New(500, "Lỗi khi lấy dòng đơn hàng", err)
	}
	materials, err := u.repo.GetOrderMaterials(ctx, orderID)
	if err != nil {
		return nil, nil, apperror.New(500, "Lỗi khi lấy vật tư đơn hàng", err)
	}
	return items, materials, nil
}

// ---------- Catalog / pricing dùng chung ----------

// fetchPricingUnits lấy giá + đơn vị các SP, thiếu SP nào thì 404.
// productIDs rỗng thì không gọi store.
func (u *OrderUsecase) fetchPricingUnits(ctx context.Context, orgID string, productIDs []string) (map[string]domain.ProductPricing, map[string]domain.ProductUnit, error) {
	if len(productIDs) == 0 {
		return map[string]domain.ProductPricing{}, map[string]domain.ProductUnit{}, nil
	}
	pricing, err := u.products.GetProductPricing(ctx, orgID, productIDs)
	if err != nil {
		return nil, nil, apperror.New(500, "Lỗi khi lấy giá sản phẩm", err)
	}
	units, err := u.products.GetProductUnits(ctx, orgID, productIDs)
	if err != nil {
		return nil, nil, apperror.New(500, "Lỗi khi lấy đơn vị sản phẩm", err)
	}
	for _, id := range productIDs {
		if _, ok := pricing[id]; !ok {
			return nil, nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", id), nil)
		}
		if _, ok := units[id]; !ok {
			return nil, nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", id), nil)
		}
	}
	return pricing, units, nil
}

// ensureRecipeUnits nạp đơn vị các SP vật tư chưa có trong units.
// Định mức có thể lưu đơn vị lớn hoặc nhỏ (cột service_materials.unit)
// nên cần đủ đơn vị để snapshot quy về đơn vị nhỏ nhất.
func (u *OrderUsecase) ensureRecipeUnits(ctx context.Context, orgID string, materialMap map[string][]domain.ServiceMaterialUsage, units map[string]domain.ProductUnit) error {
	var recipePIDs []string
	seen := map[string]struct{}{}
	for _, usages := range materialMap {
		for _, mu := range usages {
			if _, ok := units[mu.ProductID]; ok {
				continue
			}
			if _, ok := seen[mu.ProductID]; !ok {
				seen[mu.ProductID] = struct{}{}
				recipePIDs = append(recipePIDs, mu.ProductID)
			}
		}
	}
	if len(recipePIDs) == 0 {
		return nil
	}
	recipeUnits, err := u.products.GetProductUnits(ctx, orgID, recipePIDs)
	if err != nil {
		return apperror.New(500, "Lỗi khi lấy đơn vị vật tư", err)
	}
	for id, pu := range recipeUnits {
		units[id] = pu
	}
	for _, id := range recipePIDs {
		if _, ok := units[id]; !ok {
			return apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", id), nil)
		}
	}
	return nil
}

// ensureServicesInOrg đảm bảo mọi service thuộc đúng salon.
func (u *OrderUsecase) ensureServicesInOrg(ctx context.Context, orgID string, serviceIDs []string) error {
	if len(serviceIDs) == 0 {
		return nil
	}
	missing, err := u.catalog.ServicesExistInOrg(ctx, orgID, serviceIDs)
	if err != nil {
		return apperror.New(500, "Lỗi khi kiểm tra dịch vụ", err)
	}
	if len(missing) > 0 {
		return apperror.New(404, fmt.Sprintf("Không tìm thấy dịch vụ trong tổ chức: %s", strings.Join(missing, ", ")), nil)
	}
	return nil
}

// ensureProductsInOrg đảm bảo mọi sản phẩm thuộc đúng salon.
func (u *OrderUsecase) ensureProductsInOrg(ctx context.Context, orgID string, productIDs []string) error {
	if len(productIDs) == 0 {
		return nil
	}
	missing, err := u.catalog.ProductsExistInOrg(ctx, orgID, productIDs)
	if err != nil {
		return apperror.New(500, "Lỗi khi kiểm tra sản phẩm", err)
	}
	if len(missing) > 0 {
		return apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", strings.Join(missing, ", ")), nil)
	}
	return nil
}

// ensureStaffsInOrg đảm bảo mọi NV thuộc đúng salon (bỏ NV đã xóa mềm).
func (u *OrderUsecase) ensureStaffsInOrg(ctx context.Context, orgID string, staffIDs []string) error {
	if len(staffIDs) == 0 {
		return nil
	}
	missing, err := u.staff.StaffsExistInOrg(ctx, orgID, staffIDs)
	if err != nil {
		return apperror.New(500, "Lỗi khi kiểm tra nhân viên", err)
	}
	if len(missing) > 0 {
		return apperror.New(404, fmt.Sprintf("Không tìm thấy nhân viên trong tổ chức: %s", strings.Join(missing, ", ")), nil)
	}
	return nil
}

// ensureCustomerInOrg đảm bảo khách hàng thuộc đúng salon.
func (u *OrderUsecase) ensureCustomerInOrg(ctx context.Context, orgID, customerID string) error {
	exists, err := u.customers.CustomerExistsInOrg(ctx, orgID, customerID)
	if err != nil {
		return apperror.New(500, "Lỗi khi kiểm tra khách hàng", err)
	}
	if !exists {
		return apperror.New(404, "Không tìm thấy khách hàng trong tổ chức", nil)
	}
	return nil
}

// ---------- Phiếu bán hàng ----------

// saleSlipLines dựng dòng phiếu bán hàng từ snapshot đã lưu (đơn vị nhỏ nhất):
// SP lấy số lượng đã lưu + giá vốn base (giá vốn store theo đơn vị lớn nên
// chia cho hệ số — cùng cách tính với nhánh giá của ToBase);
// vật tư lấy số lượng + giá vốn đã snapshot.
func saleSlipLines(items []*domain.OrderItem, materials []*domain.OrderItemMaterial, pricing map[string]domain.ProductPricing, units map[string]domain.ProductUnit) ([]domain.SaleSlipLine, error) {
	lines := make([]domain.SaleSlipLine, 0, len(items)+len(materials))
	for _, it := range items {
		if it.ItemType != domain.ItemTypeProduct || it.ProductID == nil {
			continue
		}
		pu, ok := units[*it.ProductID]
		if !ok {
			return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", *it.ProductID), nil)
		}
		cost, ok := pricing[*it.ProductID]
		if !ok {
			return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", *it.ProductID), nil)
		}
		large := productdomain.LargeFactor(pu.Unit, pu.NetUnit, pu.NetAmount)
		if large <= 0 {
			large = 1
		}
		lines = append(lines, domain.SaleSlipLine{
			ProductID: *it.ProductID,
			Quantity:  it.Quantity,
			UnitPrice: cost.CostPrice / large,
		})
	}
	for _, m := range materials {
		lines = append(lines, domain.SaleSlipLine{
			ProductID: m.ProductID,
			Quantity:  m.Quantity,
			UnitPrice: m.UnitCostAtTime,
		})
	}
	return lines, nil
}

// ---------- Dựng dòng đơn ----------

// splitItemIDs validate từng dòng hàng và gom service/product ID (dedup)
// để fetch catalog/pricing 1 lần. Không chạm DB.
func splitItemIDs(inputs []domain.OrderItemInput) (serviceIDs, productIDs []string, err error) {
	seenService := map[string]struct{}{}
	seenProduct := map[string]struct{}{}
	for i, in := range inputs {
		if in.Quantity <= 0 {
			return nil, nil, apperror.New(400, fmt.Sprintf("Số lượng ở dòng thứ %d phải lớn hơn 0", i+1), nil)
		}
		switch strings.TrimSpace(in.ItemType) {
		case domain.ItemTypeService:
			if in.ServiceID == nil || strings.TrimSpace(*in.ServiceID) == "" {
				return nil, nil, apperror.New(400, fmt.Sprintf("Dòng thứ %d thiếu service_id", i+1), nil)
			}
			if _, ok := seenService[strings.TrimSpace(*in.ServiceID)]; !ok {
				seenService[strings.TrimSpace(*in.ServiceID)] = struct{}{}
				serviceIDs = append(serviceIDs, strings.TrimSpace(*in.ServiceID))
			}
		case domain.ItemTypeProduct:
			if in.ProductID == nil || strings.TrimSpace(*in.ProductID) == "" {
				return nil, nil, apperror.New(400, fmt.Sprintf("Dòng thứ %d thiếu product_id", i+1), nil)
			}
			if _, ok := seenProduct[strings.TrimSpace(*in.ProductID)]; !ok {
				seenProduct[strings.TrimSpace(*in.ProductID)] = struct{}{}
				productIDs = append(productIDs, strings.TrimSpace(*in.ProductID))
			}
		default:
			return nil, nil, apperror.New(400, fmt.Sprintf("Loại dòng thứ %d không hợp lệ (service | product)", i+1), nil)
		}
	}
	return serviceIDs, productIDs, nil
}

// buildOrderLines dựng dòng đơn + snapshot vật tư + giữ chỗ kho + tổng tiền.
// Không chạm DB, chỉ tính toán thuần túy nên dễ unit-test trực tiếp.
func buildOrderLines(orgID, orderID string, inputs []domain.OrderItemInput, pricing map[string]domain.ProductPricing, units map[string]domain.ProductUnit, materialMap map[string][]domain.ServiceMaterialUsage, servicePrices map[string]float64) (items []*domain.OrderItem, materials []*domain.OrderItemMaterial, deductions map[string]float64, subtotal float64, err error) {
	deductions = map[string]float64{}
	for _, in := range inputs {
		itemType := strings.TrimSpace(in.ItemType)
		var unitPrice float64
		var unit *string
		quantity := in.Quantity
		if itemType == domain.ItemTypeProduct {
			pu := units[*in.ProductID]
			price,ok := pricing[*in.ProductID]
			if !ok {
				return nil, nil, nil, 0, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", *in.ProductID), nil)
			}
			unitPrice = price.SellPrice
			unit = &pu.Unit
		} else {
			// Giá dịch vụ tại thời điểm bán do server quyết (đã batch ở ngoài),
			// thiếu giá nghĩa là dịch vụ sai org/hết hiệu lực.
			sid := strings.TrimSpace(*in.ServiceID)
			price, ok := servicePrices[sid]
			if !ok {
				return nil, nil, nil, 0, apperror.New(404, "Không tìm thấy dịch vụ trong tổ chức", nil)
			}
			unitPrice = price
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
			return nil, nil, nil, 0, apperror.New(400, err.Error(), err)
		}
		items = append(items, item)
		subtotal += item.LineTotal

		if itemType == domain.ItemTypeProduct {
			// Dòng SP đã lưu ở đơn vị nhỏ nhất nên giữ chỗ đúng bằng số đã lưu.
			deductions[*item.ProductID] += item.Quantity
		} else {
			// Snapshot vật tư: quy định mức về đơn vị nhỏ nhất (recipe có thể
			// lưu đơn vị lớn như tuýp/can hoặc nhỏ như ml/g) và giá vốn về
			// giá trên đơn vị nhỏ nhất để cặp (quantity, unit_cost) đồng nhất.
			for idx, mu := range materialMap[*item.ServiceID] {
				pu, ok := units[mu.ProductID]
				if !ok {
					return nil, nil, nil, 0, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", mu.ProductID), nil)
				}
				recipeUnit := strings.TrimSpace(mu.Unit)
				if recipeUnit == "" {
					recipeUnit = pu.Unit
				}
				factor, ferr := productdomain.BaseFactor(pu.Unit, recipeUnit, pu.NetUnit, pu.NetAmount)
				if ferr != nil {
					return nil, nil, nil, 0, apperror.New(400, fmt.Sprintf("Định mức vật tư thứ %d: %s", idx+1, ferr.Error()), ferr)
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
	return items, materials, deductions, subtotal, nil
}

// ---------- Mapping response ----------

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

// toItemResponse map entity OrderItem sang response.
func toItemResponse(it *domain.OrderItem) *domain.OrderItemResponse {
	return &domain.OrderItemResponse{
		ID: it.ID, ItemType: it.ItemType, ServiceID: it.ServiceID,
		ProductID: it.ProductID, StaffID: it.StaffID,
		Quantity: it.Quantity, UnitPrice: it.UnitPrice, LineTotal: it.LineTotal,
		Staff: it.Staff,
	}
}

// toMaterialResponse map entity OrderItemMaterial sang response.
func toMaterialResponse(m *domain.OrderItemMaterial) *domain.OrderMaterialResponse {
	return &domain.OrderMaterialResponse{
		ID: m.ID, OrderItemID: m.OrderItemID, ProductID: m.ProductID,
		Quantity: m.Quantity, UnitCostAtTime: m.UnitCostAtTime, Unit: m.Unit,
	}
}

// toStaffResponse map entity StaffOrderItem sang response.
func toStaffResponse(s *domain.StaffOrderItem) *domain.StaffOrderItemResponse {
	return &domain.StaffOrderItemResponse{
		ID: s.ID, OrganizationID: s.OrganizationID, OrderItemID: s.OrderItemID,
		StaffID: s.StaffID, Type: s.Type, SharePct: s.SharePct,
		CommissionAmount: s.CommissionAmount,
	}
}

// baseUnitOf trả đơn vị nhỏ nhất của sản phẩm (delegate về productdomain
// để dùng chung logic hasNet, khỏi lệch với BaseFactor/LargeFactor).
func baseUnitOf(pu domain.ProductUnit) string {
	return productdomain.BaseUnit(pu.Unit, pu.NetUnit, pu.NetAmount)
}
