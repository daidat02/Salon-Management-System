package inventory

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	domain "github.com/daidat02/server/internal/domain/inventory"
	orderdomain "github.com/daidat02/server/internal/domain/order"
	productdomain "github.com/daidat02/server/internal/domain/product"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/pagination"
	"github.com/daidat02/server/pkg/utils"
)

type InventoryUsecase struct {
	repo     domain.InventoryRepository
	products orderdomain.ProductStore
}

func NewInventoryUsecase(repo domain.InventoryRepository, products orderdomain.ProductStore) *InventoryUsecase {
	return &InventoryUsecase{
		repo:     repo,
		products: products,
	}
}

func (u *InventoryUsecase) CreateDocument(ctx context.Context, req *domain.CreateDocumentRequest) (*domain.DocumentResponse, error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}
	if req == nil {
		return nil, apperror.New(400, "Thiếu thông tin phiếu kho", nil)
	}
	if len(req.Items) == 0 {
		return nil, apperror.New(400, "Phiếu kho phải có ít nhất 1 sản phẩm", nil)
	}
	
	doc := &domain.InventoryDocument{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		SupplierID:     req.SupplierID,
		OrderID:        req.OrderID,
		DocumentCode:   strings.TrimSpace(req.DocumentCode),
		Type:           strings.TrimSpace(req.Type),
		Reason:         req.Reason,
		Note:           req.Note,
		CreatedBy:      req.CreatedBy,
	}

	// Client chỉ gửi (product_id, quantity theo đơn vị hiển thị, unit).
	// Server tự quy về đơn vị nhỏ nhất + tự quyết giá, không tin số client.
	items, err := u.toBaseItems(ctx, orgID, doc.Type, req.Items)
	if err != nil {
		return nil, err
	}

	if err := u.repo.CreateDocument(ctx, doc, items); err != nil {
		log.Println("Error creating inventory document:", err)
		if errors.Is(err, domain.ErrInsufficientStock) {
			return nil, apperror.New(400, "Tồn kho không đủ cho phiếu này", err)
		}
		return nil, apperror.New(500, "Lỗi khi tạo phiếu kho", err)
	}

	return &domain.DocumentResponse{
		ID:             doc.ID,
		OrganizationID: doc.OrganizationID,
		SupplierID:     doc.SupplierID,
		OrderID:        doc.OrderID,
		DocumentCode:   doc.DocumentCode,
		Type:           doc.Type,
		TotalAmount:    doc.TotalAmount,
		Note:           doc.Note,
		CreatedAt:      doc.CreatedAt,
	}, nil
}

// toBaseItems quy từng dòng phiếu về đơn vị nhỏ nhất + giá chuẩn server.
//   - quantity: số hiển thị × hệ số unit (unit lạ -> 400).
//   - giá: phiếu nhập (import) tôn trọng giá user theo unit gửi (quy về base);
//     xuất/bán/trả/điều chỉnh (export/sale/return/adjust) lấy giá vốn server,
//     bỏ qua số client gửi.
// Unit gửi được giữ lại để lưu lịch sử hiển thị.
func (u *InventoryUsecase) toBaseItems(ctx context.Context, orgID, docType string, inputs []domain.DocumentItemInput) ([]*domain.DocumentItemInput, error) {
	seen := map[string]struct{}{}
	var productIDs []string
	for i := range inputs {
		pid := strings.TrimSpace(inputs[i].ProductID)
		if pid == "" {
			return nil, apperror.New(400, fmt.Sprintf("Dòng thứ %d thiếu product_id", i+1), nil)
		}
		if _, ok := seen[pid]; !ok {
			seen[pid] = struct{}{}
			productIDs = append(productIDs, pid)
		}
	}
	if len(productIDs) == 0 {
		return nil, apperror.New(400, "Phiếu kho phải có ít nhất 1 sản phẩm", nil)
	}

	missing, err := u.products.ProductsExistInOrg(ctx, orgID, productIDs)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi kiểm tra sản phẩm", err)
	}
	if len(missing) > 0 {
		return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", strings.Join(missing, ", ")), nil)
	}
	units, err := u.products.GetProductUnits(ctx, orgID, productIDs)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy đơn vị sản phẩm", err)
	}
	pricing, err := u.products.GetProductPricing(ctx, orgID, productIDs)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy giá sản phẩm", err)
	}

	useClientPrice := docType == domain.TypeImport
	items := make([]*domain.DocumentItemInput, 0, len(inputs))
	for i := range inputs {
		pid := strings.TrimSpace(inputs[i].ProductID)
		pu, ok := units[pid]
		if !ok {
			return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", pid), nil)
		}
		unit := strings.TrimSpace(inputs[i].Unit)
		pricePerLarge := inputs[i].UnitPrice
		if !useClientPrice {
			cost, ok := pricing[pid]
			if !ok {
				return nil, apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", pid), nil)
			}
			pricePerLarge = cost.CostPrice
		}
		baseQty, basePrice, convErr := productdomain.ToBase(pu.Unit, unit, pu.NetUnit, pu.NetAmount, inputs[i].Quantity, pricePerLarge)
		if convErr != nil {
			return nil, apperror.New(400, fmt.Sprintf("Dòng thứ %d: %s", i+1, convErr.Error()), convErr)
		}
		items = append(items, &domain.DocumentItemInput{
			ProductID: pid,
			Unit:      unit,
			Quantity:  baseQty,
			UnitPrice: basePrice,
		})
	}
	return items, nil
}

