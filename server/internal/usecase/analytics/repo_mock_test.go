package analytics

import (
	"context"
	"time"

	domain "github.com/daidat02/server/internal/domain/analytics"
	"github.com/stretchr/testify/mock"
)

type MockAnalyticsRepository struct {
	mock.Mock
}

func (m *MockAnalyticsRepository) GetTotals(ctx context.Context, orgID string, from, to time.Time) (*domain.Totals, error) {
	args := m.Called(ctx, orgID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Totals), args.Error(1)
}

func (m *MockAnalyticsRepository) GetMonthly(ctx context.Context, orgID string, from, to time.Time) ([]*domain.MonthlyAggregate, error) {
	args := m.Called(ctx, orgID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.MonthlyAggregate), args.Error(1)
}

func (m *MockAnalyticsRepository) GetComposition(ctx context.Context, orgID string, from, to time.Time) (*domain.CompositionAmounts, error) {
	args := m.Called(ctx, orgID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CompositionAmounts), args.Error(1)
}

func (m *MockAnalyticsRepository) GetTopServices(ctx context.Context, orgID string, from, to time.Time, limit int) ([]*domain.TopService, error) {
	args := m.Called(ctx, orgID, from, to, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.TopService), args.Error(1)
}

func (m *MockAnalyticsRepository) GetOrderMetrics(ctx context.Context, orgID string, from, to time.Time) (*domain.OrderMetrics, error) {
	args := m.Called(ctx, orgID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.OrderMetrics), args.Error(1)
}

func (m *MockAnalyticsRepository) GetAppointmentSummary(ctx context.Context, orgID string, from, to time.Time) (*domain.AppointmentSummary, error) {
	args := m.Called(ctx, orgID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.AppointmentSummary), args.Error(1)
}

func (m *MockAnalyticsRepository) GetDailyRevenue(ctx context.Context, orgID string, from, to time.Time) ([]*domain.DailyRevenueRow, error) {
	args := m.Called(ctx, orgID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.DailyRevenueRow), args.Error(1)
}

func (m *MockAnalyticsRepository) GetLowStockProducts(ctx context.Context, orgID string, limit int) ([]*domain.LowStockRow, error) {
	args := m.Called(ctx, orgID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.LowStockRow), args.Error(1)
}

func (m *MockAnalyticsRepository) GetTodayAppointments(ctx context.Context, orgID string, from, to time.Time, limit int) ([]*domain.TodayAppointmentRow, error) {
	args := m.Called(ctx, orgID, from, to, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.TodayAppointmentRow), args.Error(1)
}

func (m *MockAnalyticsRepository) GetRecentOrders(ctx context.Context, orgID string, limit int) ([]*domain.RecentOrderRow, error) {
	args := m.Called(ctx, orgID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.RecentOrderRow), args.Error(1)
}
