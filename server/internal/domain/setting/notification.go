package setting

import (
	"errors"
	"time"
)

// NotificationSettings là cấu hình tab Thông báo (bảng organization_notification_settings).
type NotificationSettings struct {
	AppointmentReminder bool   `json:"appointment_reminder" db:"appointment_reminder"`
	NewBookingAlert     bool   `json:"new_booking_alert" db:"new_booking_alert"`
	LowStockAlert       bool   `json:"low_stock_alert" db:"low_stock_alert"`
	DailyRevenueReport  bool   `json:"daily_revenue_report" db:"daily_revenue_report"`
	BirthdayVoucher     bool   `json:"birthday_voucher" db:"birthday_voucher"`
	ReminderHoursBefore int    `json:"reminder_hours_before" db:"reminder_hours_before"`
	LowStockThreshold   int    `json:"low_stock_threshold" db:"low_stock_threshold"`
	DailyReportTime     string `json:"daily_report_time" db:"daily_report_time"`
}

// DefaultNotificationSettings khớp DEFAULT trong migration organization_notification_settings.
func DefaultNotificationSettings() *NotificationSettings {
	return &NotificationSettings{
		AppointmentReminder: true,
		NewBookingAlert:     true,
		LowStockAlert:       true,
		DailyRevenueReport:  true,
		BirthdayVoucher:     true,
		ReminderHoursBefore: 2,
		LowStockThreshold:   5,
		DailyReportTime:     "22:00",
	}
}

// Validate kiểm tra cấu hình thông báo trước khi ghi DB.
func (s *NotificationSettings) Validate() error {
	if s.ReminderHoursBefore < 0 || s.ReminderHoursBefore > 168 {
		return errors.New("Thời gian nhắc lịch trước phải nằm trong khoảng 0–168 giờ")
	}
	if s.LowStockThreshold < 1 {
		return errors.New("Ngưỡng cảnh báo tồn kho phải lớn hơn 0")
	}
	if _, err := time.Parse("15:04", s.DailyReportTime); err != nil {
		return errors.New("Giờ gửi báo cáo phải đúng định dạng HH:MM")
	}
	return nil
}

// ErrNotificationSettingsNotFound khi org chưa có dòng cấu hình thông báo.
var ErrNotificationSettingsNotFound = errors.New("notification settings not found")
