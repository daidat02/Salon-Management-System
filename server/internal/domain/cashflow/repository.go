package cashflow

import (
	"context"
	"errors"
)

// ErrFundNotFound dùng để usecase map đúng 404 khi UPDATE/DELETE không chạm dòng nào
// (sai id hoặc khác organization).
var ErrFundNotFound = errors.New("fund not found")

// ErrInsufficientFundBalance dùng để usecase map đúng 400 khi APPROVE cashflow mà quỹ không đủ tiền.
var ErrInsufficientFundBalance = errors.New("insufficient fund balance")

// ErrCashFlowCategoryNotFound dùng để usecase map đúng 404 khi UPDATE/DELETE không chạm dòng nào.
var ErrCashFlowCategoryNotFound = errors.New("cash flow category not found")

// ErrCashFlowNotFound dùng để usecase map đúng 404 khi APPROVE/CANCEL không chạm dòng nào.
var ErrCashFlowNotFound = errors.New("cash flow not found")

// ErrPayrollNotFound dùng để usecase map đúng 404 khi APPROVE/PAY không chạm dòng nào.
var ErrPayrollNotFound = errors.New("payroll not found")

type FundRepository interface {
	CreateFund(ctx context.Context, fund *Fund) error
	GetFundByID(ctx context.Context, orgID, id string) (*Fund, error)
	GetFundsByOrgID(ctx context.Context, orgID string, activeOnly bool) ([]*Fund, error)
	GetFundBalance(ctx context.Context, orgID, fundID string) (opening, totalIncome, totalExpense float64, err error)
	UpdateFund(ctx context.Context, fund *Fund) error
	DeactivateFund(ctx context.Context, orgID, id string) error
	GetFundStats(ctx context.Context, orgID string) ([]*FundStats, error)
	GetFundMovementHistory(ctx context.Context, orgID string) ([]*CashFlowResponse, error)
}

type CashFlowCategoryRepository interface {
	CreateCategory(ctx context.Context, category *CashFlowCategory) error
	GetCategoriesByOrgID(ctx context.Context, orgID, kind string) ([]*CashFlowCategory, error)
	UpdateCategory(ctx context.Context, category *CashFlowCategory) error
	DeleteCategory(ctx context.Context, orgID, id string) error
}

type CashFlowRepository interface {
	CreateCashFlow(ctx context.Context, voucher *CashFlow) error
	GetCashFlowByID(ctx context.Context, orgID, id string) (*CashFlow, error)
	GetCashFlowByOrgID(ctx context.Context, orgID string, q ListCashFlowsQuery) ([]*CashFlowResponse, int64, error)
	ApproveCashFlow(ctx context.Context, orgID, id, approvedBy string) error
	CancelCashFlow(ctx context.Context, orgID, id string) error
	GetCashFlowStats(ctx context.Context, orgID, dateFrom, dateTo string) (*CashFlowStats, error)
}

type PayrollRepository interface {
	CreatePayroll(ctx context.Context, payroll *Payroll) error
	GetPayrollsByPeriod(ctx context.Context, orgID, periodMonth string) ([]*Payroll, error)
	ApprovePayroll(ctx context.Context, orgID, id, approvedBy string) error
	MarkPayrollPaid(ctx context.Context, orgID, id, cashFlowID string) error
}
