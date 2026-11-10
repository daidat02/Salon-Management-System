package appointment

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"time"
)

// ErrAppointmentSettingsNotFound dùng khi org chưa có dòng cấu hình.
var ErrAppointmentSettingsNotFound = errors.New("appointment settings not found")

// AppointmentSettings là cấu hình đặt lịch + quy tắc cọc theo no-show của 1 salon.
type AppointmentSettings struct {
	OrganizationID      string
	AllowOnlineBooking  bool
	AutoConfirm         bool
	SlotStepMinutes     int
	MaxPerSlot          int
	MinLeadMinutes      int
	MaxAdvanceDays      int
	AllowCancel         bool
	CancelBeforeHours   int
	MaxCancellations    int
	AllowReschedule     bool
	RescheduleBeforeHrs int

	DepositEnabled     bool
	NoShowThreshold    int
	NoShowLookbackDays int
	// DepositPercent là tỷ lệ cọc theo giá trị đơn (0–100).
	DepositPercent float64
	// DepositMaxAmount là mức cọc tối đa; 0 = không giới hạn.
	DepositMaxAmount float64
}

// DefaultAppointmentSettings trả cấu hình mặc định (khớp DEFAULT trong migration).
func DefaultAppointmentSettings(orgID string) *AppointmentSettings {
	return &AppointmentSettings{
		OrganizationID:      orgID,
		AllowOnlineBooking:  true,
		AutoConfirm:         false,
		SlotStepMinutes:     30,
		MaxPerSlot:          2,
		MinLeadMinutes:      60,
		MaxAdvanceDays:      30,
		AllowCancel:         true,
		CancelBeforeHours:   4,
		MaxCancellations:    3,
		AllowReschedule:     true,
		RescheduleBeforeHrs: 2,
		DepositEnabled:      true,
		NoShowThreshold:     2,
		NoShowLookbackDays:  180,
		DepositPercent:      30,
		DepositMaxAmount:    0,
	}
}

// RequiredDeposit tính số tiền cọc phải thu cho khách có noShowCount lần không đến.
// Trả về (số tiền, true) nếu phải cọc; ngược lại (0, false).
func (s *AppointmentSettings) RequiredDeposit(totalAmount float64, noShowCount int) (float64, bool) {
	if s == nil || !s.DepositEnabled {
		return 0, false
	}
	if s.NoShowThreshold <= 0 || noShowCount < s.NoShowThreshold {
		return 0, false
	}

	var amount float64
	amount = totalAmount * s.DepositPercent / 100

	amount = math.Round(amount*100) / 100
	if amount <= 0 {
		return 0, false
	}
	if totalAmount > 0 && amount > totalAmount {
		amount = totalAmount
	}
	if s.DepositMaxAmount > 0 && amount > s.DepositMaxAmount {
		amount = s.DepositMaxAmount
	}
	return amount, true
}

// SettingsRepository đọc cấu hình đặt lịch, giờ làm việc và các số đếm phục vụ
// cưỡng chế quy tắc đặt/hủy/đổi lịch.
type SettingsRepository interface {
	GetAppointmentSettings(ctx context.Context, orgID string) (*AppointmentSettings, error)
	CountCustomerNoShows(ctx context.Context, orgID, customerID string, since time.Time) (int, error)
	GetBusinessHours(ctx context.Context, orgID string) (*BusinessHours, error)
	CountActiveAppointmentsInSlot(ctx context.Context, orgID string, start, end time.Time, excludeAppointmentID string) (int, error)
	CountCustomerCancellations(ctx context.Context, orgID, customerID string, since time.Time) (int, error)
}

// BusinessDay là trạng thái mở/đóng của 1 thứ (1=T2 .. 7=CN).
type BusinessDay struct {
	Weekday int  `json:"weekday" db:"weekday"`
	IsOpen  bool `json:"is_open" db:"is_open"`
}

// DefaultTimezone dùng khi org chưa cấu hình hoặc timezone không hợp lệ.
const DefaultTimezone = "Asia/Ho_Chi_Minh"

// BusinessHours là khung giờ làm việc dùng chung cho mọi ngày mở cửa.
// Các mốc thời gian tính bằng số phút kể từ 00:00 theo giờ tường của salon.
type BusinessHours struct {
	OpenTimeMinutes   int           `json:"open_time_minutes" db:"open_time_minutes"`
	CloseTimeMinutes  int           `json:"close_time_minutes" db:"close_time_minutes"`
	BreakStartMinutes *int          `json:"break_start_minutes" db:"break_start_minutes"`
	BreakEndMinutes   *int          `json:"break_end_minutes" db:"break_end_minutes"`
	Days              []BusinessDay `json:"days" db:"days"`
	// Timezone IANA của salon (vd Asia/Ho_Chi_Minh), đọc từ organizations.
	Timezone string `json:"-" db:"-"`
}

