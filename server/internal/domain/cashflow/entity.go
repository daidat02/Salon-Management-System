package cashflow

import (
	"errors"
	"time"
)

// Loại phiếu thu/chi — khớp CHECK kind IN ('income','expense') ở migration 000001.
const (
	KindIncome  = "income"
	KindExpense = "expense"
)

// Loại danh mục theo bản chất P&L — khớp CHECK category_type
// IN ('revenue','operating_expense','non_pnl') ở migration 000001.
// kind (income|expense) chỉ hướng dòng tiền; category_type quyết định
// khoản đó có vào báo cáo lãi/lỗ không (non_pnl: nạp/rút vốn, vay/trả nợ).
const (
	CategoryTypeRevenue          = "revenue"
	CategoryTypeOperatingExpense = "operating_expense"
	CategoryTypeNonPnL           = "non_pnl"
)

// Trạng thái phiếu — khớp CHECK status IN ('pending','approved','cancelled').
const (
	VoucherStatusPending   = "pending"
	VoucherStatusApproved  = "approved"
	VoucherStatusCancelled = "cancelled"
)

// Loại quỹ — khớp CHECK fund_type IN ('cash','bank','e_wallet').
const (
	FundTypeCash    = "cash"
	FundTypeBank    = "bank"
	FundTypeEWallet = "e_wallet"
)

// Trạng thái bảng lương — khớp CHECK status IN ('draft','approved','paid','cancelled').
const (
	PayrollStatusDraft     = "draft"
	PayrollStatusApproved  = "approved"
	PayrollStatusPaid      = "paid"
	PayrollStatusCancelled = "cancelled"
)

// Fund là nguồn tiền / quỹ: két tiền mặt, TK ngân hàng, ví điện tử.
// Số dư KHÔNG lưu trực tiếp — tính lúc query:
// opening_balance + Σ(thu approved) - Σ(chi approved) theo fund_id.
type Fund struct {
	ID              string     `json:"id" db:"id"`
	OrganizationID  string     `json:"organization_id" db:"organization_id"`
	Code            string     `json:"code" db:"code"`
	Name            string     `json:"name" db:"name"`
	FundType        string     `json:"fund_type" db:"fund_type"`
	BankName        *string    `json:"bank_name" db:"bank_name"`
	AccountNumber   *string    `json:"account_number" db:"account_number"`
	OpeningBalance  float64    `json:"opening_balance" db:"opening_balance"`
	IsActive        bool       `json:"is_active" db:"is_active"`
	CreatedAt       *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       *time.Time `json:"updated_at" db:"updated_at"`
}

func (f *Fund) Validate() error {
	switch f.FundType {
	case FundTypeCash, FundTypeBank, FundTypeEWallet:
	default:
		return errors.New("Loại quỹ không hợp lệ (cash | bank | e_wallet)")
	}
	if f.Code == "" {
		return errors.New("Mã quỹ không được để trống")
	}
	if f.Name == "" {
		return errors.New("Tên quỹ không được để trống")
	}
	if f.OpeningBalance < 0 {
		return errors.New("Số dư đầu kỳ không được âm")
	}
	return nil
}

// CashFlowCategory là danh mục thu/chi (is_system=true: seed hệ thống, không cho xóa).
type CashFlowCategory struct {
	ID             string     `json:"id" db:"id"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	Code           string     `json:"code" db:"code"`
	Name           string     `json:"name" db:"name"`
	Kind           string     `json:"kind" db:"kind"`
	CategoryType   string     `json:"category_type" db:"category_type"`
	IsSystem       bool       `json:"is_system" db:"is_system"`
	SortOrder      int        `json:"sort_order" db:"sort_order"`
	IsActive       bool       `json:"is_active" db:"is_active"`
	CreatedAt      *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at" db:"updated_at"`
}

func (c *CashFlowCategory) Validate() error {
	switch c.Kind {
	case KindIncome, KindExpense:
	default:
		return errors.New("Loại danh mục không hợp lệ (income | expense)")
	}
	switch c.CategoryType {
	case CategoryTypeRevenue, CategoryTypeOperatingExpense, CategoryTypeNonPnL:
	default:
		return errors.New("Bản chất danh mục không hợp lệ (revenue | operating_expense | non_pnl)")
	}
	if c.Code == "" {
		return errors.New("Mã danh mục không được để trống")
	}
	if c.Name == "" {
		return errors.New("Tên danh mục không được để trống")
	}
	return nil
}

// CashFlow là phiếu thu (PT-...) / phiếu chi (PC-...).
// Bất biến số dư: chỉ phiếu approved chạm số dư quỹ; sửa sai bằng phiếu
// điều chỉnh đảo, không UPDATE amount của phiếu đã duyệt.
type CashFlow struct {
	ID                  string     `json:"id" db:"id"`
	OrganizationID      string     `json:"organization_id" db:"organization_id"`
	Code                string     `json:"code" db:"code"`
	Kind                string     `json:"kind" db:"kind"`
	CategoryID          *string    `json:"category_id" db:"category_id"`
	FundID              string     `json:"fund_id" db:"fund_id"`
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
	DeletedAt           *time.Time `json:"deleted_at" db:"deleted_at"`
}

func (v *CashFlow) Validate() error {
	switch v.Kind {
	case KindIncome, KindExpense:
	default:
		return errors.New("Loại phiếu không hợp lệ (income | expense)")
	}
	switch v.Status {
	case VoucherStatusPending, VoucherStatusApproved, VoucherStatusCancelled:
	default:
		return errors.New("Trạng thái phiếu không hợp lệ (pending | approved | cancelled)")
	}
	if v.Code == "" {
		return errors.New("Mã phiếu không được để trống")
	}
	if v.FundID == "" {
		return errors.New("Phiếu thu/chi phải hạch toán vào một quỹ")
	}
	if v.Amount <= 0 {
		return errors.New("Số tiền phiếu phải lớn hơn 0")
	}
	if v.OccurredAt == nil {
		return errors.New("Thiếu ngày phát sinh của phiếu")
	}
	return nil
}

// Payroll là bảng lương một nhân viên trong một kỳ tháng.
// net_pay do app tính: base + commission + bonus - advance - deduction.
type Payroll struct {
	ID                string     `json:"id" db:"id"`
	OrganizationID    string     `json:"organization_id" db:"organization_id"`
	StaffID           string     `json:"staff_id" db:"staff_id"`
	PeriodMonth       *time.Time `json:"period_month" db:"period_month"`
	BaseSalary        float64    `json:"base_salary" db:"base_salary"`
	CommissionAmount  float64    `json:"commission_amount" db:"commission_amount"`
	BonusAmount       float64    `json:"bonus_amount" db:"bonus_amount"`
	AdvanceAmount     float64    `json:"advance_amount" db:"advance_amount"`
	DeductionAmount   float64    `json:"deduction_amount" db:"deduction_amount"`
	NetPay            float64    `json:"net_pay" db:"net_pay"`
	Status            string     `json:"status" db:"status"`
	CashFlowID        *string    `json:"cash_flow_id" db:"cash_flow_id"`
	PaidAt            *time.Time `json:"paid_at" db:"paid_at"`
	CreatedBy         *string    `json:"created_by" db:"created_by"`
	ApprovedBy        *string    `json:"approved_by" db:"approved_by"`
	CreatedAt         *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         *time.Time `json:"updated_at" db:"updated_at"`
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
