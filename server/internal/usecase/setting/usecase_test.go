package setting

import (
	"context"
	"errors"
	"testing"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	domain "github.com/daidat02/server/internal/domain/setting"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func withOrgCtx(orgID string) context.Context {
	return context.WithValue(context.Background(), middlewares.OrgIdKey, orgID)
}

func TestSettingUseCase_GetGeneralSettings(t *testing.T) {
	t.Run("Thành công - trả thông tin org + giờ làm việc", func(t *testing.T) {
		repo := new(MockSettingRepository)
		expected := &domain.GeneralSettingsResponse{
			Organization: domain.OrganizationInfo{ID: "org-123", Name: "Salon A"},
			WorkingHours: domain.DefaultWorkingHours(),
		}
		repo.On("GetGeneralSettings", mock.Anything, "org-123").Return(expected, nil).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetGeneralSettings(withOrgCtx("org-123"))

		assert.NoError(t, err)
		assert.Equal(t, "Salon A", res.Organization.Name)
		assert.Len(t, res.WorkingHours.Days, 7)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - không tìm thấy org", func(t *testing.T) {
		repo := new(MockSettingRepository)
		repo.On("GetGeneralSettings", mock.Anything, "org-123").
			Return(nil, domain.ErrGeneralSettingsNotFound).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetGeneralSettings(withOrgCtx("org-123"))

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 404, appErr.StatusCode)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - thiếu org trong context", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		res, err := uc.GetGeneralSettings(context.Background())

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - lỗi repository", func(t *testing.T) {
		repo := new(MockSettingRepository)
		repo.On("GetGeneralSettings", mock.Anything, "org-123").
			Return(nil, errors.New("db down")).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetGeneralSettings(withOrgCtx("org-123"))

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 500, appErr.StatusCode)
		repo.AssertExpectations(t)
	})
}

func TestSettingUseCase_GetBookingSettings(t *testing.T) {
	t.Run("Thành công", func(t *testing.T) {
		repo := new(MockSettingRepository)
		expected := domain.DefaultBookingSettings()
		repo.On("GetBookingSettings", mock.Anything, "org-123").Return(expected, nil).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetBookingSettings(withOrgCtx("org-123"))

		assert.NoError(t, err)
		assert.Equal(t, expected.SlotStepMinutes, res.SlotStepMinutes)
		repo.AssertExpectations(t)
	})

	t.Run("Chưa có cấu hình - trả mặc định", func(t *testing.T) {
		repo := new(MockSettingRepository)
		repo.On("GetBookingSettings", mock.Anything, "org-123").
			Return(nil, domain.ErrBookingSettingsNotFound).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetBookingSettings(withOrgCtx("org-123"))

		assert.NoError(t, err)
		assert.Equal(t, domain.DefaultBookingSettings(), res)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - thiếu org trong context", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		res, err := uc.GetBookingSettings(context.Background())

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - lỗi repository", func(t *testing.T) {
		repo := new(MockSettingRepository)
		repo.On("GetBookingSettings", mock.Anything, "org-123").
			Return(nil, errors.New("db down")).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetBookingSettings(withOrgCtx("org-123"))

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 500, appErr.StatusCode)
		repo.AssertExpectations(t)
	})
}

func TestSettingUseCase_UpdateBookingSettings(t *testing.T) {
	valid := func() *domain.BookingSettings { return domain.DefaultBookingSettings() }

	t.Run("Thành công", func(t *testing.T) {
		repo := new(MockSettingRepository)
		req := valid()
		repo.On("UpdateBookingSettings", mock.Anything, "org-123", req).Return(nil).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.UpdateBookingSettings(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.Equal(t, req, res)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - bước thời gian không hợp lệ", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		req := valid()
		req.SlotStepMinutes = 10

		res, err := uc.UpdateBookingSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - bật cọc nhưng tỷ lệ bằng 0", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		req := valid()
		req.DepositEnabled = true
		req.DepositPercent = 0

		res, err := uc.UpdateBookingSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - req nil", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		res, err := uc.UpdateBookingSettings(withOrgCtx("org-123"), nil)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - thiếu org trong context", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		res, err := uc.UpdateBookingSettings(context.Background(), valid())

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - lỗi repository", func(t *testing.T) {
		repo := new(MockSettingRepository)
		req := valid()
		repo.On("UpdateBookingSettings", mock.Anything, "org-123", req).
			Return(errors.New("db down")).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.UpdateBookingSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 500, appErr.StatusCode)
		repo.AssertExpectations(t)
	})
}

