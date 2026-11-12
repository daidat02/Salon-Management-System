package order

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	domain "github.com/daidat02/server/internal/domain/order"
	productdomain "github.com/daidat02/server/internal/domain/product"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/utils"
)

// ---------- Guard đặc thù đơn hàng ----------

// requireOrderStatus đảm bảo đơn đang ở một trong các trạng thái cho phép.
func requireOrderStatus(order *domain.Order, allowed []string, denyMsg string) error {
	for _, s := range allowed {
		if order.Status == s {
			return nil
		}
	}
	return apperror.New(400, denyMsg, nil)
}

// withEditableOrder load đơn + chặn sửa khi đã khóa.
// Sửa items chỉ cho pending/confirm (chặt hơn chốt/hủy cho phép delivery,
// vì hàng đã ra khỏi kho thì không đổi dòng nữa).
func (u *OrderUsecase) withEditableOrder(ctx context.Context, orderID string) (order *domain.Order, orgID string, err error) {
	orderID, err = shared.RequireID(orderID, "Thiếu id đơn hàng")
	if err != nil {
		return nil, "", err
	}
	orgID, err = shared.RequireOrgID(ctx)
	if err != nil {
		return nil, "", err
	}
	order, err = u.loadOrder(ctx, orgID, orderID)
	if err != nil {
		return nil, "", err
	}
	if err := requireOrderStatus(order,
		[]string{domain.StatusPending, domain.StatusConfirm},
		"Chỉ sửa đơn ở trạng thái chờ/xác nhận"); err != nil {
		return nil, "", err
	}
	return order, orgID, nil
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

// loadOrderDescription gom tên dịch vụ/sản phẩm của các dòng đơn thành mô tả ngắn.
// Tên lấy tại thời điểm chốt đơn (kể cả mục đã xóa mềm); ID không tìm thấy thì bỏ qua.
// Gộp trùng theo tên đã trim, giữ lần xuất hiện đầu; dịch vụ luôn đứng trước sản phẩm.
func (u *OrderUsecase) loadOrderDescription(ctx context.Context, orgID string, items []*domain.OrderItem) (string, error) {
	serviceIDs := []string{}
	productIDs := []string{}
	seenServiceID := map[string]struct{}{}
	seenProductID := map[string]struct{}{}
	for _, it := range items {
		switch it.ItemType {
		case domain.ItemTypeService:
			if it.ServiceID == nil || *it.ServiceID == "" {
				continue
			}
			if _, ok := seenServiceID[*it.ServiceID]; ok {
				continue
			}
			seenServiceID[*it.ServiceID] = struct{}{}
			serviceIDs = append(serviceIDs, *it.ServiceID)
		case domain.ItemTypeProduct:
			if it.ProductID == nil || *it.ProductID == "" {
				continue
			}
			if _, ok := seenProductID[*it.ProductID]; ok {
				continue
			}
			seenProductID[*it.ProductID] = struct{}{}
			productIDs = append(productIDs, *it.ProductID)
		}
	}

	serviceNames := map[string]string{}
	productNames := map[string]string{}
	if len(serviceIDs) > 0 {
		names, err := u.services.GetServiceNames(ctx, orgID, serviceIDs)
		if err != nil {
			return "", apperror.New(500, "Lỗi khi lấy tên dịch vụ", err)
		}
		serviceNames = names
	}
	if len(productIDs) > 0 {
		names, err := u.products.GetProductNames(ctx, orgID, productIDs)
		if err != nil {
			return "", apperror.New(500, "Lỗi khi lấy tên sản phẩm", err)
		}
		productNames = names
	}

	services := collectItemNames(items, domain.ItemTypeService, serviceNames)
	products := collectItemNames(items, domain.ItemTypeProduct, productNames)

	parts := make([]string, 0, 2)
	if len(services) > 0 {
		parts = append(parts, "Dịch vụ: "+strings.Join(services, ", "))
	}
	if len(products) > 0 {
		parts = append(parts, "Sản phẩm: "+strings.Join(products, ", "))
	}
	return strings.Join(parts, "; "), nil
}

// collectItemNames lấy tên theo thứ tự dòng đơn, gộp trùng tên đã trim.
func collectItemNames(items []*domain.OrderItem, itemType string, names map[string]string) []string {
	out := make([]string, 0, len(names))
	seen := map[string]struct{}{}
	for _, it := range items {
		if it.ItemType != itemType {
			continue
		}
		var id string
		if itemType == domain.ItemTypeService {
			if it.ServiceID == nil {
				continue
			}
			id = *it.ServiceID
		} else {
			if it.ProductID == nil {
				continue
			}
			id = *it.ProductID
		}
		name := strings.TrimSpace(names[id])
		if name == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		out = append(out, name)
	}
	return out
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

// orderCatalog gom dữ liệu tra cứu tại thời điểm bán cho 1 tập dòng:
// giá + đơn vị SP, định mức + giá dịch vụ (batch, tránh N+1), kèm đơn vị
// SP vật tư để snapshot. Dùng chung cho tạo đơn và thêm dòng.
type orderCatalog struct {
	pricing       map[string]domain.ProductPricing
	units         map[string]domain.ProductUnit
	materialMap   map[string][]domain.ServiceMaterialUsage
	servicePrices map[string]float64
}

// fetchOrderCatalog check catalog + fetch giá/đơn vị/định mức trong 1 chỗ.
// Giá + đơn vị tại thời điểm bán do server quyết định, không tin client.
func (u *OrderUsecase) fetchOrderCatalog(ctx context.Context, orgID string, serviceIDs, productIDs []string) (*orderCatalog, error) {
	if err := u.ensureServicesInOrg(ctx, orgID, serviceIDs); err != nil {
		return nil, err
	}
	if err := u.ensureProductsInOrg(ctx, orgID, productIDs); err != nil {
		return nil, err
	}

	pricing, units, err := u.fetchPricingUnits(ctx, orgID, productIDs)
	if err != nil {
		return nil, err
	}
	cat := &orderCatalog{
		pricing: pricing, units: units,
		materialMap:   map[string][]domain.ServiceMaterialUsage{},
		servicePrices: map[string]float64{},
	}
	if len(serviceIDs) > 0 {
		materialMap, err := u.services.GetServiceMaterials(ctx, orgID, serviceIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi lấy định mức vật tư", err)
		}
		// Giá dịch vụ lấy 1 lần cho cả đơn (tránh N+1 query theo từng dòng).
		servicePrices, err := u.services.GetServicePrices(ctx, orgID, serviceIDs)
		if err != nil {
			return nil, apperror.New(500, "Lỗi khi lấy giá dịch vụ", err)
		}
		cat.materialMap, cat.servicePrices = materialMap, servicePrices
	}

	// Định mức có thể lưu đơn vị lớn hoặc nhỏ (cột service_materials.unit) nên
	// nạp thêm đơn vị các SP vật tư để quy về đơn vị nhỏ nhất lúc snapshot.
	if err := u.ensureRecipeUnits(ctx, orgID, cat.materialMap, cat.units); err != nil {
		return nil, err
	}
	return cat, nil
}

// fetchUnits lấy đơn vị các SP (nhẹ hơn fetchPricingUnits khi chỉ cần
// quy đổi số lượng mà không cần giá, vd lúc hoàn/nhả kho).
func (u *OrderUsecase) fetchUnits(ctx context.Context, orgID string, productIDs []string) (map[string]domain.ProductUnit, error) {
	if len(productIDs) == 0 {
		return map[string]domain.ProductUnit{}, nil
	}
	units, err := u.products.GetProductUnits(ctx, orgID, productIDs)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy đơn vị sản phẩm", err)
	}
	for _, id := range productIDs {
		if _, ok := units[id]; !ok {
			return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", id), nil)
		}
	}
	return units, nil
}

// ---------- Phiếu bán hàng ----------

// saleSlipLines dựng dòng phiếu bán hàng, quy về đơn vị nhỏ nhất:
// dòng SP lưu theo đơn vị lớn nên quy SL + giá vốn về base tại lúc chốt;
// vật tư đã snapshot base thì lấy thẳng số đã lưu.
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
		baseQty, baseCost, convErr := productdomain.ToBase(pu.Unit, pu.Unit, pu.NetUnit, pu.NetAmount, it.Quantity, cost.CostPrice)
		if convErr != nil {
			return nil, apperror.New(400, fmt.Sprintf("Lỗi khi chuyển đổi đơn vị sản phẩm: %s", convErr.Error()), convErr)
		}
		lines = append(lines, domain.SaleSlipLine{
			ProductID: *it.ProductID,
			Quantity:  baseQty,
			UnitPrice: baseCost,
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

// restoreQuantities quy đổi dòng SP (lưu theo đơn vị lớn) + vật tư (base)
// về đơn vị nhỏ nhất để hoàn/nhả kho cho khớp số đã giữ/trừ.
func restoreQuantities(items []*domain.OrderItem, materials []*domain.OrderItemMaterial, units map[string]domain.ProductUnit) (map[string]float64, error) {
	restores := map[string]float64{}
	for _, it := range items {
		if it.ItemType != domain.ItemTypeProduct || it.ProductID == nil {
			continue
		}
		pu, ok := units[*it.ProductID]
		if !ok {
			return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", *it.ProductID), nil)
		}
		factor, ferr := productdomain.BaseFactor(pu.Unit, pu.Unit, pu.NetUnit, pu.NetAmount)
		if ferr != nil {
			return nil, apperror.New(400, fmt.Sprintf("Lỗi khi chuyển đổi đơn vị sản phẩm: %s", ferr.Error()), ferr)
		}
		restores[*it.ProductID] += it.Quantity * factor
	}
	for _, m := range materials {
		restores[m.ProductID] += m.Quantity
	}
	return restores, nil
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
// Dòng SP lưu theo đơn vị lớn (đúng hợp đồng OrderItem.Unit); giữ chỗ kho
// và snapshot vật tư tính bằng đơn vị nhỏ nhất. Giá SP/dịch vụ tại thời
// điểm bán do server quyết, không tin client.
// Không chạm DB, chỉ tính toán thuần túy trực tiếp.
func buildOrderLines(orgID, orderID string, inputs []domain.OrderItemInput, pricing map[string]domain.ProductPricing, units map[string]domain.ProductUnit, materialMap map[string][]domain.ServiceMaterialUsage, servicePrices map[string]float64) (items []*domain.OrderItem, materials []*domain.OrderItemMaterial, deductions map[string]float64, subtotal float64, err error) {
	deductions = map[string]float64{}
	for _, in := range inputs {
		itemType := strings.TrimSpace(in.ItemType)
		var unitPrice float64
		var unit *string
		quantity := in.Quantity
		if itemType == domain.ItemTypeProduct {
			// Client gửi base (ml/g) thì quy về lớn: SL_lớn = SL_gửi × factor / large.
			// Đơn vị lạ (không phải unit/net_unit) thì 400.
			pid := strings.TrimSpace(*in.ProductID)
			pu, ok := units[pid]
			if !ok {
				return nil, nil, nil, 0, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", pid), nil)
			}
			sell, ok := pricing[pid]
			if !ok {
				return nil, nil, nil, 0, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", pid), nil)
			}
			fromUnit := ""
			if in.Unit != nil {
				fromUnit = strings.TrimSpace(*in.Unit)
			}
			factor, ferr := productdomain.BaseFactor(pu.Unit, fromUnit, pu.NetUnit, pu.NetAmount)
			if ferr != nil {
				return nil, nil, nil, 0, apperror.New(400, fmt.Sprintf("Lỗi khi chuyển đổi đơn vị sản phẩm: %s", ferr.Error()), ferr)
			}
			large := productdomain.LargeFactor(pu.Unit, pu.NetUnit, pu.NetAmount)
			if large <= 0 {
				large = 1
			}
			quantity, unitPrice = in.Quantity*factor/large, sell.SellPrice
			lu := strings.TrimSpace(pu.Unit)
			unit = &lu
			// Giữ chỗ kho tính bằng đơn vị nhỏ nhất (quy đổi riêng,
			// không phụ thuộc số đã lưu trên dòng đơn).
			deductions[pid] += in.Quantity * factor
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

		if itemType != domain.ItemTypeProduct {
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

// ---------- Hoa hồng ----------

// computeCommission tính hoa hồng 1 NV, làm tròn nguyên đồng, kẹp âm về 0.
//   - percent: line_total × share (không cần revenue/cost).
//   - profit: line_total × margin × share, với margin = (revenue-cost)/revenue
//     (dòng service: margin cả đơn; dòng SP: margin của chính dòng).
//   - fixed: số client gửi (bản chất nhập tay, server chỉ kiểm không âm).
func computeCommission(typ string, share, lineTotal, revenue, cost, fixedAmount float64) float64 {
	var amount float64
	switch typ {
	case domain.StaffTypeProfit:
		margin := 0.0
		if revenue > 0 {
			margin = (revenue - cost) / revenue
		}
		amount = lineTotal * margin * share / 100
	case domain.StaffTypeFixed:
		amount = fixedAmount
	default:
		amount = lineTotal * share / 100
	}
	amount = math.Round(amount)
	if amount < 0 {
		amount = 0
	}
	return amount
}

// buildCommissions gom hoa hồng đã lưu theo từng dòng (server join sẵn,
// không query thêm) để trả trong chi tiết đơn.
func buildCommissions(items []*domain.OrderItem) []*domain.StaffCommission {
	commissions := []*domain.StaffCommission{}
	for _, it := range items {
		for _, s := range it.Staff {
			if s.StaffID == nil || strings.TrimSpace(*s.StaffID) == "" {
				continue
			}
			name := ""
			if s.FullName != nil {
				name = *s.FullName
			}
			commissions = append(commissions, &domain.StaffCommission{
				StaffID: *s.StaffID, FullName: name, Type: s.Type,
				SharePct: s.SharePct, Amount: s.CommissionAmount,
				OrderItemID: it.ID,
			})
		}
	}
	return commissions
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
		Description:    o.Description,
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
		Quantity: it.Quantity, Unit: it.Unit, UnitPrice: it.UnitPrice, LineTotal: it.LineTotal,
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
