package setting

import (
	"errors"
	"fmt"
	"strings"
)

// Validate kiểm tra dữ liệu tab Cài đặt chung trước khi ghi DB.
func (r *GeneralSettingsResponse) Validate() error {
	if strings.TrimSpace(r.Organization.Name) == "" {
		return errors.New("Tên salon không được để trống")
	}

	hours := r.WorkingHours
	if len(hours.Days) != 7 {
		return errors.New("Giờ làm việc phải có đủ 7 ngày trong tuần")
	}

	seen := make(map[int]bool, 7)
	openDays := 0
	for _, day := range hours.Days {
		if day.Weekday < 1 || day.Weekday > 7 {
			return fmt.Errorf("Thứ %d không hợp lệ", day.Weekday)
		}
		if seen[day.Weekday] {
			return fmt.Errorf("Thứ %d bị lặp lại", day.Weekday)
		}
		seen[day.Weekday] = true
		if day.IsOpen {
			openDays++
		}
	}
	if openDays == 0 {
		return errors.New("Phải mở cửa ít nhất một ngày trong tuần")
	}

	if hours.OpenTimeMinutes < 0 || hours.OpenTimeMinutes >= 24*60 {
		return errors.New("Giờ mở cửa không hợp lệ")
	}
	if hours.CloseTimeMinutes <= 0 || hours.CloseTimeMinutes > 24*60 {
		return errors.New("Giờ đóng cửa không hợp lệ")
	}
	if hours.OpenTimeMinutes >= hours.CloseTimeMinutes {
		return errors.New("Giờ đóng cửa phải sau giờ mở cửa")
	}

	if (hours.BreakStartMinutes == nil) != (hours.BreakEndMinutes == nil) {
		return errors.New("Giờ nghỉ phải có đủ bắt đầu và kết thúc")
	}
	if hours.BreakStartMinutes != nil && hours.BreakEndMinutes != nil {
		start, end := *hours.BreakStartMinutes, *hours.BreakEndMinutes
		if start < hours.OpenTimeMinutes || end > hours.CloseTimeMinutes || start >= end {
			return errors.New("Giờ nghỉ phải nằm trong giờ mở cửa và bắt đầu trước khi kết thúc")
		}
	}
	return nil
}

var validPaperSizes = map[string]bool{
	"K80": true,
	"K57": true,
	"A4":  true,
	"A5":  true,
}

// Validate kiểm tra cấu hình thanh toán trước khi ghi DB.
func (r *PaymentSettingsResponse) Validate() error {
	if !validPaperSizes[r.Receipt.PaperSize] {
		return errors.New("Khổ giấy không hợp lệ")
	}
	if r.Receipt.PrintCopyCount < 1 {
		return errors.New("Số bản in phải lớn hơn 0")
	}

	active := 0
	for _, method := range r.PaymentMethods {
		if strings.TrimSpace(method.ID) == "" {
			return errors.New("Phương thức thanh toán không hợp lệ")
		}
		if method.IsActive {
			active++
		}
	}
	if active == 0 {
		return errors.New("Phải bật ít nhất một phương thức thanh toán")
	}
	return nil
}
