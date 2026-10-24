package staff

import (
	"errors"
	"time"
)

const (
	statusActive   = "active"
	statusInactive = "inactive"
)

type Staff struct {
	ID                string
	OrganizationID    string
	Code              string
	FullName          string
	Phone             string
	Email             string
	BirthDate         *time.Time
	Gender            string
	Address           string
	Position          string
	EmploymentType    string
	CommissionRate    float64
	BaseSalary        float64
	BankName          string
	BankAccountNumber string
	BankAccountHolder string
	Status            string
	HireDate          time.Time
	CreatedAt         *time.Time
	UpdatedAt         *time.Time
	DeletedAt         *time.Time
}

func (s *Staff) Validate() error {
	if s.FullName == "" {
		return errors.New("Tên đầy đủ không được để trống")
	}
	if s.Phone == "" {
		return errors.New("Số điện thoại không được để trống")
	}
	if s.Position == "" {
		return errors.New("Vị trí không được để trống")
	}
	if s.CommissionRate < 0 || s.CommissionRate > 100 {
		return errors.New("Tỷ lệ hoa hồng phải nằm trong khoảng từ 0 đến 100")
	}
	if s.BaseSalary < 0 {
		return errors.New("Lương cơ bản không được âm")
	}
	if s.Gender != "" && s.Gender != "male" && s.Gender != "female" && s.Gender != "other" {
		return errors.New("Giới tính không hợp lệ")
	}
	if s.EmploymentType != "" && s.EmploymentType != "fulltime" && s.EmploymentType != "parttime" {
		return errors.New("Hình thức làm việc không hợp lệ")
	}
	if s.Status != statusActive && s.Status != statusInactive {
		return errors.New("Trạng thái không hợp lệ")
	}
	return nil
}
