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
	ID              string     `json:"id"`
	OrganizationID  string     `json:"organization_id"`
	Code            string     `json:"code"`
	Name            string     `json:"name"`
	FundType        string     `json:"fund_type"`
	BankName        *string    `json:"bank_name"`
	AccountNumber   *string    `json:"account_number"`
	OpeningBalance  float64    `json:"opening_balance"`
	CurrentBalance  float64    `json:"current_balance"`
	IsActive        bool       `json:"is_active"`
	CreatedAt       *time.Time `json:"created_at"`
	UpdatedAt       *time.Time `json:"updated_at"`
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
	ID                  string     `json:"id"`
	OrganizationID      string     `json:"organization_id"`
	Code                string     `json:"code"`
	Kind                string     `json:"kind"`
	CategoryID          *string    `json:"category_id"`
	CategoryName        *string    `json:"category_name"`
	FundID              string     `json:"fund_id"`
	FundName            string     `json:"fund_name"`
	Amount              float64    `json:"amount"`
	Description         *string    `json:"description"`
	OccurredAt          *time.Time `json:"occurred_at"`
	Status              string     `json:"status"`
	OrderID             *string    `json:"order_id"`
	InventoryDocumentID *string    `json:"inventory_document_id"`
	CreatedBy           *string    `json:"created_by"`
	ApprovedBy          *string    `json:"approved_by"`
	ApprovedAt          *time.Time `json:"approved_at"`
	CreatedAt           *time.Time `json:"created_at"`
	UpdatedAt           *time.Time `json:"updated_at"`
}

type ListCashFlowsQuery struct {
	Kind     string `json:"kind"`
	CategoryID string `json:"category_id"`
	FundID   string `json:"fund_id"`
	Status   string `json:"status"`
	Search   string `json:"search"`
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
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
	ID                string     `json:"id"`
	OrganizationID    string     `json:"organization_id"`
	StaffID           string     `json:"staff_id"`
	StaffName         string     `json:"staff_name"`
	PeriodMonth       *time.Time `json:"period_month"`
	BaseSalary        float64    `json:"base_salary"`
	CommissionAmount  float64    `json:"commission_amount"`
	BonusAmount       float64    `json:"bonus_amount"`
	AdvanceAmount     float64    `json:"advance_amount"`
	DeductionAmount   float64    `json:"deduction_amount"`
	NetPay            float64    `json:"net_pay"`
	Status            string     `json:"status"`
	CashFlowID        *string    `json:"cash_flow_id"`
	PaidAt            *time.Time `json:"paid_at"`
	CreatedAt         *time.Time `json:"created_at"`
	UpdatedAt         *time.Time `json:"updated_at"`
}
