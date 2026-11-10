package appointment

import (
	"testing"
	"time"

	domain "github.com/daidat02/server/internal/domain/appointment"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// bookingRequest trả request nền với khung giờ 14:00–15:00 trong tương lai,
// status và source để trống để usecase tự quyết định.
func bookingRequest() *domain.AppointmentCreateRequest {
	req := futureRequest()
	req.Status = ""
	req.Source = "online"
	return req
}

func targetWeekday(start string) int {
	t, err := time.Parse(time.RFC3339, start)
	if err != nil {
		return 1
	}
	w := int(t.Weekday())
	if w == 0 {
		return 7
	}
	return w
}

func newSettingsUC(repo *MockAppointmentRepository, settingsRepo *MockSettingsRepository, finder *MockCustomerFinder) *AppointmentUseCase {
	return NewAppointmentUseCase(repo, finder, catalogOK(), settingsRepo)
}

func TestBookingRules_Create(t *testing.T) {
	t.Run("auto_confirm=false thì lịch mới ở trạng thái pending", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		finder := new(MockCustomerFinder)
		settingsRepo := new(MockSettingsRepository)

		req := bookingRequest()
		settings := domain.DefaultAppointmentSettings("org-123")
		settings.DepositEnabled = false
		settings.AutoConfirm = false
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(permissiveHours(), nil)
		settingsRepo.On("CountActiveAppointmentsInSlot", mock.Anything, "org-123", mock.Anything, mock.Anything, "").Return(0, nil)
		finder.On("FindCustomerByPhone", mock.Anything, "org-123", "0912345678").Return(existingCustomer(), nil)
		repo.On("CreateAppointment", mock.Anything, mock.MatchedBy(func(a *domain.Appointment) bool {
			return a.Status == "pending"
		}), mock.Anything).Return(nil)

		res, err := newSettingsUC(repo, settingsRepo, finder).CreateAppointment(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.Equal(t, "pending", res.Status)
	})

	t.Run("auto_confirm=true thì lịch mới ở trạng thái confirmed", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		finder := new(MockCustomerFinder)
		settingsRepo := new(MockSettingsRepository)

		settings := domain.DefaultAppointmentSettings("org-123")
		settings.DepositEnabled = false
		settings.AutoConfirm = true
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(permissiveHours(), nil)
		settingsRepo.On("CountActiveAppointmentsInSlot", mock.Anything, "org-123", mock.Anything, mock.Anything, "").Return(0, nil)
		finder.On("FindCustomerByPhone", mock.Anything, "org-123", "0912345678").Return(existingCustomer(), nil)
		repo.On("CreateAppointment", mock.Anything, mock.MatchedBy(func(a *domain.Appointment) bool {
			return a.Status == "confirmed"
		}), mock.Anything).Return(nil)

		res, err := newSettingsUC(repo, settingsRepo, finder).CreateAppointment(withOrgCtx("org-123"), bookingRequest())

		assert.NoError(t, err)
		assert.Equal(t, "confirmed", res.Status)
	})

	t.Run("Ngày đóng cửa bị từ chối", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		finder := new(MockCustomerFinder)
		settingsRepo := new(MockSettingsRepository)

		req := bookingRequest()
		hours := permissiveHours()
		weekday := targetWeekday(req.StartTime)
		for i := range hours.Days {
			if hours.Days[i].Weekday == weekday {
				hours.Days[i].IsOpen = false
			}
		}
		settings := domain.DefaultAppointmentSettings("org-123")
		settings.DepositEnabled = false
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(hours, nil)

		res, err := newSettingsUC(repo, settingsRepo, finder).CreateAppointment(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		repo.AssertNotCalled(t, "CreateAppointment", mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Ngoài giờ mở cửa bị từ chối", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		finder := new(MockCustomerFinder)
		settingsRepo := new(MockSettingsRepository)

		req := bookingRequest()
		loc := time.FixedZone("ICT", 7*3600)
		d := time.Now().In(loc).AddDate(0, 0, 3)
		start := time.Date(d.Year(), d.Month(), d.Day(), 5, 0, 0, 0, loc)
		req.StartTime = start.Format(time.RFC3339)
		req.EndTime = start.Add(time.Hour).Format(time.RFC3339)

		settings := domain.DefaultAppointmentSettings("org-123")
		settings.DepositEnabled = false
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(permissiveHours(), nil)

		res, err := newSettingsUC(repo, settingsRepo, finder).CreateAppointment(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Trùng giờ nghỉ trưa bị từ chối", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		finder := new(MockCustomerFinder)
		settingsRepo := new(MockSettingsRepository)

		req := bookingRequest()
		bs, be := 13*60+30, 14*60+30
		hours := permissiveHours()
		hours.BreakStartMinutes = &bs
		hours.BreakEndMinutes = &be
		settings := domain.DefaultAppointmentSettings("org-123")
		settings.DepositEnabled = false
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(hours, nil)

		res, err := newSettingsUC(repo, settingsRepo, finder).CreateAppointment(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Đặt quá sát giờ bị từ chối", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		finder := new(MockCustomerFinder)
		settingsRepo := new(MockSettingsRepository)

		req := bookingRequest()
		start := time.Now().Add(10 * time.Minute)
		req.StartTime = start.Format(time.RFC3339)
		req.EndTime = start.Add(time.Hour).Format(time.RFC3339)

		settings := domain.DefaultAppointmentSettings("org-123")
		settings.DepositEnabled = false
		settings.MinLeadMinutes = 600
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(permissiveHours(), nil)

		res, err := newSettingsUC(repo, settingsRepo, finder).CreateAppointment(withOrgCtx("org-123"), req)

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Đặt quá xa ngày bị từ chối", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		finder := new(MockCustomerFinder)
		settingsRepo := new(MockSettingsRepository)

		settings := domain.DefaultAppointmentSettings("org-123")
		settings.DepositEnabled = false
		settings.MaxAdvanceDays = 1
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(permissiveHours(), nil)

		res, err := newSettingsUC(repo, settingsRepo, finder).CreateAppointment(withOrgCtx("org-123"), bookingRequest())

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Khung giờ đã đủ sức chứa bị từ chối", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		finder := new(MockCustomerFinder)
		settingsRepo := new(MockSettingsRepository)

		settings := domain.DefaultAppointmentSettings("org-123")
		settings.DepositEnabled = false
		settings.MaxPerSlot = 2
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(permissiveHours(), nil)
		settingsRepo.On("CountActiveAppointmentsInSlot", mock.Anything, "org-123", mock.Anything, mock.Anything, "").Return(2, nil)

		res, err := newSettingsUC(repo, settingsRepo, finder).CreateAppointment(withOrgCtx("org-123"), bookingRequest())

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		repo.AssertNotCalled(t, "CreateAppointment", mock.Anything, mock.Anything, mock.Anything)
	})
}

func TestBookingRules_Reschedule(t *testing.T) {
	newStart := time.Now().AddDate(0, 0, 5).Truncate(time.Hour)
	newEnd := newStart.Add(time.Hour)

	t.Run("Không cho đổi lịch khi allow_reschedule=false", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		settingsRepo := new(MockSettingsRepository)
		repo.On("CheckExitAppointmentByID", mock.Anything, "org-123", "appt-1").Return(validAppointment("pending"), nil)
		settings := domain.DefaultAppointmentSettings("org-123")
		settings.AllowReschedule = false
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(permissiveHours(), nil).Maybe()

		uc := NewAppointmentUseCase(repo, new(MockCustomerFinder), catalogOK(), settingsRepo)
		res, err := uc.RescheduleAppointment(withOrgCtx("org-123"), "appt-1", newStart.Format(time.RFC3339), newEnd.Format(time.RFC3339))

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		repo.AssertNotCalled(t, "UpdateAppointmentTimes", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Quá hạn đổi lịch bị từ chối", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		settingsRepo := new(MockSettingsRepository)
		near := time.Now().Add(1 * time.Hour)
		appt := validAppointment("pending")
		appt.StartTime = near.Format(time.RFC3339)
		appt.EndTime = near.Add(time.Hour).Format(time.RFC3339)
		repo.On("CheckExitAppointmentByID", mock.Anything, "org-123", "appt-1").Return(appt, nil)
		settings := domain.DefaultAppointmentSettings("org-123")
		settings.RescheduleBeforeHrs = 4
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(permissiveHours(), nil).Maybe()

		uc := NewAppointmentUseCase(repo, new(MockCustomerFinder), catalogOK(), settingsRepo)
		res, err := uc.RescheduleAppointment(withOrgCtx("org-123"), "appt-1", newStart.Format(time.RFC3339), newEnd.Format(time.RFC3339))

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})
}

func TestBookingRules_Cancel(t *testing.T) {
	future := time.Now().AddDate(0, 0, 5)
	futureAppt := func() *domain.Appointment {
		a := validAppointment("pending")
		a.StartTime = future.Format(time.RFC3339)
		a.EndTime = future.Add(time.Hour).Format(time.RFC3339)
		return a
	}

	t.Run("Không cho hủy khi allow_cancel=false", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		settingsRepo := new(MockSettingsRepository)
		repo.On("CheckExitAppointmentByID", mock.Anything, "org-123", "appt-1").Return(futureAppt(), nil)
		settings := domain.DefaultAppointmentSettings("org-123")
		settings.AllowCancel = false
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)

		uc := NewAppointmentUseCase(repo, new(MockCustomerFinder), catalogOK(), settingsRepo)
		res, err := uc.CancelAppointment(withOrgCtx("org-123"), "appt-1", "khách bận")

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		repo.AssertNotCalled(t, "UpdateAppointmentStatus", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Quá hạn hủy bị từ chối", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		settingsRepo := new(MockSettingsRepository)
		near := time.Now().Add(1 * time.Hour)
		appt := validAppointment("pending")
		appt.StartTime = near.Format(time.RFC3339)
		appt.EndTime = near.Add(time.Hour).Format(time.RFC3339)
		repo.On("CheckExitAppointmentByID", mock.Anything, "org-123", "appt-1").Return(appt, nil)
		settings := domain.DefaultAppointmentSettings("org-123")
		settings.CancelBeforeHours = 4
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)

		uc := NewAppointmentUseCase(repo, new(MockCustomerFinder), catalogOK(), settingsRepo)
		res, err := uc.CancelAppointment(withOrgCtx("org-123"), "appt-1", "khách bận")

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Đạt số lần hủy tối đa trong tháng bị từ chối", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		settingsRepo := new(MockSettingsRepository)
		repo.On("CheckExitAppointmentByID", mock.Anything, "org-123", "appt-1").Return(futureAppt(), nil)
		settings := domain.DefaultAppointmentSettings("org-123")
		settings.MaxCancellations = 3
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(permissiveHours(), nil).Maybe()
		settingsRepo.On("CountCustomerCancellations", mock.Anything, "org-123", "cus-1", mock.Anything).Return(3, nil)

		uc := NewAppointmentUseCase(repo, new(MockCustomerFinder), catalogOK(), settingsRepo)
		res, err := uc.CancelAppointment(withOrgCtx("org-123"), "appt-1", "khách bận")

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		repo.AssertNotCalled(t, "UpdateAppointmentStatus", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Hủy hợp lệ khi còn trong hạn", func(t *testing.T) {
		repo := new(MockAppointmentRepository)
		settingsRepo := new(MockSettingsRepository)
		repo.On("CheckExitAppointmentByID", mock.Anything, "org-123", "appt-1").Return(futureAppt(), nil)
		settings := domain.DefaultAppointmentSettings("org-123")
		settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
		settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(permissiveHours(), nil).Maybe()
		settingsRepo.On("CountCustomerCancellations", mock.Anything, "org-123", "cus-1", mock.Anything).Return(1, nil)
		repo.On("UpdateAppointmentStatus", mock.Anything, "org-123", "appt-1", "cancelled", "khách bận").Return(nil)

		uc := NewAppointmentUseCase(repo, new(MockCustomerFinder), catalogOK(), settingsRepo)
		res, err := uc.CancelAppointment(withOrgCtx("org-123"), "appt-1", "khách bận")

		assert.NoError(t, err)
		assert.Equal(t, "cancelled", res.Status)
	})
}