func TestSettingUseCase_GetPaymentSetting(t *testing.T) {
	t.Run("Thành công - có cấu hình hóa đơn và phương thức thanh toán", func(t *testing.T) {
		repo := new(MockSettingRepository)
		receipt := domain.DefaultReceiptSettings()
		methods := []domain.PaymentMethod{
			{ID: "pm-1", Code: "cash", Name: "Tiền mặt", IsActive: true},
			{ID: "pm-2", Code: "transfer", Name: "Chuyển khoản", IsActive: true},
		}
		repo.On("GetReceiptSettings", mock.Anything, "org-123").Return(receipt, nil).Once()
		repo.On("ListPaymentMethods", mock.Anything, "org-123").Return(methods, nil).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetPaymentSetting(withOrgCtx("org-123"), "ignored")

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, *receipt, res.Receipt)
		assert.Len(t, res.PaymentMethods, 2)
		assert.Equal(t, "cash", res.PaymentMethods[0].Code)
		repo.AssertExpectations(t)
	})

	t.Run("Chưa có cấu hình hóa đơn - dùng mặc định", func(t *testing.T) {
		repo := new(MockSettingRepository)
		repo.On("GetReceiptSettings", mock.Anything, "org-123").
			Return(nil, domain.ErrReceiptSettingsNotFound).Once()
		repo.On("ListPaymentMethods", mock.Anything, "org-123").
			Return([]domain.PaymentMethod{}, nil).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetPaymentSetting(withOrgCtx("org-123"), "ignored")

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, *domain.DefaultReceiptSettings(), res.Receipt)
		assert.Empty(t, res.PaymentMethods)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - thiếu org trong context", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		res, err := uc.GetPaymentSetting(context.Background(), "ignored")

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - lỗi lấy cấu hình hóa đơn", func(t *testing.T) {
		repo := new(MockSettingRepository)
		repo.On("GetReceiptSettings", mock.Anything, "org-123").
			Return(nil, errors.New("db down")).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetPaymentSetting(withOrgCtx("org-123"), "ignored")

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 500, appErr.StatusCode)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - lỗi lấy danh sách phương thức thanh toán", func(t *testing.T) {
		repo := new(MockSettingRepository)
		repo.On("GetReceiptSettings", mock.Anything, "org-123").
			Return(domain.DefaultReceiptSettings(), nil).Once()
		repo.On("ListPaymentMethods", mock.Anything, "org-123").
			Return(nil, errors.New("db down")).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetPaymentSetting(withOrgCtx("org-123"), "ignored")

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 500, appErr.StatusCode)
		repo.AssertExpectations(t)
	})
}

func TestSettingUseCase_GetNotificationSettings(t *testing.T) {
	t.Run("Thành công", func(t *testing.T) {
		repo := new(MockSettingRepository)
		expected := domain.DefaultNotificationSettings()
		repo.On("GetNotificationSettings", mock.Anything, "org-123").Return(expected, nil).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetNotificationSettings(withOrgCtx("org-123"))

		assert.NoError(t, err)
		assert.Equal(t, expected, res)
		repo.AssertExpectations(t)
	})

	t.Run("Chưa có cấu hình - trả mặc định", func(t *testing.T) {
		repo := new(MockSettingRepository)
		repo.On("GetNotificationSettings", mock.Anything, "org-123").
			Return(nil, domain.ErrNotificationSettingsNotFound).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetNotificationSettings(withOrgCtx("org-123"))

		assert.NoError(t, err)
		assert.Equal(t, domain.DefaultNotificationSettings(), res)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - thiếu org trong context", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		res, err := uc.GetNotificationSettings(context.Background())

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - lỗi repository", func(t *testing.T) {
		repo := new(MockSettingRepository)
		repo.On("GetNotificationSettings", mock.Anything, "org-123").
			Return(nil, errors.New("db down")).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.GetNotificationSettings(withOrgCtx("org-123"))

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 500, appErr.StatusCode)
		repo.AssertExpectations(t)
	})
}

