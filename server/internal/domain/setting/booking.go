package setting

import "errors"

// BookingSettings là cấu hình tab Lịch hẹn (bảng appointment_settings).
type BookingSettings struct {
	AllowOnlineBooking       bool    `json:"allow_online_booking" db:"allow_online_booking"`
	AutoConfirm              bool    `json:"auto_confirm" db:"auto_confirm"`
	SlotStepMinutes          int     `json:"slot_step_minutes" db:"slot_step_minutes"`
	MaxPerSlot               int     `json:"max_per_slot" db:"max_per_slot"`
	MinLeadMinutes           int     `json:"min_lead_minutes" db:"min_lead_minutes"`
	MaxAdvanceDays           int     `json:"max_advance_days" db:"max_advance_days"`
	AllowCancel              bool    `json:"allow_cancel" db:"allow_cancel"`
	CancelBeforeHours        int     `json:"cancel_before_hours" db:"cancel_before_hours"`
	MaxCancellationsPerMonth int     `json:"max_cancellations_per_month" db:"max_cancellations_per_month"`
	AllowReschedule          bool    `json:"allow_reschedule" db:"allow_reschedule"`
	RescheduleBeforeHours    int     `json:"reschedule_before_hours" db:"reschedule_before_hours"`
	DepositEnabled           bool    `json:"deposit_enabled" db:"deposit_enabled"`
	NoShowThreshold          int     `json:"no_show_threshold" db:"no_show_threshold"`
	NoShowLookbackDays       int     `json:"no_show_lookback_days" db:"no_show_lookback_days"`
	DepositPercent           float64 `json:"deposit_percent" db:"deposit_percent"`
	DepositMaxAmount         float64 `json:"deposit_max_amount" db:"deposit_max_amount"`
}

// DefaultBookingSettings khớp DEFAULT trong migration appointment_settings.
func DefaultBookingSettings() *BookingSettings {
	return &BookingSettings{
		AllowOnlineBooking:       true,
		AutoConfirm:              false,
		SlotStepMinutes:          30,
		MaxPerSlot:               2,
		MinLeadMinutes:           60,
		MaxAdvanceDays:           30,
		AllowCancel:              true,
		CancelBeforeHours:        4,
		MaxCancellationsPerMonth: 3,
		AllowReschedule:          true,
		RescheduleBeforeHours:    2,
		DepositEnabled:           true,
		NoShowThreshold:          2,
		NoShowLookbackDays:       180,
		DepositPercent:           30,
		DepositMaxAmount:         0,
	}
}

// Validate kiểm tra cấu hình lịch hẹn trước khi ghi DB.
func (s *BookingSettings) Validate() error {
	switch s.SlotStepMinutes {
	case 15, 30, 45, 60:
	default:
		return errors.New("Bước thời gian đặt lịch phải là 15, 30, 45 hoặc 60 phút")
	}
	if s.MaxPerSlot < 1 {
		return errors.New("Số khách mỗi khung giờ phải lớn hơn 0")
	}
	if s.MinLeadMinutes < 0 {
		return errors.New("Thời gian đặt trước tối thiểu không được âm")
	}
	if s.MaxAdvanceDays < 1 {
		return errors.New("Số ngày đặt trước tối đa phải lớn hơn 0")
	}
	if s.CancelBeforeHours < 0 {
		return errors.New("Hạn hủy trước không được âm")
	}
	if s.MaxCancellationsPerMonth < 0 {
		return errors.New("Số lần hủy tối đa mỗi tháng không được âm")
	}
	if s.RescheduleBeforeHours < 0 {
		return errors.New("Hạn đổi lịch trước không được âm")
	}
	if s.NoShowThreshold < 1 {
		return errors.New("Ngưỡng số lần không đến phải lớn hơn 0")
	}
	if s.NoShowLookbackDays < 1 {
		return errors.New("Số ngày tra cứu no-show phải lớn hơn 0")
	}
	if s.DepositPercent < 0 || s.DepositPercent > 100 {
		return errors.New("Tỷ lệ cọc phải nằm trong khoảng 0–100")
	}
	if s.DepositMaxAmount < 0 {
		return errors.New("Mức cọc tối đa không được âm")
	}
	if s.DepositEnabled && s.DepositPercent <= 0 {
		return errors.New("Tỷ lệ cọc phải lớn hơn 0 khi bật cọc")
	}
	return nil
}

// ErrBookingSettingsNotFound khi org chưa có dòng cấu hình lịch hẹn.
var ErrBookingSettingsNotFound = errors.New("booking settings not found")
