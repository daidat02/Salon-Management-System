package product

import (
	"context"

	domain "github.com/daidat02/server/internal/domain/product"
	"github.com/stretchr/testify/mock"
)

// MockProductRepository giả lập lại interface của ProductRepository
type MockProductRepository struct {
	mock.Mock
}

func (m *MockProductRepository) CreateProduct(ctx context.Context, product *domain.Product) error {
	args := m.Called(ctx, product)
	return args.Error(0)
}

func (m *MockProductRepository) GetProductByID(ctx context.Context, orgID, id string) (*domain.Product, error) {
	args := m.Called(ctx, orgID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Product), args.Error(1)
}

func (m *MockProductRepository) GetProductSalesLastMonths(ctx context.Context, orgID, productID string, months int) ([]domain.ProductMonthlySales, error) {
	args := m.Called(ctx, orgID, productID, months)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]domain.ProductMonthlySales), args.Error(1)
}

func (m *MockProductRepository) GetProductsByOrgID(ctx context.Context, orgID string, search string, status string, categoryID string, sort string, limit, offset int) ([]*domain.Product, error) {
	args := m.Called(ctx, orgID, search, status, categoryID, sort, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Product), args.Error(1)
}

func (m *MockProductRepository) CountProductsByOrgID(ctx context.Context, orgID string, search string, status string, categoryID string) (int64, error) {
	args := m.Called(ctx, orgID, search, status, categoryID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockProductRepository) UpdateProduct(ctx context.Context, product *domain.Product) error {
	args := m.Called(ctx, product)
	return args.Error(0)
}

func (m *MockProductRepository) DeleteProduct(ctx context.Context, orgID, id string) error {
	args := m.Called(ctx, orgID, id)
	return args.Error(0)
}

func (m *MockProductRepository) GetProductStats(ctx context.Context, orgID string) (*domain.ProductStatsResponse, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ProductStatsResponse), args.Error(1)
}