func (u *InventoryUsecase) GetTransactionsByOrgID(ctx context.Context, productID string, page, pageSize int) (*pagination.Result[*domain.InventoryTransaction], error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}

	params := pagination.Normalize(page, pageSize)
	productID = strings.TrimSpace(productID)

	txs, err := u.repo.GetTransactionsByOrgID(ctx, orgID, productID, params.PageSize, params.Offset())
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy lịch sử kho", err)
	}

	total, err := u.repo.CountTransactionsByOrgID(ctx, orgID, productID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm lịch sử kho", err)
	}

	return pagination.NewResult(txs, params, total), nil
}

func (u *InventoryUsecase) GetDocumentsByOrgID(ctx context.Context, search string, sort string, filter string, page, pageSize int) (*pagination.Result[*domain.DocumentResponse], error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}
	params := pagination.Normalize(page, pageSize)
	inventoryDocs, err := u.repo.GetDocumentsByOrgID(ctx, orgID, search, sort, filter, params.PageSize, params.Offset())
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách phiếu kho", err)
	}

	total, err := u.repo.CountDocumentsByOrgID(ctx, orgID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm danh sách phiếu kho", err)
	}

	return pagination.NewResult(inventoryDocs, params, total), nil
}

func (u *InventoryUsecase) GetLowStockProducts(ctx context.Context, page, pageSize int) (*pagination.Result[*domain.LowStockItem], error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}

	params := pagination.Normalize(page, pageSize)

	items, err := u.repo.GetLowStockProducts(ctx, orgID, params.PageSize, params.Offset())
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách tồn thấp", err)
	}

	total, err := u.repo.CountLowStockProducts(ctx, orgID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm danh sách tồn thấp", err)
	}

	return pagination.NewResult(items, params, total), nil
}

func (u *InventoryUsecase) GetDocumentByID(ctx context.Context, documentID string) (*domain.DocumentDetailResponse, error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}
	
	document, err := u.repo.GetDocumentByID(ctx, orgID, documentID)
	if err != nil {
		if errors.Is(err, domain.ErrInventoryNotFound) {
			return nil, apperror.New(404, "Phiếu kho không tồn tại", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy chi tiết phiếu kho", err)
	}

	return document, nil
}

func (u *InventoryUsecase) GetTransactionsByProductID(ctx context.Context, productID string, page, pageSize int, sort, inventory_type, date string) (*pagination.Result[*domain.InventoryTransactionResponse], error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return nil, apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}
	
	params := pagination.Normalize(page, pageSize)
	productID = strings.TrimSpace(productID)

	txs, err := u.repo.GetInventoryTransactionsByProdID(ctx, orgID, productID, params.PageSize, params.Offset(),sort, inventory_type, date)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách lịch sử kho", err)
	}

	total, err := u.repo.CountInventoryTransactionsByProdID(ctx, orgID, productID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm lịch sử kho", err)
	}

	return pagination.NewResult(txs, params, total), nil
}