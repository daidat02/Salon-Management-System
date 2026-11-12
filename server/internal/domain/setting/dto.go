package setting

import (
	"context"
	"errors"
)

// ErrGeneralSettingsNotFound khi không tìm thấy organization.
var ErrGeneralSettingsNotFound = errors.New("general settings not found")

// OrganizationInfo là thông tin nhận diện salon trong tab Cài đặt chung.
type OrganizationInfo struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Slug     string  `json:"slug"`
	Phone    *string `json:"phone"`
	Email    *string `json:"email"`
	Website  *string `json:"website"`
	Address  *string `json:"address"`
	TaxCode  *string `json:"tax_code"`
	Slogan   *string `json:"slogan"`
	LogoURL  *string `json:"logo_url"`
	Timezone string  `json:"timezone"`
	Status   string  `json:"status"`
	IsDemo   bool    `json:"is_demo"`
}

// WorkingHourDay chỉ còn trạng thái mở/đóng của 1 thứ (1=T2 .. 7=CN).
// Khung giờ dùng chung được lưu ở WorkingHours.
type WorkingHourDay struct {
	Weekday int  `json:"weekday"`
	IsOpen  bool `json:"is_open"`
}

// WorkingHours là khung giờ làm việc dùng chung cho mọi ngày mở cửa.
// Các mốc thời gian tính bằng số phút kể từ 00:00 để so trực tiếp với dữ liệu
// giờ hẹn gửi lên (không phụ thuộc timezone).
type WorkingHours struct {
	OpenTimeMinutes   int              `json:"open_time_minutes"`
	CloseTimeMinutes  int              `json:"close_time_minutes"`
	BreakStartMinutes *int             `json:"break_start_minutes"`
	BreakEndMinutes   *int             `json:"break_end_minutes"`
	Days              []WorkingHourDay `json:"days"`
}

// GeneralSettingsResponse là dữ liệu tab Cài đặt chung.
type GeneralSettingsResponse struct {
	Organization OrganizationInfo `json:"organization"`
	WorkingHours WorkingHours     `json:"working_hours"`
}

type SettingRepository interface {
	GetGeneralSettings(ctx context.Context, orgID string) (*GeneralSettingsResponse, error)
	UpdateGeneralSettings(ctx context.Context, orgID string, settings *GeneralSettingsResponse) error
	GetBookingSettings(ctx context.Context, orgID string) (*BookingSettings, error)
	UpdateBookingSettings(ctx context.Context, orgID string, settings *BookingSettings) error
	GetNotificationSettings(ctx context.Context, orgID string) (*NotificationSettings, error)
	UpdateNotificationSettings(ctx context.Context, orgID string, settings *NotificationSettings) error
	GetReceiptSettings(ctx context.Context, orgID string) (*ReceiptSettings, error)
	UpdatePaymentSettings(ctx context.Context, orgID string, settings *PaymentSettingsResponse) error
	ListPaymentMethods(ctx context.Context, orgID string) ([]PaymentMethod, error)
	GetPaymentMethodByID(ctx context.Context, orgID string, code *string) (*PaymentMethod, error)
}
