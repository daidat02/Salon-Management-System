package staff

import (
	"context"
	"errors"
)

var ErrMissingOrganizationID = errors.New("missing organization_id in context")

// ErrStaffNotFound dùng để usecase map đúng 404 khi UPDATE/DELETE không chạm dòng nào
// (sai id, khác organization, hoặc đã bị xóa mềm).
var ErrStaffNotFound = errors.New("staff not found")

var ExistingPayrollOfStaffAndPeriod = errors.New("existing payroll of staff and period")

var ErrAdjustmentLockedOrNotFound = errors.New("adjustment is locked or not found")

// ErrLeaveLocked báo khoảng ngày nghỉ đã nằm trong bảng lương đã chốt.
var ErrLeaveLocked = errors.New("leave range is locked by a payroll")

type StaffRepository interface {
	CreateStaff(ctx context.Context, staff *Staff) (string, error)
	GetStaffByOrgID(ctx context.Context, orgID string, search string, status string, sort string, limit, offset int) ([]*Staff, error)
	GetStaffByID(ctx context.Context, orgID, id string) (*Staff, error)
	GetStaffPayroll(ctx context.Context, orgID, staffID, dateFrom, dateTo string, standardWorkingDays int) (*StaffPayrollResponse, error)
	GetStaffServiceHistory(ctx context.Context, orgID, staffID, dateFrom, dateTo, search string, limit, offset int) (*StaffServiceHistorySummary, []*StaffServiceHistoryItem, int64, error)
	CountStaffsByOrgID(ctx context.Context, orgID string, search string, status string) (int64, error)
	UpdateStaff(ctx context.Context, staff *Staff) error
	DeleteStaff(ctx context.Context, orgID, id string) error
	CreatePayroll(ctx context.Context, payroll *Payroll, staffInfo *StaffBasicInfo) error
	GetStaffBasicByID(ctx context.Context, orgID, staffID string) (*StaffBasicInfo, error)

	CreateSalaryAdjustment(ctx context.Context, adjustment *SalaryAdjustment) error
	GetSalaryAdjustments(ctx context.Context, orgID, staffID, periodMonth string) ([]*SalaryAdjustment, error)
	DeleteSalaryAdjustment(ctx context.Context, orgID, adjustmentID string) error

	CreateStaffLeave(ctx context.Context, leave *StaffLeave) error
	GetStaffLeaves(ctx context.Context, orgID, staffID string) ([]*StaffLeave, error)
}

type PayrollRepository interface {
	CreatePayroll(ctx context.Context, payroll *Payroll) error
	GetPayrollsByPeriod(ctx context.Context, orgID, periodMonth string) ([]*Payroll, error)
	ApprovePayroll(ctx context.Context, orgID, id, approvedBy string) error
	MarkPayrollPaid(ctx context.Context, orgID, id, cashFlowID string) error
}
