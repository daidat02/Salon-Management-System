package organization

import "errors"

const (
	StatusActive    = "active"
	StatusSuspended = "suspended"
	StatusClosed    = "closed"
)

// Organization là salon/đơn vị sử dụng hệ thống.
type Organization struct {
	ID       string
	Name     string
	Slug     string
	Phone    string
	Address  string
	Timezone string
	Status   string
	Email    string
	Website  string
	TaxCode  string
	Slogan   string
	LogoURL  string
	IsDemo   bool
}

// OwnerAccount là tài khoản chủ salon tạo kèm organization.
type OwnerAccount struct {
	ID           string
	Phone        string
	PasswordHash string
	FullName     string
}

// Validate kiểm tra dữ liệu bắt buộc trước khi ghi DB.
func (o *Organization) Validate() error {
	if o.Name == "" {
		return errors.New("Tên tổ chức không được để trống")
	}
	if o.Slug == "" {
		return errors.New("Slug không được để trống")
	}
	if o.Timezone == "" {
		o.Timezone = "Asia/Ho_Chi_Minh"
	}
	if o.Status == "" {
		o.Status = StatusActive
	}
	if o.Status != StatusActive && o.Status != StatusSuspended && o.Status != StatusClosed {
		return errors.New("Trạng thái tổ chức không hợp lệ")
	}
	return nil
}
