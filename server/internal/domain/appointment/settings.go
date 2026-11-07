package appointment

import (
	"context"
	"errors"
	"math"
	"time"
)

// ErrAppointmentSettingsNotFound dùng khi org chưa có dòng cấu hình.
var ErrAppointmentSettingsNotFound = errors.New("appointment settings not found")

// AppointmentSettings là cấu hình đặt lịch + quy tắc cọc theo no-show của 1 salon.
type AppointmentSettings struct {
	OrganizationID      string
	AllowOnlineBooking  bool
	AutoConfirm         bool
	SlotStepMinutes     int
	MaxPerSlot          int
	MinLeadMinutes      int
	MaxAdvanceDays      int
	AllowCancel         bool
	CancelBeforeHours   int
	MaxCancellations    int
	AllowReschedule     bool
	RescheduleBeforeHrs int

	DepositEnabled     bool
	NoShowThreshold    int
	NoShowLookbackDays int
	// DepositPercent là tỷ lệ cọc theo giá trị đơn (0–100).
	DepositPercent float64
	// DepositMaxAmount là mức cọc tối đa; 0 = không giới hạn.
	DepositMaxAmount float64
}

// DefaultAppointmentSettings trả cấu hình mặc định (khớp DEFAULT trong migration).
func DefaultAppointmentSettings(orgID string) *AppointmentSettings {
	return &AppointmentSettings{
		OrganizationID:      orgID,
		AllowOnlineBooking:  true,
		AutoConfirm:         false,
		SlotStepMinutes:     30,
		MaxPerSlot:          2,
		MinLeadMinutes:      60,
		MaxAdvanceDays:      30,
		AllowCancel:         true,
		CancelBeforeHours:   4,
		MaxCancellations:    3,
		AllowReschedule:     true,
		RescheduleBeforeHrs: 2,
		DepositEnabled:      true,
		NoShowThreshold:     2,
		NoShowLookbackDays:  180,
		DepositPercent:      30,
		DepositMaxAmount:    0,
	}
}

// RequiredDeposit tính số tiền cọc phải thu cho khách có noShowCount lần không đến.
// Trả về (số tiền, true) nếu phải cọc; ngược lại (0, false).
func (s *AppointmentSettings) RequiredDeposit(totalAmount float64, noShowCount int) (float64, bool) {
	if s == nil || !s.DepositEnabled {
		return 0, false
	}
	if s.NoShowThreshold <= 0 || noShowCount < s.NoShowThreshold {
		return 0, false
	}

	var amount float64
	amount = totalAmount * s.DepositPercent / 100

	amount = math.Round(amount*100) / 100
	if amount <= 0 {
		return 0, false
	}
	if totalAmount > 0 && amount > totalAmount {
		amount = totalAmount
	}
	if s.DepositMaxAmount > 0 && amount > s.DepositMaxAmount {
		amount = s.DepositMaxAmount
	}
	return amount, true
}

// SettingsRepository đọc cấu hình đặt lịch + đếm no_show của khách.
type SettingsRepository interface {
	GetAppointmentSettings(ctx context.Context, orgID string) (*AppointmentSettings, error)
	CountCustomerNoShows(ctx context.Context, orgID, customerID string, since time.Time) (int, error)
}
