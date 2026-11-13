package staff

import (
	"context"

	settingDomain "github.com/daidat02/server/internal/domain/setting"
	domain "github.com/daidat02/server/internal/domain/staff"
	"github.com/stretchr/testify/mock"
)

// MockStaffRepository giả lập lại interface của StaffRepository
type MockStaffRepository struct {
	mock.Mock
}

func (m *MockStaffRepository) CreateStaff(ctx context.Context, staff *domain.Staff) (string, error) {
	args := m.Called(ctx, staff)
	return args.String(0), args.Error(1)
}

func (m *MockStaffRepository) GetStaffByOrgID(ctx context.Context, orgID string, search string, status string, sort string, limit, offset int) ([]*domain.Staff, error) {
	args := m.Called(ctx, orgID, search, status, sort, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Staff), args.Error(1)
}

func (m *MockStaffRepository) GetStaffByID(ctx context.Context, orgID, id string) (*domain.Staff, error) {
	args := m.Called(ctx, orgID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Staff), args.Error(1)
}

func (m *MockStaffRepository) GetStaffPayroll(ctx context.Context, orgID, staffID, dateFrom, dateTo string, standardWorkingDays int) (*domain.StaffPayrollResponse, error) {
	args := m.Called(ctx, orgID, staffID, dateFrom, dateTo, standardWorkingDays)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.StaffPayrollResponse), args.Error(1)
}

func (m *MockStaffRepository) GetPayrollByPeriod(ctx context.Context, orgID, staffID, periodMonth string) (*domain.Payroll, error) {
	args := m.Called(ctx, orgID, staffID, periodMonth)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Payroll), args.Error(1)
}

func (m *MockStaffRepository) GetPayrollSettings(ctx context.Context, orgID string) (*settingDomain.PayrollSettings, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*settingDomain.PayrollSettings), args.Error(1)
}

func (m *MockStaffRepository) GetStaffServiceHistory(ctx context.Context, orgID, staffID, dateFrom, dateTo, search string, limit, offset int) (*domain.StaffServiceHistorySummary, []*domain.StaffServiceHistoryItem, int64, error) {
	args := m.Called(ctx, orgID, staffID, dateFrom, dateTo, search, limit, offset)
	var summary *domain.StaffServiceHistorySummary
	if args.Get(0) != nil {
		summary = args.Get(0).(*domain.StaffServiceHistorySummary)
	}
	var items []*domain.StaffServiceHistoryItem
	if args.Get(1) != nil {
		items = args.Get(1).([]*domain.StaffServiceHistoryItem)
	}
	return summary, items, args.Get(2).(int64), args.Error(3)
}

func (m *MockStaffRepository) CountStaffsByOrgID(ctx context.Context, orgID string, search string, status string) (int64, error) {
	args := m.Called(ctx, orgID, search, status)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockStaffRepository) UpdateStaff(ctx context.Context, staff *domain.Staff) error {
	args := m.Called(ctx, staff)
	return args.Error(0)
}

func (m *MockStaffRepository) DeleteStaff(ctx context.Context, orgID, id string) error {
	args := m.Called(ctx, orgID, id)
	return args.Error(0)
}

func (m *MockStaffRepository) CreatePayroll(ctx context.Context, payroll *domain.Payroll, staffInfo *domain.StaffBasicInfo) error {
	args := m.Called(ctx, payroll, staffInfo)
	return args.Error(0)
}
func (m *MockStaffRepository) ListStaffForPayrollDraft(ctx context.Context, orgID string, periodEnd string) ([]*domain.Staff, error) {
	args := m.Called(ctx, orgID, periodEnd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Staff), args.Error(1)
}

func (m *MockStaffRepository) GetStaffBasicByID(ctx context.Context, orgID, staffID string) (*domain.StaffBasicInfo, error) {
	args := m.Called(ctx, orgID, staffID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.StaffBasicInfo), args.Error(1)
}

func (m *MockStaffRepository) CreateSalaryAdjustment(ctx context.Context, adjustment *domain.SalaryAdjustment) error {
	args := m.Called(ctx, adjustment)
	return args.Error(0)
}

func (m *MockStaffRepository) GetSalaryAdjustments(ctx context.Context, orgID, staffID, periodMonth string) ([]*domain.SalaryAdjustment, error) {
	args := m.Called(ctx, orgID, staffID, periodMonth)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.SalaryAdjustment), args.Error(1)
}

func (m *MockStaffRepository) DeleteSalaryAdjustment(ctx context.Context, orgID, adjustmentID string) error {
	args := m.Called(ctx, orgID, adjustmentID)
	return args.Error(0)
}
func (m *MockStaffRepository) CreateStaffLeave(ctx context.Context, leave *domain.StaffLeave) error {
	args := m.Called(ctx, leave)
	return args.Error(0)
}

func (m *MockStaffRepository) GetStaffLeaves(ctx context.Context, orgID, staffID string) ([]*domain.StaffLeave, error) {
	args := m.Called(ctx, orgID, staffID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.StaffLeave), args.Error(1)
}
