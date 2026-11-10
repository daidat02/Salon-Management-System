package appointment

import (
	"testing"
	"time"

	domain "github.com/daidat02/server/internal/domain/appointment"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func salonHours() *domain.BusinessHours {
	days := make([]domain.BusinessDay, 0, 7)
	for weekday := 1; weekday <= 7; weekday++ {
		days = append(days, domain.BusinessDay{Weekday: weekday, IsOpen: true})
	}
	return &domain.BusinessHours{
		OpenTimeMinutes:  9 * 60,
		CloseTimeMinutes: 20 * 60,
		Days:             days,
		Timezone:         domain.DefaultTimezone,
	}
}

func TestParseAppointmentTimeIn_NaiveUsesSalonTimezone(t *testing.T) {
	loc, err := time.LoadLocation(domain.DefaultTimezone)
	assert.NoError(t, err)

	parsed, ok := parseAppointmentTimeIn("2026-11-11 09:00:00", loc)
	assert.True(t, ok)
	assert.Equal(t, "2026-11-11T02:00:00Z", parsed.UTC().Format(time.RFC3339))

	dateOnly, ok := parseAppointmentTimeIn("2026-11-11", loc)
	assert.True(t, ok)
	assert.Equal(t, "2026-11-10T17:00:00Z", dateOnly.UTC().Format(time.RFC3339))

	withOffset, ok := parseAppointmentTimeIn("2026-11-11T02:00:00Z", loc)
	assert.True(t, ok)
	assert.Equal(t, "2026-11-11T02:00:00Z", withOffset.UTC().Format(time.RFC3339))
}

func TestGetWeeklySchedule_GroupsBySalonTimezone(t *testing.T) {
	repo := new(MockAppointmentRepository)
	settingsRepo := new(MockSettingsRepository)

	appointment := validAppointmentResponse("confirmed")
	appointment.ID = "appt-tz"
	appointment.StartTime = "2026-11-10T18:00:00Z" // 01:00 ICT thứ 4 ngày 11/11
	appointment.EndTime = "2026-11-10T18:30:00Z"

	repo.On("GetAppointmentsByDateRange", mock.Anything, "org-123",
		"2026-11-09T00:00:00+07:00", "2026-11-16T00:00:00+07:00").
		Return([]*domain.AppointmentResponse{appointment}, nil).Once()
	settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").
		Return(salonHours(), nil).Once()

	uc := NewAppointmentUseCase(repo, new(MockCustomerFinder), catalogOK(), settingsRepo)
	res, err := uc.GetWeeklySchedule(withOrgCtx("org-123"), "2026-11-11")

	assert.NoError(t, err)
	assert.Equal(t, "2026-11-09", res.WeekStart)
	assert.Equal(t, 1, res.Total)
	assert.Equal(t, 1, res.Days[2].Total)
	assert.Equal(t, "2026-11-11", res.Days[2].Date)
	assert.Equal(t, "appt-tz", res.Days[2].Appointments[0].ID)
}

func TestCancelAppointment_MonthStartUsesSalonTimezone(t *testing.T) {
	repo := new(MockAppointmentRepository)
	settingsRepo := new(MockSettingsRepository)

	future := time.Now().AddDate(0, 0, 5)
	appointment := validAppointment("pending")
	appointment.StartTime = future.Format(time.RFC3339)
	appointment.EndTime = future.Add(time.Hour).Format(time.RFC3339)

	settings := domain.DefaultAppointmentSettings("org-123")
	settings.MaxCancellations = 3
	settings.CancelBeforeHours = 0

	loc, err := time.LoadLocation(domain.DefaultTimezone)
	assert.NoError(t, err)
	nowLocal := time.Now().In(loc)
	expectedMonthStart := time.Date(nowLocal.Year(), nowLocal.Month(), 1, 0, 0, 0, 0, loc)

	repo.On("CheckExitAppointmentByID", mock.Anything, "org-123", "appt-1").Return(appointment, nil)
	settingsRepo.On("GetAppointmentSettings", mock.Anything, "org-123").Return(settings, nil)
	settingsRepo.On("GetBusinessHours", mock.Anything, "org-123").Return(salonHours(), nil)
	settingsRepo.On("CountCustomerCancellations", mock.Anything, "org-123", "cus-1",
		mock.MatchedBy(func(since time.Time) bool { return since.Equal(expectedMonthStart) })).
		Return(0, nil)
	repo.On("UpdateAppointmentStatus", mock.Anything, "org-123", "appt-1", "cancelled", "").Return(nil)

	uc := NewAppointmentUseCase(repo, new(MockCustomerFinder), catalogOK(), settingsRepo)
	res, err := uc.CancelAppointment(withOrgCtx("org-123"), "appt-1", "")

	assert.NoError(t, err)
	assert.Equal(t, "cancelled", res.Status)
	repo.AssertExpectations(t)
	settingsRepo.AssertExpectations(t)
}
