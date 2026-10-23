package cashflow

import (
	"context"

	domain "github.com/daidat02/server/internal/domain/cashflow"
	"github.com/stretchr/testify/mock"
)

// MockCashFlowRepository giả lập lại interface CashFlowRepository.
type MockCashFlowRepository struct {
	mock.Mock
}

func (m *MockCashFlowRepository) CreateCashFlow(ctx context.Context, voucher *domain.CashFlow) error {
	args := m.Called(ctx, voucher)
	return args.Error(0)
}

func (m *MockCashFlowRepository) GetCashFlowByID(ctx context.Context, orgID, id string) (*domain.CashFlow, error) {
	args := m.Called(ctx, orgID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CashFlow), args.Error(1)
}

func (m *MockCashFlowRepository) GetCashFlowByOrgID(ctx context.Context, orgID string, q domain.ListCashFlowsQuery) ([]*domain.CashFlowResponse, int64, error) {
	args := m.Called(ctx, orgID, q)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.CashFlowResponse), args.Get(1).(int64), args.Error(2)
}

func (m *MockCashFlowRepository) ApproveCashFlow(ctx context.Context, orgID, id, approvedBy string) error {
	args := m.Called(ctx, orgID, id, approvedBy)
	return args.Error(0)
}

func (m *MockCashFlowRepository) CancelCashFlow(ctx context.Context, orgID, id string) error {
	args := m.Called(ctx, orgID, id)
	return args.Error(0)
}

func (m *MockCashFlowRepository) GetCashFlowStats(ctx context.Context, orgID, dateFrom, dateTo string) (*domain.CashFlowStats, error) {
	args := m.Called(ctx, orgID, dateFrom, dateTo)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CashFlowStats), args.Error(1)
}

// MockFundRepository giả lập lại interface FundRepository.
type MockFundRepository struct {
	mock.Mock
}

func (m *MockFundRepository) CreateFund(ctx context.Context, fund *domain.Fund) error {
	args := m.Called(ctx, fund)
	return args.Error(0)
}

func (m *MockFundRepository) GetFundByID(ctx context.Context, orgID, id string) (*domain.Fund, error) {
	args := m.Called(ctx, orgID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Fund), args.Error(1)
}

func (m *MockFundRepository) GetFundsByOrgID(ctx context.Context, orgID string, activeOnly bool) ([]*domain.Fund, error) {
	args := m.Called(ctx, orgID, activeOnly)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Fund), args.Error(1)
}

func (m *MockFundRepository) GetFundBalance(ctx context.Context, orgID, fundID string) (float64, float64, float64, error) {
	args := m.Called(ctx, orgID, fundID)
	return args.Get(0).(float64), args.Get(1).(float64), args.Get(2).(float64), args.Error(3)
}

func (m *MockFundRepository) UpdateFund(ctx context.Context, fund *domain.Fund) error {
	args := m.Called(ctx, fund)
	return args.Error(0)
}

func (m *MockFundRepository) DeactivateFund(ctx context.Context, orgID, id string) error {
	args := m.Called(ctx, orgID, id)
	return args.Error(0)
}

func (m *MockFundRepository) GetFundStats(ctx context.Context, orgID string) ([]*domain.FundStats, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.FundStats), args.Error(1)
}

func (m *MockFundRepository) GetFundMovementHistory(ctx context.Context, orgID string) ([]*domain.CashFlowResponse, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.CashFlowResponse), args.Error(1)
}

// MockCashFlowCategoryRepository giả lập lại interface CashFlowCategoryRepository.
type MockCashFlowCategoryRepository struct {
	mock.Mock
}

func (m *MockCashFlowCategoryRepository) CreateCategory(ctx context.Context, category *domain.CashFlowCategory) error {
	args := m.Called(ctx, category)
	return args.Error(0)
}

func (m *MockCashFlowCategoryRepository) GetCategoriesByOrgID(ctx context.Context, orgID, kind string) ([]*domain.CashFlowCategory, error) {
	args := m.Called(ctx, orgID, kind)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.CashFlowCategory), args.Error(1)
}

func (m *MockCashFlowCategoryRepository) UpdateCategory(ctx context.Context, category *domain.CashFlowCategory) error {
	args := m.Called(ctx, category)
	return args.Error(0)
}

func (m *MockCashFlowCategoryRepository) DeleteCategory(ctx context.Context, orgID, id string) error {
	args := m.Called(ctx, orgID, id)
	return args.Error(0)
}
