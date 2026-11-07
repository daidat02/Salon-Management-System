package staff

import (
	"errors"
	"time"
)

const (
	statusActive   = "active"
	statusInactive = "inactive"
)

// Trạng thái bảng lương — khớp CHECK status IN ('draft','approved','paid','cancelled').
const (
	PayrollStatusDraft     = "draft"
	PayrollStatusApproved  = "approved"
	PayrollStatusPaid      = "paid"
	PayrollStatusCancelled = "cancelled"
)

// Loại ngày nghỉ — khớp CHECK leave_type IN ('ANNUAL','EXCUSED','LATE').
const (
	LeaveTypeAnnual  = "ANNUAL"
	LeaveTypeExcused = "EXCUSED"
	LeaveTypeLate    = "LATE"
)

type Staff struct {
	ID                string     `db:"id"`
	OrganizationID    string     `db:"organization_id"`
	Code              string     `db:"code"`
	FullName          string     `db:"full_name"`
	Phone             string     `db:"phone"`
	Email             string     `db:"email"`
	BirthDate         *time.Time `db:"birth_date"`
	Gender            string     `db:"gender"`
	Address           string     `db:"address"`
	Position          string     `db:"position"`
	EmploymentType    string     `db:"employment_type"`
	CommissionRate    float64    `db:"commission_rate"`
	BaseSalary        float64    `db:"base_salary"`
	BankName          string     `db:"bank_name"`
	BankAccountNumber string     `db:"bank_account_number"`
	BankAccountHolder string     `db:"bank_account_holder"`
	Status            string     `db:"status"`
	HireDate          time.Time  `db:"hire_date"`
	CreatedAt         *time.Time `db:"created_at"`
	UpdatedAt         *time.Time `db:"updated_at"`
	DeletedAt         *time.Time `db:"deleted_at"`
}

func (s *Staff) Validate() error {
	if s.FullName == "" {
		return errors.New("Tên đầy đủ không được để trống")
	}
	if s.Phone == "" {
		return errors.New("Số điện thoại không được để trống")
	}
	if s.Position == "" {
		return errors.New("Vị trí không được để trống")
	}
	if s.CommissionRate < 0 || s.CommissionRate > 100 {
		return errors.New("Tỷ lệ hoa hồng phải nằm trong khoảng từ 0 đến 100")
	}
	if s.BaseSalary < 0 {
		return errors.New("Lương cơ bản không được âm")
	}
	if s.Gender != "" && s.Gender != "male" && s.Gender != "female" && s.Gender != "other" {
		return errors.New("Giới tính không hợp lệ")
	}
	if s.EmploymentType != "" && s.EmploymentType != "fulltime" && s.EmploymentType != "parttime" {
		return errors.New("Hình thức làm việc không hợp lệ")
	}
	if s.Status != statusActive && s.Status != statusInactive {
		return errors.New("Trạng thái không hợp lệ")
	}
	return nil
}

type Payroll struct {
	ID               string     `json:"id" db:"id"`
	OrganizationID   string     `json:"organization_id" db:"organization_id"`
	StaffID          string     `json:"staff_id" db:"staff_id"`
	PeriodMonth      *time.Time `json:"period_month" db:"period_month"`
	BaseSalary       float64    `json:"base_salary" db:"base_salary"`
	CommissionAmount float64    `json:"commission_amount" db:"commission_amount"`
	BonusAmount      float64    `json:"bonus_amount" db:"bonus_amount"`
	AdvanceAmount    float64    `json:"advance_amount" db:"advance_amount"`
	DeductionAmount  float64    `json:"deduction_amount" db:"deduction_amount"`
	NetPay           float64    `json:"net_pay" db:"net_pay"`
	Status           string     `json:"status" db:"status"`
	CashFlowID       *string    `json:"cash_flow_id" db:"cash_flow_id"`
	PaidAt           *time.Time `json:"paid_at" db:"paid_at"`
	CreatedBy        *string    `json:"created_by" db:"created_by"`
	ApprovedBy       *string    `json:"approved_by" db:"approved_by"`
	CreatedAt        *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        *time.Time `json:"updated_at" db:"updated_at"`
}

func (p *Payroll) Validate() error {
	switch p.Status {
	case PayrollStatusDraft, PayrollStatusApproved, PayrollStatusPaid, PayrollStatusCancelled:
	default:
		return errors.New("Trạng thái bảng lương không hợp lệ (draft | approved | paid | cancelled)")
	}
	if p.StaffID == "" {
		return errors.New("Thiếu nhân viên của bảng lương")
	}
	if p.PeriodMonth == nil {
		return errors.New("Thiếu kỳ lương (tháng)")
	}
	for _, v := range []struct {
		name  string
		value float64
	}{
		{"Lương cơ bản", p.BaseSalary},
		{"Hoa hồng", p.CommissionAmount},
		{"Thưởng", p.BonusAmount},
		{"Tạm ứng", p.AdvanceAmount},
		{"Khấu trừ", p.DeductionAmount},
		{"Thực nhận", p.NetPay},
	} {
		if v.value < 0 {
			return errors.New(v.name + " không được âm")
		}
	}
	return nil
}

// NetPayOf tính thực nhận chuẩn: base + commission + bonus - advance - deduction.
func NetPayOf(base, commission, bonus, advance, deduction float64) float64 {
	return base + commission + bonus - advance - deduction
}

type SalaryAdjustment struct {
	ID             string     `json:"id" db:"id"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	StaffID        string     `json:"staff_id" db:"staff_id"`
	PayrollID      *string    `json:"payroll_id" db:"payroll_id"`
	AdjustmentType string     `json:"adjustment_type" db:"adjustment_type"`
	Amount         float64    `json:"amount" db:"amount"`
	Reason         string     `json:"reason" db:"reason"`
	EffectiveDate  time.Time  `json:"effective_date" db:"effective_date"`
	CreatedAt      *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at" db:"updated_at"`
}

// StaffLeave đơn nghỉ phép / đi trễ của nhân viên.
type StaffLeave struct {
	ID             string     `json:"id" db:"id"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	StaffID        string     `json:"staff_id" db:"staff_id"`
	LeaveType      string     `json:"leave_type" db:"leave_type"`
	StartDate      time.Time  `json:"start_date" db:"start_date"`
	EndDate        time.Time  `json:"end_date" db:"end_date"`
	Note           string     `json:"note" db:"note"`
	CreatedAt      *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at" db:"updated_at"`
}

func (l *StaffLeave) Validate() error {
	switch l.LeaveType {
	case LeaveTypeAnnual, LeaveTypeExcused, LeaveTypeLate:
	default:
		return errors.New("Loại ngày nghỉ không hợp lệ (ANNUAL | EXCUSED | LATE)")
	}
	if l.StartDate.IsZero() || l.EndDate.IsZero() {
		return errors.New("Thiếu ngày bắt đầu hoặc ngày kết thúc")
	}
	if l.EndDate.Before(l.StartDate) {
		return errors.New("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu")
	}
	if l.EndDate.Sub(l.StartDate) > 366*24*time.Hour {
		return errors.New("Khoảng ngày nghỉ không được vượt quá 366 ngày")
	}
	return nil
}
