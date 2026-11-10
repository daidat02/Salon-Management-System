package appointment

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func mustParse(t *testing.T, value string) time.Time {
	t.Helper()
	parsed, err := time.Parse(time.RFC3339, value)
	assert.NoError(t, err)
	return parsed
}

func vnHours(open, close int) *BusinessHours {
	days := make([]BusinessDay, 0, 7)
	for weekday := 1; weekday <= 7; weekday++ {
		days = append(days, BusinessDay{Weekday: weekday, IsOpen: true})
	}
	return &BusinessHours{
		OpenTimeMinutes:  open,
		CloseTimeMinutes: close,
		Days:             days,
		Timezone:         DefaultTimezone,
	}
}

func TestValidateBookingTime_UsesSalonTimezone(t *testing.T) {
	settings := DefaultAppointmentSettings("org-123")
	settings.MinLeadMinutes = 0
	settings.MaxAdvanceDays = 0
	hours := vnHours(9*60, 20*60)
	now := mustParse(t, "2026-11-09T00:00:00Z")

	t.Run("02:00Z là 09:00 ICT nên hợp lệ", func(t *testing.T) {
		start := mustParse(t, "2026-11-11T02:00:00Z")
		end := mustParse(t, "2026-11-11T02:30:00Z")

		assert.NoError(t, settings.ValidateBookingTime(start, end, now, hours))
	})

	t.Run("18:00Z là 01:00 ICT hôm sau nên bị từ chối", func(t *testing.T) {
		start := mustParse(t, "2026-11-10T18:00:00Z")
		end := mustParse(t, "2026-11-10T18:30:00Z")

		err := settings.ValidateBookingTime(start, end, now, hours)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "09:00")
	})

	t.Run("Ngày đóng cửa theo lịch salon bị từ chối", func(t *testing.T) {
		closed := vnHours(9*60, 20*60)
		for i := range closed.Days {
			if closed.Days[i].Weekday == 3 {
				closed.Days[i].IsOpen = false
			}
		}
		start := mustParse(t, "2026-11-11T02:00:00Z")
		end := mustParse(t, "2026-11-11T02:30:00Z")

		err := settings.ValidateBookingTime(start, end, now, closed)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Thứ 4")
	})

	t.Run("Giờ nghỉ dùng chung được so theo giờ salon", func(t *testing.T) {
		breakStart, breakEnd := 12*60+30, 13*60+30
		withBreak := vnHours(9*60, 20*60)
		withBreak.BreakStartMinutes = &breakStart
		withBreak.BreakEndMinutes = &breakEnd
		start := mustParse(t, "2026-11-11T05:00:00Z") // 12:00 ICT
		end := mustParse(t, "2026-11-11T06:00:00Z")   // 13:00 ICT

		err := settings.ValidateBookingTime(start, end, now, withBreak)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "giờ nghỉ")
	})
}

func TestValidateBookingTime_MaxAdvanceCalendarDay(t *testing.T) {
	settings := DefaultAppointmentSettings("org-123")
	settings.MinLeadMinutes = 0
	settings.MaxAdvanceDays = 1
	hours := vnHours(0, 24*60)
	now := mustParse(t, "2026-11-10T02:00:00Z") // 09:00 ICT ngày 10/11

	t.Run("23:00 ICT ngày cuối vẫn hợp lệ", func(t *testing.T) {
		start := mustParse(t, "2026-11-11T16:00:00Z") // 23:00 ICT 11/11
		end := mustParse(t, "2026-11-11T16:30:00Z")

		assert.NoError(t, settings.ValidateBookingTime(start, end, now, hours))
	})

	t.Run("00:00 ICT ngày kế tiếp bị từ chối", func(t *testing.T) {
		start := mustParse(t, "2026-11-11T17:00:00Z") // 00:00 ICT 12/11
		end := mustParse(t, "2026-11-11T17:30:00Z")

		err := settings.ValidateBookingTime(start, end, now, hours)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "1 ngày")
	})
}

func TestBusinessHours_LocationFallback(t *testing.T) {
	hours := vnHours(9*60, 20*60)
	hours.Timezone = "Invalid/Zone"

	loc, ok := hours.Location()
	assert.False(t, ok)
	assert.Equal(t, DefaultTimezone, loc.String())

	settings := DefaultAppointmentSettings("org-123")
	settings.MinLeadMinutes = 0
	settings.MaxAdvanceDays = 0
	start := mustParse(t, "2026-11-11T02:00:00Z")
	end := mustParse(t, "2026-11-11T02:30:00Z")
	assert.NoError(t, settings.ValidateBookingTime(start, end, start, hours))
}
