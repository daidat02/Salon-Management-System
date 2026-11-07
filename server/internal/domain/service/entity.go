package service

import (
	"errors"
	"time"
)

type Service struct {
	ID              string
	OrganizationID  string
	CategoryID      *string
	CategoryName    *string
	Name            string
	Description     string
	DurationMinutes int
	BufferMinutes   int
	Price           float64
	IsActive        bool
	// SoldThisMonth/RevenueThisMonth là số liệu tổng hợp cho API danh sách.
	SoldThisMonth    float64
	RevenueThisMonth float64
	CreatedAt        *time.Time
	UpdatedAt        *time.Time
}

// ServiceMonthlySales doanh số bán ra của một dịch vụ trong một tháng.
type ServiceMonthlySales struct {
	MonthStart time.Time
	Quantity   float64
	Revenue    float64
}

// ServiceBookingStats thống kê lịch hẹn/vật tư của một dịch vụ trong tháng hiện tại.
type ServiceBookingStats struct {
	BookingsThisMonth     int64
	CompletedThisMonth    int64
	MaterialCostThisMonth float64
}

type ServiceMaterial struct {
	ID             string  `json:"id"`
	OrganizationID string  `json:"organization_id"`
	ServiceID      string  `json:"service_id"`
	ProductID      string  `json:"product_id"`
	Quantity       float64 `json:"quantity"`
	// Unit đơn vị của Quantity (VD tuýp, can, ml).
	Unit      string     `json:"unit"`
	CreatedAt *time.Time `json:"created_at"`
	UpdatedAt *time.Time `json:"updated_at"`

	// Thêm các trường lấy từ bảng products (phải khớp 100% tên key trong json_build_object)
	ProductName string  `json:"product_name"`
	ProductUnit string  `json:"product_unit"`
	CostPrice   float64 `json:"cost_price"`
}

func (s *Service) Validate() error {
	if s.Name == "" {
		return errors.New("Tên dịch vụ không được để trống")
	}
	if s.DurationMinutes <= 0 {
		return errors.New("Thời lượng dịch vụ phải lớn hơn 0 phút")
	}
	if s.BufferMinutes < 0 {
		return errors.New("Thời gian đệm không được âm")
	}
	if s.Price < 0 {
		return errors.New("Giá dịch vụ không được âm")
	}
	return nil
}

func (sm *ServiceMaterial) Validate() error {
	if sm.Quantity <= 0 {
		return errors.New("Số lượng nguyên vật liệu phải lớn hơn 0")
	}
	return nil
}
