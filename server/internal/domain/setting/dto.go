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
}

// WorkingHourDay là lịch làm việc của 1 thứ trong tuần (1=T2 .. 7=CN).
type WorkingHourDay struct {
	Weekday    int     `json:"weekday"`
	IsOpen     bool    `json:"is_open"`
	OpenTime   string  `json:"open_time"`
	CloseTime  string  `json:"close_time"`
	BreakStart *string `json:"break_start"`
	BreakEnd   *string `json:"break_end"`
	Note       *string `json:"note"`
}

// GeneralSettingsResponse là dữ liệu tab Cài đặt chung.
type GeneralSettingsResponse struct {
	Organization OrganizationInfo `json:"organization"`
	WorkingHours []WorkingHourDay `json:"working_hours"`
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
