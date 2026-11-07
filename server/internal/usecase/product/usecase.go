package product

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	domain "github.com/daidat02/server/internal/domain/product"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/pagination"
	"github.com/daidat02/server/pkg/utils"
	"github.com/google/uuid"
)

type ProductUsecase struct {
	repo domain.ProductRepository
}

func NewProductUsecase(repo domain.ProductRepository) *ProductUsecase {
	return &ProductUsecase{
		repo: repo,
	}
}

func toResponse(p *domain.Product) *domain.ProductResponse {
	return &domain.ProductResponse{
		ID:               p.ID,
		OrganizationID:   p.OrganizationID,
		CategoryID:       p.CategoryID,
		CategoryName:     p.CategoryName,
		SKU:              p.SKU,
		Name:             p.Name,
		Unit:             p.Unit,
		NetUnit:          p.NetUnit,
		NetAmount:        p.NetAmount,
		ProductType:      p.ProductType,
		ShowOnWeb:        p.ShowOnWeb,
		CostPrice:        p.CostPrice,
		SellPrice:        p.SellPrice,
		StockQuantity:    p.StockQuantity,
		MinStock:         p.MinStock,
		IsActive:         p.IsActive,
		RevenueThisMonth: p.RevenueThisMonth,
		CreatedAt:        p.CreatedAt,
		UpdatedAt:        p.UpdatedAt,
	}
}

// normalizeDefaults gán giá trị mặc định theo schema khi client không gửi.
func normalizeDefaults(p *domain.Product) {
	if p.ProductType == "" {
		p.ProductType = domain.ProductTypeRetail
	}
}

func (u *ProductUsecase) CreateProduct(ctx context.Context, product *domain.Product) (*domain.ProductResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	normalizeDefaults(product)
	if err := product.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}
	product.ID = utils.NewID()
	product.OrganizationID = orgID

	if product.NetAmount != nil && *product.NetAmount > 0 {
		product.StockQuantity = product.StockQuantity * *product.NetAmount
		product.MinStock = product.MinStock * *product.NetAmount
	}
	if err := u.repo.CreateProduct(ctx, product); err != nil {
		log.Println("Error creating product:", err)
		return nil, apperror.New(500, "Lỗi khi tạo sản phẩm", err)
	}

	return toResponse(product), nil
}

const productRevenueMonths = 6

// convertStockToUnit đổi tồn kho/tồn tối thiểu từ đơn vị cơ sở (ml, g...)
// về đơn vị bán (unit) để API chi tiết trả về khớp với UI.
func convertStockToUnit(product *domain.Product) {
	if product.NetAmount == nil || *product.NetAmount <= 0 {
		return
	}
	product.StockQuantity = product.StockQuantity / *product.NetAmount
	product.MinStock = product.MinStock / *product.NetAmount
}

// buildRevenueLastMonths điền đủ các tháng còn thiếu (doanh thu 0) và trả về
// doanh số/doanh thu của tháng hiện tại.
func buildRevenueLastMonths(sales []domain.ProductMonthlySales, months int) ([]domain.ProductMonthlyRevenueResponse, float64, float64) {
	byMonth := make(map[string]domain.ProductMonthlySales, len(sales))
	for _, s := range sales {
		byMonth[s.MonthStart.UTC().Format("2006-01")] = s
	}

	now := time.Now().UTC()
	currentMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	result := make([]domain.ProductMonthlyRevenueResponse, 0, months)
	var soldThisMonth, revenueThisMonth float64

	for i := months - 1; i >= 0; i-- {
		month := currentMonth.AddDate(0, -i, 0)
		sale := byMonth[month.Format("2006-01")]
		result = append(result, domain.ProductMonthlyRevenueResponse{
			Month:   fmt.Sprintf("T%d", int(month.Month())),
			Revenue: sale.Revenue,
		})
		if i == 0 {
			soldThisMonth = sale.Quantity
			revenueThisMonth = sale.Revenue
		}
	}

	return result, soldThisMonth, revenueThisMonth
}

