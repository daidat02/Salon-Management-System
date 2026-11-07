package setting

import (
	"context"

	domain "github.com/daidat02/server/internal/domain/setting"
	"github.com/stretchr/testify/mock"
)

type MockSettingRepository struct {
	mock.Mock
}

func (m *MockSettingRepository) GetGeneralSettings(ctx context.Context, orgID string) (*domain.GeneralSettingsResponse, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.GeneralSettingsResponse), args.Error(1)
}

func (m *MockSettingRepository) GetBookingSettings(ctx context.Context, orgID string) (*domain.BookingSettings, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.BookingSettings), args.Error(1)
}

func (m *MockSettingRepository) UpdateBookingSettings(ctx context.Context, orgID string, settings *domain.BookingSettings) error {
	args := m.Called(ctx, orgID, settings)
	return args.Error(0)
}

func (m *MockSettingRepository) GetReceiptSettings(ctx context.Context, orgID string) (*domain.ReceiptSettings, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ReceiptSettings), args.Error(1)
}

func (m *MockSettingRepository) ListPaymentMethods(ctx context.Context, orgID string) ([]domain.PaymentMethod, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]domain.PaymentMethod), args.Error(1)
}

func (m *MockSettingRepository) GetPaymentMethodByID(ctx context.Context, orgID string, code *string) (*domain.PaymentMethod, error) {
	args := m.Called(ctx, orgID, code)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.PaymentMethod), args.Error(1)
}

func (m *MockSettingRepository) GetNotificationSettings(ctx context.Context, orgID string) (*domain.NotificationSettings, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NotificationSettings), args.Error(1)
}

func (m *MockSettingRepository) UpdateNotificationSettings(ctx context.Context, orgID string, settings *domain.NotificationSettings) error {
	args := m.Called(ctx, orgID, settings)
	return args.Error(0)
}

func (m *MockSettingRepository) UpdateGeneralSettings(ctx context.Context, orgID string, settings *domain.GeneralSettingsResponse) error {
	args := m.Called(ctx, orgID, settings)
	return args.Error(0)
}

func (m *MockSettingRepository) UpdatePaymentSettings(ctx context.Context, orgID string, settings *domain.PaymentSettingsResponse) error {
	args := m.Called(ctx, orgID, settings)
	return args.Error(0)
}