func TestSettingUseCase_UpdateNotificationSettings(t *testing.T) {
	valid := func() *domain.NotificationSettings { return domain.DefaultNotificationSettings() }

	t.Run("Thành công", func(t *testing.T) {
		repo := new(MockSettingRepository)
		req := valid()
		repo.On("UpdateNotificationSettings", mock.Anything, "org-123", req).Return(nil).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.UpdateNotificationSettings(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.Equal(t, req, res)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - giờ nhắc ngoài khoảng 0-168", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		req := valid()
		req.ReminderHoursBefore = 169

		res, err := uc.UpdateNotificationSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - ngưỡng tồn kho bằng 0", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		req := valid()
		req.LowStockThreshold = 0

		res, err := uc.UpdateNotificationSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - giờ báo cáo sai định dạng", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		req := valid()
		req.DailyReportTime = "25:00"

		res, err := uc.UpdateNotificationSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - req nil", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		res, err := uc.UpdateNotificationSettings(withOrgCtx("org-123"), nil)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - lỗi repository", func(t *testing.T) {
		repo := new(MockSettingRepository)
		req := valid()
		repo.On("UpdateNotificationSettings", mock.Anything, "org-123", req).
			Return(errors.New("db down")).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.UpdateNotificationSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 500, appErr.StatusCode)
		repo.AssertExpectations(t)
	})
}

func TestSettingUseCase_UpdateGeneralSettings(t *testing.T) {
	valid := func() *domain.GeneralSettingsResponse {
		return &domain.GeneralSettingsResponse{
			Organization: domain.OrganizationInfo{ID: "org-123", Name: "Salon A"},
			WorkingHours: domain.DefaultWorkingHours(),
		}
	}

	t.Run("Thành công", func(t *testing.T) {
		repo := new(MockSettingRepository)
		req := valid()
		repo.On("UpdateGeneralSettings", mock.Anything, "org-123", req).Return(nil).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.UpdateGeneralSettings(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.Equal(t, req, res)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - tên salon rỗng", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		req := valid()
		req.Organization.Name = "  "

		res, err := uc.UpdateGeneralSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - thiếu ngày làm việc", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		req := valid()
		req.WorkingHours.Days = req.WorkingHours.Days[:6]

		res, err := uc.UpdateGeneralSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - giờ đóng trước giờ mở", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		req := valid()
		req.WorkingHours.OpenTimeMinutes = 20 * 60
		req.WorkingHours.CloseTimeMinutes = 8 * 60

		res, err := uc.UpdateGeneralSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - không tìm thấy org", func(t *testing.T) {
		repo := new(MockSettingRepository)
		req := valid()
		repo.On("UpdateGeneralSettings", mock.Anything, "org-123", req).
			Return(domain.ErrGeneralSettingsNotFound).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.UpdateGeneralSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 404, appErr.StatusCode)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - lỗi repository", func(t *testing.T) {
		repo := new(MockSettingRepository)
		req := valid()
		repo.On("UpdateGeneralSettings", mock.Anything, "org-123", req).
			Return(errors.New("db down")).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.UpdateGeneralSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 500, appErr.StatusCode)
		repo.AssertExpectations(t)
	})
}

func TestSettingUseCase_UpdatePaymentSettings(t *testing.T) {
	valid := func() *domain.PaymentSettingsResponse {
		return &domain.PaymentSettingsResponse{
			Receipt: *domain.DefaultReceiptSettings(),
			PaymentMethods: []domain.PaymentMethod{
				{ID: "pm-1", Code: "CASH", Name: "Tiền mặt", IsActive: true},
				{ID: "pm-2", Code: "BANK_TRANSFER", Name: "Chuyển khoản", IsActive: false},
			},
		}
	}

	t.Run("Thành công", func(t *testing.T) {
		repo := new(MockSettingRepository)
		req := valid()
		repo.On("UpdatePaymentSettings", mock.Anything, "org-123", req).Return(nil).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.UpdatePaymentSettings(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.Equal(t, req, res)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - tắt toàn bộ phương thức", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		req := valid()
		for i := range req.PaymentMethods {
			req.PaymentMethods[i].IsActive = false
		}

		res, err := uc.UpdatePaymentSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - khổ giấy không hợp lệ", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		req := valid()
		req.Receipt.PaperSize = "K58"

		res, err := uc.UpdatePaymentSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - req nil", func(t *testing.T) {
		uc := NewSettingUseCase(new(MockSettingRepository))
		res, err := uc.UpdatePaymentSettings(withOrgCtx("org-123"), nil)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 400, appErr.StatusCode)
	})

	t.Run("Thất bại - lỗi repository", func(t *testing.T) {
		repo := new(MockSettingRepository)
		req := valid()
		repo.On("UpdatePaymentSettings", mock.Anything, "org-123", req).
			Return(errors.New("db down")).Once()

		uc := NewSettingUseCase(repo)
		res, err := uc.UpdatePaymentSettings(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		var appErr *apperror.AppError
		assert.True(t, errors.As(err, &appErr))
		assert.Equal(t, 500, appErr.StatusCode)
		repo.AssertExpectations(t)
	})
}
