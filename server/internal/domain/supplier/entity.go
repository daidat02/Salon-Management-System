package supplier

import (
	"errors"
	"strings"
	"time"
)

type Supplier struct {
	ID             string
	OrganizationID string
	Name           string
	Phone          *string
	Address        *string
	Note           *string
	CreatedAt      *time.Time
}

func (s *Supplier) Validate() error {
	s.Name = strings.TrimSpace(s.Name)
	if s.Name == "" {
		return errors.New("Tên nhà cung cấp không được để trống")
	}
	if len([]rune(s.Name)) > 255 {
		return errors.New("Tên nhà cung cấp tối đa 255 ký tự")
	}
	if s.Phone != nil {
		phone := strings.TrimSpace(*s.Phone)
		if len([]rune(phone)) > 20 {
			return errors.New("Số điện thoại nhà cung cấp tối đa 20 ký tự")
		}
		s.Phone = normalizeOptional(phone)
	}
	if s.Address != nil {
		address := strings.TrimSpace(*s.Address)
		if len([]rune(address)) > 500 {
			return errors.New("Địa chỉ nhà cung cấp tối đa 500 ký tự")
		}
		s.Address = normalizeOptional(address)
	}
	if s.Note != nil {
		note := strings.TrimSpace(*s.Note)
		if len([]rune(note)) > 1000 {
			return errors.New("Ghi chú nhà cung cấp tối đa 1000 ký tự")
		}
		s.Note = normalizeOptional(note)
	}
	return nil
}

func normalizeOptional(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