// Location trả timezone của salon. Fallback DefaultTimezone nếu thiếu/sai.
// ok=false khi timezone cấu hình không load được (đã fallback).
func (h *BusinessHours) Location() (*time.Location, bool) {
	tz := DefaultTimezone
	if h != nil && h.Timezone != "" {
		tz = h.Timezone
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		log.Printf("timezone %q không hợp lệ, fallback về %s: %v", tz, DefaultTimezone, err)
		fallback, _ := time.LoadLocation(DefaultTimezone)
		return fallback, false
	}
	return loc, true
}

// weekdayLabels nhãn thứ theo chuẩn ISO (1=T2 .. 7=CN).
var weekdayLabels = map[int]string{
	1: "Thứ 2",
	2: "Thứ 3",
	3: "Thứ 4",
	4: "Thứ 5",
	5: "Thứ 6",
	6: "Thứ 7",
	7: "Chủ nhật",
}

// isoWeekday đổi time.Weekday (CN=0) sang chuẩn ISO (T2=1 .. CN=7).
func isoWeekday(t time.Time) int {
	w := int(t.Weekday())
	if w == 0 {
		return 7
	}
	return w
}

// minutesOfDay trả số phút kể từ 00:00 theo giờ tường của t.
func minutesOfDay(t time.Time) int {
	return t.Hour()*60 + t.Minute()
}

// formatMinutes đổi số phút kể từ 00:00 thành "HH:MM" để hiển thị lỗi.
func formatMinutes(total int) string {
	return fmt.Sprintf("%02d:%02d", total/60, total%60)
}

// ValidateBookingTime kiểm tra khung giờ đặt lịch theo cấu hình + giờ làm việc.
// Chỉ trả lỗi (message tiếng Việt) khi vi phạm; thiếu dữ liệu giờ thì bỏ qua.
func (s *AppointmentSettings) ValidateBookingTime(start, end, now time.Time, hours *BusinessHours) error {
	if s == nil {
		return nil
	}
	loc, _ := hours.Location()
	if s.MinLeadMinutes > 0 {
		if earliest := now.Add(time.Duration(s.MinLeadMinutes) * time.Minute); start.Before(earliest) {
			return fmt.Errorf("Lịch hẹn phải được đặt trước ít nhất %d phút", s.MinLeadMinutes)
		}
	}
	if s.MaxAdvanceDays > 0 {
		// Tính theo ngày lịch của salon: +N ngày là tính đến hết ngày đó.
		nowLocal := now.In(loc)
		year, month, day := nowLocal.Date()
		endOfToday := time.Date(year, month, day, 23, 59, 59, int(time.Second-time.Nanosecond), loc)
		if latest := endOfToday.AddDate(0, 0, s.MaxAdvanceDays); start.After(latest) {
			return fmt.Errorf("Chỉ được đặt lịch trước tối đa %d ngày", s.MaxAdvanceDays)
		}
	}

	if hours == nil {
		return nil
	}

	localStart := start.In(loc)
	localEnd := end.In(loc)
	weekday := isoWeekday(localStart)
	var day *BusinessDay
	for i := range hours.Days {
		if hours.Days[i].Weekday == weekday {
			day = &hours.Days[i]
			break
		}
	}
	if day == nil {
		return nil
	}

	label := weekdayLabels[weekday]
	if !day.IsOpen {
		return fmt.Errorf("Salon đóng cửa vào %s", label)
	}

	openMin, closeMin := hours.OpenTimeMinutes, hours.CloseTimeMinutes
	if openMin < 0 || closeMin > 24*60 || openMin >= closeMin {
		return nil
	}

	y1, m1, d1 := localStart.Date()
	y2, m2, d2 := localEnd.Date()
	if y1 != y2 || m1 != m2 || d1 != d2 {
		return errors.New("Lịch hẹn phải bắt đầu và kết thúc trong cùng ngày")
	}

	startMin := minutesOfDay(localStart)
	endMin := minutesOfDay(localEnd)
	if startMin < openMin || endMin > closeMin {
		return fmt.Errorf(
			"Lịch hẹn phải nằm trong giờ mở cửa %s–%s (%s)",
			formatMinutes(openMin), formatMinutes(closeMin), label,
		)
	}

	if hours.BreakStartMinutes != nil && hours.BreakEndMinutes != nil {
		breakStart, breakEnd := *hours.BreakStartMinutes, *hours.BreakEndMinutes
		if startMin < breakEnd && endMin > breakStart {
			return fmt.Errorf(
				"Lịch hẹn không được trùng giờ nghỉ %s–%s (%s)",
				formatMinutes(breakStart), formatMinutes(breakEnd), label,
			)
		}
	}

	return nil
}
