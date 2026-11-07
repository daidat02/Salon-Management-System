package setting

// DefaultWorkingHours lịch mặc định khớp DEFAULT trong migration.
func DefaultWorkingHours() []WorkingHourDay {
	normal := "Lịch thông thường"
	peak := "Khung giờ cao điểm tối"
	busy := "Ngày đông khách - tăng ca"
	bs := "12:30"
	be := "13:30"

	return []WorkingHourDay{
		{Weekday: 1, IsOpen: true, OpenTime: "08:30", CloseTime: "20:30", BreakStart: &bs, BreakEnd: &be, Note: &normal},
		{Weekday: 2, IsOpen: true, OpenTime: "08:30", CloseTime: "20:30", BreakStart: &bs, BreakEnd: &be, Note: &normal},
		{Weekday: 3, IsOpen: true, OpenTime: "08:30", CloseTime: "20:30", BreakStart: &bs, BreakEnd: &be, Note: &normal},
		{Weekday: 4, IsOpen: true, OpenTime: "08:30", CloseTime: "20:30", BreakStart: &bs, BreakEnd: &be, Note: &normal},
		{Weekday: 5, IsOpen: true, OpenTime: "08:30", CloseTime: "21:00", BreakStart: &bs, BreakEnd: &be, Note: &peak},
		{Weekday: 6, IsOpen: true, OpenTime: "08:00", CloseTime: "21:30", Note: &busy},
		{Weekday: 7, IsOpen: true, OpenTime: "08:00", CloseTime: "21:30", Note: &busy},
	}
}