func (u *ProductUsecase) GetProductByID(ctx context.Context, id string) (*domain.ProductDetailResponse, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id sản phẩm", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	product, err := u.repo.GetProductByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrProductNotFound) {
			return nil, apperror.New(404, "Không tìm thấy sản phẩm", err)
		}
		log.Println("Error getting product detail:", err)
		return nil, apperror.New(500, "Lỗi khi lấy chi tiết sản phẩm", err)
	}

	sales, err := u.repo.GetProductSalesLastMonths(ctx, orgID, id, productRevenueMonths)
	if err != nil {
		log.Println("Error getting product sales:", err)
		return nil, apperror.New(500, "Lỗi khi lấy doanh số sản phẩm", err)
	}

	convertStockToUnit(product)

	detail := &domain.ProductDetailResponse{
		ProductResponse: *toResponse(product),
	}
	detail.RevenueLast6Months, detail.SoldThisMonth, detail.RevenueThisMonth = buildRevenueLastMonths(sales, productRevenueMonths)
	return detail, nil
}

func (u *ProductUsecase) GetProductsByOrgID(ctx context.Context, search string, status string, categoryID string, sort string, page, pageSize int) (*pagination.Result[*domain.ProductResponse], error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	categoryID = strings.TrimSpace(categoryID)
	if categoryID != "" {
		if _, err := uuid.Parse(categoryID); err != nil {
			return nil, apperror.New(400, "category_id không hợp lệ", err)
		}
	}

	params := pagination.Normalize(page, pageSize)

	products, err := u.repo.GetProductsByOrgID(ctx, orgID, search, status, categoryID, sort, params.PageSize, params.Offset())
	if err != nil {
		log.Println("Error getting products by org ID:", err)
		return nil, apperror.New(500, "Lỗi khi lấy danh sách sản phẩm", err)
	}

	productsResponse := []*domain.ProductResponse{}

	for _, product := range products {
		productsResponse = append(productsResponse, toResponse(product))
	}

	total, err := u.repo.CountProductsByOrgID(ctx, orgID, search, status, categoryID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm danh sách sản phẩm", err)
	}
	return pagination.NewResult(productsResponse, params, total), nil
}

func (u *ProductUsecase) UpdateProduct(ctx context.Context, id string, product *domain.Product) (*domain.ProductResponse, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id sản phẩm", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	normalizeDefaults(product)
	if err := product.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}
	product.ID = id
	product.OrganizationID = orgID

	// UI nhập tồn kho theo đơn vị lớn (chai/hũ...), lưu DB ở đơn vị nhỏ nhất
	// — đồng bộ với CreateProduct.
	if product.NetAmount != nil && *product.NetAmount > 0 {
		product.StockQuantity = product.StockQuantity * *product.NetAmount
		product.MinStock = product.MinStock * *product.NetAmount
	}

	if err := u.repo.UpdateProduct(ctx, product); err != nil {
		log.Println("Error updating product:", err)
		if errors.Is(err, domain.ErrProductNotFound) {
			return nil, apperror.New(404, "Không tìm thấy sản phẩm", err)
		}
		return nil, apperror.New(500, "Lỗi khi cập nhật sản phẩm", err)
	}

	return toResponse(product), nil
}

func (u *ProductUsecase) DeleteProduct(ctx context.Context, id string) (string, error) {
	if strings.TrimSpace(id) == "" {
		return "", apperror.New(400, "Thiếu id sản phẩm", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return "", err
	}

	if err := u.repo.DeleteProduct(ctx, orgID, id); err != nil {
		log.Println("Error deleting product:", err)
		if errors.Is(err, domain.ErrProductNotFound) {
			return "", apperror.New(404, "Không tìm thấy sản phẩm", err)
		}
		return "", apperror.New(500, "Lỗi khi xóa sản phẩm", err)
	}

	return id, nil
}

// GetProductStats thống kê tổng quan sản phẩm/kho của salon.
func (u *ProductUsecase) GetProductStats(ctx context.Context) (*domain.ProductStatsResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	stats, err := u.repo.GetProductStats(ctx, orgID)
	if err != nil {
		log.Println("Error getting product stats:", err)
		return nil, apperror.New(500, "Lỗi khi lấy thống kê sản phẩm", err)
	}

	return stats, nil
}
