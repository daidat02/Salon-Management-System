package supplier

import (
	"context"

	domain "github.com/daidat02/server/internal/domain/supplier"
	"github.com/stretchr/testify/mock"
)

type MockSupplierRepository struct {
	mock.Mock
}

func (m *MockSupplierRepository) CreateSupplier(ctx context.Context, supplier *domain.Supplier) error {
	args := m.Called(ctx, supplier)
	return args.Error(0)
}

func (m *MockSupplierRepository) GetSuppliersByOrgID(ctx context.Context, orgID, search string, limit, offset int) ([]*domain.Supplier, error) {
	args := m.Called(ctx, orgID, search, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Supplier), args.Error(1)
}

func (m *MockSupplierRepository) CountSuppliersByOrgID(ctx context.Context, orgID, search string) (int64, error) {
	args := m.Called(ctx, orgID, search)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockSupplierRepository) ExistsInOrg(ctx context.Context, orgID, id string) (bool, error) {
	args := m.Called(ctx, orgID, id)
	return args.Bool(0), args.Error(1)
}
