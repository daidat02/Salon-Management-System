package setting

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

// Validate kiểm tra dữ liệu tab Cài đặt chung trước khi ghi DB.
func (r *GeneralSettingsResponse) Validate() error {
	if strings.TrimSpace(r.Organization.Name) == "" {
		return errors.New("Tên salon không được để trống")
	}
	if len(r.WorkingHours) != 7 {
		return errors.New("Giờ làm việc phải có đủ 7 ngày trong tuần")
	}

	seen := make(map[int]bool, 7)
	for _, day := range r.WorkingHours {
		if day.Weekday < 1 || day.Weekday > 7 {
			return fmt.Errorf("Thứ %d không hợp lệ", day.Weekday)
		}
		if seen[day.Weekday] {
			return fmt.Errorf("Thứ %d bị lặp lại", day.Weekday)
		}
		seen[day.Weekday] = true

		if !day.IsOpen {
			continue
		}
		if _, err := time.Parse("15:04", day.OpenTime); err != nil {
			return fmt.Errorf("Giờ mở cửa thứ %d không đúng định dạng HH:MM", day.Weekday)
		}
		if _, err := time.Parse("15:04", day.CloseTime); err != nil {
			return fmt.Errorf("Giờ đóng cửa thứ %d không đúng định dạng HH:MM", day.Weekday)
		}
		if day.OpenTime >= day.CloseTime {
			return fmt.Errorf("Giờ đóng cửa thứ %d phải sau giờ mở cửa", day.Weekday)
		}
		if (day.BreakStart == nil) != (day.BreakEnd == nil) {
			return fmt.Errorf("Giờ nghỉ thứ %d phải có đủ bắt đầu và kết thúc", day.Weekday)
		}
		if day.BreakStart != nil && day.BreakEnd != nil {
			if _, err := time.Parse("15:04", *day.BreakStart); err != nil {
				return fmt.Errorf("Giờ nghỉ bắt đầu thứ %d không hợp lệ", day.Weekday)
			}
			if _, err := time.Parse("15:04", *day.BreakEnd); err != nil {
				return fmt.Errorf("Giờ nghỉ kết thúc thứ %d không hợp lệ", day.Weekday)
			}
			if *day.BreakStart >= *day.BreakEnd {
				return fmt.Errorf("Giờ nghỉ thứ %d không hợp lệ", day.Weekday)
			}
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
