package setting

import "errors"

// PayrollSettings là cấu hình kỳ lương của một salon.
type PayrollSettings struct {
	StartDay            int `json:"start_day" db:"start_day"`
	StandardWorkingDays int `json:"standard_working_days" db:"standard_working_days"`
	AutoDraftCutoffDay  int `json:"auto_draft_cutoff_day" db:"auto_draft_cutoff_day"`
}

// DefaultPayrollSettings khớp DEFAULT trong migration payroll_settings.
func DefaultPayrollSettings() PayrollSettings {
	return PayrollSettings{
		StartDay:            26,
		StandardWorkingDays: 26,
		AutoDraftCutoffDay:  7,
	}
}

// Normalize thay giá trị thiếu bằng mặc định.
func (s *PayrollSettings) Normalize() {
	defaults := DefaultPayrollSettings()
	if s.StartDay == 0 {
		s.StartDay = defaults.StartDay
	}
	if s.StandardWorkingDays == 0 {
		s.StandardWorkingDays = defaults.StandardWorkingDays
	}
	if s.AutoDraftCutoffDay == 0 {
		s.AutoDraftCutoffDay = defaults.AutoDraftCutoffDay
	}
}

// Validate kiểm tra khoảng giá trị của cấu hình kỳ lương.
func (s *PayrollSettings) Validate() error {
	if s.StartDay < 1 || s.StartDay > 28 {
		return errors.New("Ngày bắt đầu kỳ lương phải nằm trong khoảng 1 đến 28")
	}
	if s.StandardWorkingDays < 1 || s.StandardWorkingDays > 31 {
		return errors.New("Số ngày công chuẩn phải nằm trong khoảng 1 đến 31")
	}
	if s.AutoDraftCutoffDay < 1 || s.AutoDraftCutoffDay > 28 {
		return errors.New("Ngày tới hạn tạo bảng lương nháp phải nằm trong khoảng 1 đến 28")
	}
	return nil
}
