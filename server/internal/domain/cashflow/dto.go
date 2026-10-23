package cashflow

import "time"

type CreateFundRequest struct {
	Code           string  `json:"code"`
	Name           string  `json:"name"`
	FundType       string  `json:"fund_type"`
	BankName       *string `json:"bank_name"`
	AccountNumber  *string `json:"account_number"`
	OpeningBalance float64 `json:"opening_balance"`
}

type UpdateFundRequest struct {
	Name          string  `json:"name"`
	BankName      *string `json:"bank_name"`
	AccountNumber *string `json:"account_number"`
	IsActive      *bool   `json:"is_active"`
}

type FundResponse struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	Code           string     `json:"code"`
	Name           string     `json:"name"`
	FundType       string     `json:"fund_type"`
	BankName       *string    `json:"bank_name"`
	AccountNumber  *string    `json:"account_number"`
	OpeningBalance float64    `json:"opening_balance"`
	CurrentBalance float64    `json:"current_balance"`
	IsActive       bool       `json:"is_active"`
	IsDefault      bool       `json:"is_default"`
	IsConfigured   bool       `json:"is_configured"`
	CreatedAt      *time.Time `json:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at"`
}
type FundStats struct {
	ID             string  `json:"id" db:"id"`
	OrganizationID string  `json:"organization_id" db:"organization_id"`
	Code           string  `json:"code" db:"code"`
	FundType       string  `json:"fund_type" db:"fund_type"`
	Name           string  `json:"name" db:"name"`
	OpeningBalance float64 `json:"opening_balance" db:"opening_balance"`
	CurrentBalance float64 `json:"current_balance" db:"current_balance"`
	IsActive       bool    `json:"is_active" db:"is_active"`
	IsDefault      bool    `json:"is_default" db:"is_default"`
	IsConfigured   bool    `json:"is_configured" db:"is_configured"`
}

type CreateCashFlowCategoryRequest struct {
	Code         string `json:"code"`
	Name         string `json:"name"`
	Kind         string `json:"kind"`
	CategoryType string `json:"category_type"`
	SortOrder    int    `json:"sort_order"`
}

type UpdateCashFlowCategoryRequest struct {
	Name      string `json:"name"`
	SortOrder int    `json:"sort_order"`
	IsActive  *bool  `json:"is_active"`
}

type CashFlowCategoryResponse struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	Code           string     `json:"code"`
	Name           string     `json:"name"`
	Kind           string     `json:"kind"`
	CategoryType   string     `json:"category_type"`
	IsSystem       bool       `json:"is_system"`
	SortOrder      int        `json:"sort_order"`
	IsActive       bool       `json:"is_active"`
	CreatedAt      *time.Time `json:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at"`
}

type CreateCashFlowRequest struct {
	Kind                string  `json:"kind"`
	CategoryID          *string `json:"category_id"`
	FundID              string  `json:"fund_id"`
	Amount              float64 `json:"amount"`
	Description         *string `json:"description"`
	OccurredAt          string  `json:"occurred_at"`
	OrderID             *string `json:"order_id"`
	InventoryDocumentID *string `json:"inventory_document_id"`
}

type ApproveCashFlowRequest struct {
	ApprovedBy *string `json:"approved_by"`
}

type CashFlowResponse struct {
	ID                  string     `json:"id" db:"id"`
	OrganizationID      string     `json:"organization_id" db:"organization_id"`
	Code                string     `json:"code" db:"code"`
	Kind                string     `json:"kind" db:"kind"`
	CategoryID          *string    `json:"category_id" db:"category_id"`
	CategoryName        *string    `json:"category_name" db:"category_name"`
	FundID              string     `json:"fund_id" db:"fund_id"`
	FundName            string     `json:"fund_name" db:"fund_name"`
	Amount              float64    `json:"amount" db:"amount"`
	Description         *string    `json:"description" db:"description"`
	OccurredAt          *time.Time `json:"occurred_at" db:"occurred_at"`
	Status              string     `json:"status" db:"status"`
	OrderID             *string    `json:"order_id" db:"order_id"`
	InventoryDocumentID *string    `json:"inventory_document_id" db:"inventory_document_id"`
	CreatedBy           *string    `json:"created_by" db:"created_by"`
	ApprovedBy          *string    `json:"approved_by" db:"approved_by"`
	ApprovedAt          *time.Time `json:"approved_at" db:"approved_at"`
	CreatedAt           *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           *time.Time `json:"updated_at" db:"updated_at"`
}
type CashFlowStats struct {
	TotalIncome           float64 `json:"total_income" db:"total_income"`
	TotalOperatingExpense float64 `json:"total_operating_expense" db:"total_operating_expense"`
	TotalNonPNLExpense    float64 `json:"total_non_pnl_expense" db:"total_non_pnl_expense"`
}

type CashFlowStatsResponse struct {
	TotalIncome           float64      `json:"total_income"`
	TotalOperatingExpense float64      `json:"total_operating_expense"`
	TotalNonPNLExpense    float64      `json:"total_non_pnl_expense"`
	Funds                 []*FundStats `json:"funds"`
}
type ListCashFlowsQuery struct {
	Kind       string `json:"kind" form:"kind"`
	CategoryID string `json:"category_id" form:"category_id"`
	FundID     string `json:"fund_id" form:"fund_id"`
	Status     string `json:"status" form:"status"`
	Search     string `json:"search" form:"search"`
	DateFrom   string `json:"date_from" form:"date_from"`
	DateTo     string `json:"date_to" form:"date_to"`
	SortBy     string `json:"sort_by" form:"sort_by"`
	Page       int    `json:"page" form:"page"`
	PageSize   int    `json:"page_size" form:"page_size"`
}

type CreatePayrollRequest struct {
	StaffID          string  `json:"staff_id"`
	PeriodMonth      string  `json:"period_month"`
	BaseSalary       float64 `json:"base_salary"`
	CommissionAmount float64 `json:"commission_amount"`
	BonusAmount      float64 `json:"bonus_amount"`
	AdvanceAmount    float64 `json:"advance_amount"`
	DeductionAmount  float64 `json:"deduction_amount"`
}

type PayrollResponse struct {
	ID               string     `json:"id"`
	OrganizationID   string     `json:"organization_id"`
	StaffID          string     `json:"staff_id"`
	StaffName        string     `json:"staff_name"`
	PeriodMonth      *time.Time `json:"period_month"`
	BaseSalary       float64    `json:"base_salary"`
	CommissionAmount float64    `json:"commission_amount"`
	BonusAmount      float64    `json:"bonus_amount"`
	AdvanceAmount    float64    `json:"advance_amount"`
	DeductionAmount  float64    `json:"deduction_amount"`
	NetPay           float64    `json:"net_pay"`
	Status           string     `json:"status"`
	CashFlowID       *string    `json:"cash_flow_id"`
	PaidAt           *time.Time `json:"paid_at"`
	CreatedAt        *time.Time `json:"created_at"`
	UpdatedAt        *time.Time `json:"updated_at"`
}
