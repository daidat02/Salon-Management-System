package service

import "time"

type ServiceMaterialInput struct {
	ProductID string  `json:"product_id" binding:"required,uuid"`
	Quantity  float64 `json:"quantity" binding:"required,gt=0"` // Định lượng tiêu hao (vd: 0.75 tuýp, 150 gram)
	// Unit đơn vị của Quantity (rỗng = đơn vị lớn của SP).
	// Chỉ chấp nhận unit lớn hoặc net_unit của sản phẩm, server tự mặc định khi rỗng.
	Unit *string `json:"unit"`
}

type CreateServiceRequest struct {
	CategoryID      *string                `json:"category_id"`
	Name            string                 `json:"name"`
	Description     string                 `json:"description"`
	DurationMinutes int                    `json:"duration_minutes"`
	BufferMinutes   int                    `json:"buffer_minutes"`
	Price           float64                `json:"price"`
	IsActive        *bool                  `json:"is_active"`
	Materials       []ServiceMaterialInput `json:"materials"`
}

type UpdateServiceRequest struct {
	CategoryID      *string `json:"category_id"`
	Name            string  `json:"name"`
	Description     string  `json:"description"`
	DurationMinutes int     `json:"duration_minutes"`
	BufferMinutes   int     `json:"buffer_minutes"`
	Price           float64 `json:"price"`
	IsActive        *bool   `json:"is_active"`
}

// ReplaceServiceMaterialsRequest thay toàn bộ định mức vật tư của 1 dịch vụ.
// Mảng rỗng = xóa hết định mức hiện có.
type ReplaceServiceMaterialsRequest struct {
	Materials []ServiceMaterialInput `json:"materials"`
}

type ServiceResponse struct {
	ID               string     `json:"id"`
	OrganizationID   string     `json:"organization_id"`
	CategoryID       *string    `json:"category_id"`
	CategoryName     *string    `json:"category_name"`
	Name             string     `json:"name"`
	Description      string     `json:"description"`
	DurationMinutes  int        `json:"duration_minutes"`
	BufferMinutes    int        `json:"buffer_minutes"`
	Price            float64    `json:"price"`
	IsActive         bool       `json:"is_active"`
	SoldThisMonth    float64    `json:"sold_this_month"`
	RevenueThisMonth float64    `json:"revenue_this_month"`
	CreatedAt        *time.Time `json:"created_at"`
	UpdatedAt        *time.Time `json:"updated_at"`
}

// ServiceMonthlyRevenueResponse doanh thu của dịch vụ trong một tháng.
type ServiceMonthlyRevenueResponse struct {
	Month   string  `json:"month"`
	Revenue float64 `json:"revenue"`
}

// ServiceDetailResponse là thông tin đầy đủ của dịch vụ kèm thống kê tháng.
type ServiceDetailResponse struct {
	ServiceResponse
	BookingsThisMonth     int64                           `json:"bookings_this_month"`
	CompletedThisMonth    int64                           `json:"completed_this_month"`
	MaterialCostThisMonth float64                         `json:"material_cost_this_month"`
	RevenueLast6Months    []ServiceMonthlyRevenueResponse `json:"revenue_last_6_months"`
}

// ServiceStatsResponse thống kê tổng quan dịch vụ của salon.
type ServiceStatsResponse struct {
	TotalServices       int64   `json:"total_services" db:"total_services"`
	ActiveServices      int64   `json:"active_services" db:"active_services"`
	InactiveServices    int64   `json:"inactive_services" db:"inactive_services"`
	ServiceRevenueMonth float64 `json:"service_revenue_month" db:"service_revenue_month"`
}
