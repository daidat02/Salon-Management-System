package setting

const (
	defaultOpenTimeMinutes  = 8*60 + 30  // 08:30
	defaultCloseTimeMinutes = 20*60 + 30 // 20:30
	defaultBreakStartMinute = 12*60 + 30 // 12:30
	defaultBreakEndMinute   = 13*60 + 30 // 13:30
)

// DefaultWorkingHours khung giờ mặc định khớp DEFAULT trong migration.
func DefaultWorkingHours() WorkingHours {
	days := make([]WorkingHourDay, 0, 7)
	for weekday := 1; weekday <= 7; weekday++ {
		days = append(days, WorkingHourDay{Weekday: weekday, IsOpen: true})
	}

	breakStart, breakEnd := defaultBreakStartMinute, defaultBreakEndMinute
	return WorkingHours{
		OpenTimeMinutes:   defaultOpenTimeMinutes,
		CloseTimeMinutes:  defaultCloseTimeMinutes,
		BreakStartMinutes: &breakStart,
		BreakEndMinutes:   &breakEnd,
		Days:              days,
	}
}
