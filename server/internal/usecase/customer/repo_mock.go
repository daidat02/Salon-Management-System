package customer

import (
	"context"

	appointmentDomain "github.com/daidat02/server/internal/domain/appointment"
	domain "github.com/daidat02/server/internal/domain/customer"
	orderDomain "github.com/daidat02/server/internal/domain/order"
	"github.com/stretchr/testify/mock"
)

// MockCustomerRepository giả lập lại interface của CustomerRepository
type MockCustomerRepository struct {
	mock.Mock
}

func (m *MockCustomerRepository) CreateCustomer(ctx context.Context, customer *domain.Customer) error {
	args := m.Called(ctx, customer)
	return args.Error(0)
}

func (m *MockCustomerRepository) GetCustomersByOrgID(ctx context.Context, orgID, search string, limit, offset int) ([]*domain.Customer, error) {
	args := m.Called(ctx, orgID, search, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Customer), args.Error(1)
}

func (m *MockCustomerRepository) CountCustomersByOrgID(ctx context.Context, orgID, search string) (int64, error) {
	args := m.Called(ctx, orgID, search)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockCustomerRepository) GetCustomerDetailByID(ctx context.Context, orgID, id string) (*domain.CustomerDetailsResponse, error) {
	args := m.Called(ctx, orgID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CustomerDetailsResponse), args.Error(1)
}

func (m *MockCustomerRepository) GetCustomerByPhone(ctx context.Context, orgID, phone string) (*domain.Customer, error) {
	args := m.Called(ctx, orgID, phone)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Customer), args.Error(1)
}

func (m *MockCustomerRepository) UpdateCustomer(ctx context.Context, customer *domain.Customer) error {
	args := m.Called(ctx, customer)
	return args.Error(0)
}

func (m *MockCustomerRepository) DeleteCustomer(ctx context.Context, orgID, id string) error {
	args := m.Called(ctx, orgID, id)
	return args.Error(0)
}

func (m *MockCustomerRepository) GetCustomerStats(ctx context.Context, orgID string) (*domain.CustomerStatsResponse, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CustomerStatsResponse), args.Error(1)
}

// MockHistoryStore giả lập HistoryStore (lịch sử lịch hẹn của khách).
type MockHistoryStore struct {
	mock.Mock
}

func (m *MockHistoryStore) GetAppointmentsByCustomerID(ctx context.Context, orgID, customerID string, limit, offset int) ([]*appointmentDomain.Appointment, error) {
	args := m.Called(ctx, orgID, customerID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*appointmentDomain.Appointment), args.Error(1)
}

func (m *MockHistoryStore) CountAppointmentsByCustomerID(ctx context.Context, orgID, customerID string) (int64, error) {
	args := m.Called(ctx, orgID, customerID)
	return args.Get(0).(int64), args.Error(1)
}

// MockOrderHistoryStore giả lập OrderHistoryStore (lịch sử đơn hàng của khách).
type MockOrderHistoryStore struct {
	mock.Mock
}

func (m *MockOrderHistoryStore) ListHistoriesOrderByCustomerId(ctx context.Context, orgID, customerID string, limit, offset int) ([]*orderDomain.Order, error) {
	args := m.Called(ctx, orgID, customerID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*orderDomain.Order), args.Error(1)
}

func (m *MockOrderHistoryStore) CountHistoriesOrderByCustomerId(ctx context.Context, orgID, customerID string) (int64, error) {
	args := m.Called(ctx, orgID, customerID)
	return args.Get(0).(int64), args.Error(1)
}
