package setting

import (
	"context"
	"errors"
	"log"

	domain "github.com/daidat02/server/internal/domain/setting"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
)

type SettingUseCase struct {
	repo domain.SettingRepository
}

func NewSettingUseCase(repo domain.SettingRepository) *SettingUseCase {
	return &SettingUseCase{repo: repo}
}

// GetGeneralSettings lấy thông tin salon + giờ làm việc của tab Cài đặt chung.
func (u *SettingUseCase) GetGeneralSettings(ctx context.Context) (*domain.GeneralSettingsResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	result, err := u.repo.GetGeneralSettings(ctx, orgID)
	if err != nil {
		if errors.Is(err, domain.ErrGeneralSettingsNotFound) {
			return nil, apperror.New(404, "Không tìm thấy tổ chức", err)
		}
		log.Println("Error getting general settings:", err)
		return nil, apperror.New(500, "Lỗi khi lấy cài đặt chung", err)
	}
	result.Payroll.Normalize()
	return result, nil
}

// GetBookingSettings lấy cấu hình tab Lịch hẹn; chưa có thì trả mặc định.
func (u *SettingUseCase) GetBookingSettings(ctx context.Context) (*domain.BookingSettings, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	result, err := u.repo.GetBookingSettings(ctx, orgID)
	if err != nil {
		if errors.Is(err, domain.ErrBookingSettingsNotFound) {
			return domain.DefaultBookingSettings(), nil
		}
		log.Println("Error getting booking settings:", err)
		return nil, apperror.New(500, "Lỗi khi lấy cài đặt lịch hẹn", err)
	}
	return result, nil
}

// UpdateBookingSettings validate và upsert cấu hình tab Lịch hẹn.
func (u *SettingUseCase) UpdateBookingSettings(ctx context.Context, req *domain.BookingSettings) (*domain.BookingSettings, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if req == nil {
		return nil, apperror.New(400, "Dữ liệu không hợp lệ", nil)
	}
	if err := req.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	if err := u.repo.UpdateBookingSettings(ctx, orgID, req); err != nil {
		log.Println("Error updating booking settings:", err)
		return nil, apperror.New(500, "Lỗi khi cập nhật cài đặt lịch hẹn", err)
	}
	return req, nil
}

func (u *SettingUseCase) GetPaymentSetting(ctx context.Context, orgID string) (*domain.PaymentSettingsResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	receiptSettings, err := u.repo.GetReceiptSettings(ctx, orgID)
	if err != nil {
		if errors.Is(err, domain.ErrReceiptSettingsNotFound) {
			receiptSettings = domain.DefaultReceiptSettings()
		} else {
			log.Println("Error getting receipt settings:", err)
			return nil, apperror.New(500, "Lỗi khi lấy cài đặt in hóa đơn", err)
		}
	}

	paymentMethods, err := u.repo.ListPaymentMethods(ctx, orgID)
	if err != nil {
		log.Println("Error listing payment methods:", err)
		return nil, apperror.New(500, "Lỗi khi lấy danh sách phương thức thanh toán", err)
	}

	return &domain.PaymentSettingsResponse{
		Receipt:        *receiptSettings,
		PaymentMethods: paymentMethods,
	}, nil
}

// GetNotificationSettings lấy cấu hình tab Thông báo; chưa có thì trả mặc định.
func (u *SettingUseCase) GetNotificationSettings(ctx context.Context) (*domain.NotificationSettings, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	result, err := u.repo.GetNotificationSettings(ctx, orgID)
	if err != nil {
		if errors.Is(err, domain.ErrNotificationSettingsNotFound) {
			return domain.DefaultNotificationSettings(), nil
		}
		log.Println("Error getting notification settings:", err)
		return nil, apperror.New(500, "Lỗi khi lấy cài đặt thông báo", err)
	}
	return result, nil
}

// UpdateNotificationSettings validate và upsert cấu hình tab Thông báo.
func (u *SettingUseCase) UpdateNotificationSettings(ctx context.Context, req *domain.NotificationSettings) (*domain.NotificationSettings, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if req == nil {
		return nil, apperror.New(400, "Dữ liệu không hợp lệ", nil)
	}
	if err := req.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	if err := u.repo.UpdateNotificationSettings(ctx, orgID, req); err != nil {
		log.Println("Error updating notification settings:", err)
		return nil, apperror.New(500, "Lỗi khi cập nhật cài đặt thông báo", err)
	}
	return req, nil
}

// UpdateGeneralSettings validate và cập nhật thông tin salon + giờ làm việc.
func (u *SettingUseCase) UpdateGeneralSettings(ctx context.Context, req *domain.GeneralSettingsResponse) (*domain.GeneralSettingsResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if req == nil {
		return nil, apperror.New(400, "Dữ liệu không hợp lệ", nil)
	}
	req.Payroll.Normalize()
	if err := req.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	if err := u.repo.UpdateGeneralSettings(ctx, orgID, req); err != nil {
		if errors.Is(err, domain.ErrGeneralSettingsNotFound) {
			return nil, apperror.New(404, "Không tìm thấy tổ chức", err)
		}
		log.Println("Error updating general settings:", err)
		return nil, apperror.New(500, "Lỗi khi cập nhật cài đặt chung", err)
	}
	return req, nil
}

// UpdatePaymentSettings validate và cập nhật cấu hình hóa đơn + phương thức thanh toán.
func (u *SettingUseCase) UpdatePaymentSettings(ctx context.Context, req *domain.PaymentSettingsResponse) (*domain.PaymentSettingsResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if req == nil {
		return nil, apperror.New(400, "Dữ liệu không hợp lệ", nil)
	}
	if err := req.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	if err := u.repo.UpdatePaymentSettings(ctx, orgID, req); err != nil {
		log.Println("Error updating payment settings:", err)
		return nil, apperror.New(500, "Lỗi khi cập nhật cài đặt thanh toán", err)
	}
	return req, nil
}
