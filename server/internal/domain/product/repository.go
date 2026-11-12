package product

import (
	"context"
	"errors"
)

// ErrProductNotFound dùng để usecase map đúng 404 khi UPDATE/DELETE không chạm dòng nào
// (sai id hoặc khác organization).
var ErrProductNotFound = errors.New("product not found")

type ProductRepository interface {
	CreateProduct(ctx context.Context, product *Product) error
	GetProductByID(ctx context.Context, orgID, id string) (*Product, error)
	GetProductSalesLastMonths(ctx context.Context, orgID, productID string, months int) ([]ProductMonthlySales, error)
	GetProductsByOrgID(ctx context.Context, orgID string, search string, status string, categoryID string, sort string, limit, offset int) ([]*Product, error)
	GetMaterialProductsByOrgID(ctx context.Context, orgID string) ([]*Product, error)
	CountProductsByOrgID(ctx context.Context, orgID string, search string, status string, categoryID string) (int64, error)
	UpdateProduct(ctx context.Context, product *Product) error
	DeleteProduct(ctx context.Context, orgID, id string) error
	GetProductStats(ctx context.Context, orgID string) (*ProductStatsResponse, error)
}
