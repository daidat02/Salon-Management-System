package staff

import "time"

type CreateStaffRequest struct {
	ID                string  `json:"id"`
	OrganizationId    string  `json:"organization_id"`
	FullName          string  `json:"full_name"`
	Phone             string  `json:"phone"`
	Email             string  `json:"email"`
	BirthDate         *string `json:"birth_date"`
	Gender            string  `json:"gender"`
	Address           string  `json:"address"`
	Position          string  `json:"position"`
	EmploymentType    string  `json:"employment_type"`
	CommissionRate    float64 `json:"commission_rate"`
	BaseSalary        float64 `json:"base_salary"`
	BankName          string  `json:"bank_name"`
	BankAccountNumber string  `json:"bank_account_number"`
	BankAccountHolder string  `json:"bank_account_holder"`
	Status            string  `json:"status"`
	HireDate          *string `json:"hire_date"`
}

type UpdateStaffRequest struct {
	Code              string  `json:"code"`
	FullName          string  `json:"full_name"`
	Phone             string  `json:"phone"`
	Email             string  `json:"email"`
	BirthDate         *string `json:"birth_date"`
	Gender            string  `json:"gender"`
	Address           string  `json:"address"`
	Position          string  `json:"position"`
	EmploymentType    string  `json:"employment_type"`
	CommissionRate    float64 `json:"commission_rate"`
	BaseSalary        float64 `json:"base_salary"`
	BankName          string  `json:"bank_name"`
	BankAccountNumber string  `json:"bank_account_number"`
	BankAccountHolder string  `json:"bank_account_holder"`
	Status            string  `json:"status"`
	HireDate          *string `json:"hire_date"`
}

type StaffPayrollResponse struct {
	StaffID             string    `json:"staff_id" db:"staff_id"`
	DateFrom            time.Time `json:"date_from" db:"date_from"`
	DateTo              time.Time `json:"date_to" db:"date_to"`
	BaseSalary          float64   `json:"base_salary" db:"base_salary"`
	StandardWorkingDays int       `json:"standard_working_days" db:"standard_working_days"`
	TotalLeaveDays      int       `json:"total_leave_days" db:"total_leave_days"`
	ActualWorkingDays   int       `json:"actual_working_days" db:"actual_working_days"`
	ProratedBaseSalary  float64   `json:"prorated_base_salary" db:"prorated_base_salary"`
	BonusAmount         float64   `json:"bonus_amount" db:"bonus_amount"`
	AdjustmentDeduction float64   `json:"adjustment_deduction" db:"adjustment_deduction"`
	PenaltyAmount       float64   `json:"penalty_amount" db:"penalty_amount"`
	AdvanceAmount       float64   `json:"advance_amount" db:"advance_amount"`
	TotalDeduction      float64   `json:"total_deduction" db:"total_deduction"`
	TotalOrders         int64     `json:"total_orders" db:"total_orders"`
	TotalItems          int64     `json:"total_items" db:"total_items"`
	TotalCommission     float64   `json:"total_commission" db:"total_commission"`
	TotalAmountValue    float64   `json:"total_amount_value" db:"total_amount_value"`
	NetPay              float64   `json:"net_pay" db:"net_pay"`
	Source              string    `json:"source" db:"-"`
	PayrollStatus       *string   `json:"payroll_status" db:"-"`
}

// StaffServiceHistorySummary tổng hợp dịch vụ đã thực hiện trong khoảng ngày.
type StaffServiceHistorySummary struct {
	TotalOrders      int64   `json:"total_orders" db:"total_orders"`
	TotalItems       int64   `json:"total_items" db:"total_items"`
	TotalCommission  float64 `json:"total_commission" db:"total_commission"`
	TotalAmountValue float64 `json:"total_amount_value" db:"total_amount_value"`
}

// StaffServiceHistoryItem 1 dòng dịch vụ nhân viên đã thực hiện.
type StaffServiceHistoryItem struct {
	ID               string    `json:"id" db:"id"`
	OrderID          string    `json:"order_id" db:"order_id"`
	OrderItemID      string    `json:"order_item_id" db:"order_item_id"`
	OrderCode        string    `json:"order_code" db:"order_code"`
	CustomerName     string    `json:"customer_name" db:"customer_name"`
	ServiceName      string    `json:"service_name" db:"service_name"`
	LineTotal        float64   `json:"line_total" db:"line_total"`
	CommissionAmount float64   `json:"commission_amount" db:"commission_amount"`
	Type             string    `json:"type" db:"type"`
	SharePct         float64   `json:"share_pct" db:"share_pct"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	TotalCount       int64     `json:"-" db:"total_count"`
}

// StaffServiceHistoryResponse lịch sử dịch vụ kèm summary + phân trang.
type StaffServiceHistoryResponse struct {
	Summary    *StaffServiceHistorySummary `json:"summary"`
	Data       []*StaffServiceHistoryItem  `json:"data"`
	Page       int                         `json:"page"`
	PageSize   int                         `json:"page_size"`
	Total      int64                       `json:"total"`
	TotalPages int64                       `json:"total_pages"`
}

type StaffResponse struct {
	ID                string     `json:"id"`
	OrganizationID    string     `json:"organization_id"`
	Code              string     `json:"code"`
	FullName          string     `json:"full_name"`
	Phone             string     `json:"phone"`
	Email             string     `json:"email"`
	BirthDate         *time.Time `json:"birth_date"`
	Gender            string     `json:"gender"`
	Address           string     `json:"address"`
	Position          string     `json:"position"`
	EmploymentType    string     `json:"employment_type"`
	CommissionRate    float64    `json:"commission_rate"`
	BaseSalary        float64    `json:"base_salary"`
	BankName          string     `json:"bank_name"`
	BankAccountNumber string     `json:"bank_account_number"`
	BankAccountHolder string     `json:"bank_account_holder"`
	Status            string     `json:"status"`
	HireDate          time.Time  `json:"hire_date"`
	CreatedAt         *time.Time `json:"created_at"`
	UpdatedAt         *time.Time `json:"updated_at"`
	DeletedAt         *time.Time `json:"deleted_at"`
}

type StaffBasicInfo struct {
	ID       string `db:"id" json:"id"`
	Code     string `db:"code" json:"code"`
	FullName string `db:"full_name" json:"full_name"`
	Position string `db:"position" json:"position"`
}

type BulkPayrollDraftItem struct {
	StaffID   string `json:"staff_id"`
	StaffCode string `json:"staff_code"`
	StaffName string `json:"staff_name"`
	Result    string `json:"result"`
	Reason    string `json:"reason"`
}

type BulkPayrollDraftResponse struct {
	TargetMonth string                 `json:"target_month"`
	Created     int                    `json:"created"`
	Skipped     int                    `json:"skipped"`
	Failed      int                    `json:"failed"`
	Items       []BulkPayrollDraftItem `json:"items"`
}

const (
	AdjustmentTypeAllowance = "ALLOWANCE"
	AdjustmentTypeDeduction = "DEDUCTION"
)

type SalaryAdjustmentRequest struct {
	StaffID        string  `json:"staff_id"`
	AdjustmentType string  `json:"adjustment_type"`
	Amount         float64 `json:"amount" db:"amount"`
	Reason         string  `json:"reason" db:"reason"`
	EffectiveDate  string  `json:"effective_date"`
}
type CreateStaffLeaveRequest struct {
	LeaveType string `json:"leave_type" binding:"required"`
	StartDate string `json:"start_date" binding:"required"`
	EndDate   string `json:"end_date" binding:"required"`
	Note      string `json:"note"`
}
