package analytics

import "time"

// OverviewResponse là read model trang Tổng quan vận hành trong ngày.
type OverviewResponse struct {
	GeneratedAt       time.Time           `json:"generated_at"`
	KPI               OverviewKPI         `json:"kpi"`
	Revenue7D         []DailyRevenuePoint `json:"revenue_7d"`
	LowStock          []LowStockProduct   `json:"low_stock"`
	TodayAppointments []TodayAppointment  `json:"today_appointments"`
	RecentOrders      []RecentOrder       `json:"recent_orders"`
}

type OverviewKPI struct {
	RevenueToday        float64 `json:"revenue_today"`
	RevenueChange       float64 `json:"revenue_change"`
	AOVToday            float64 `json:"aov_today"`
	AOVChange           float64 `json:"aov_change"`
	AppointmentsToday   int     `json:"appointments_today"`
	AppointmentsPending int     `json:"appointments_pending"`
	OrdersToday         int     `json:"orders_today"`
	OrdersUnpaid        int     `json:"orders_unpaid"`
}

type DailyRevenuePoint struct {
	Date         string  `json:"date"`
	Label        string  `json:"label"`
	Revenue      float64 `json:"revenue"`
	Appointments int     `json:"appointments"`
}

type LowStockProduct struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Unit      string  `json:"unit"`
	Stock     float64 `json:"stock"`
	SafeLevel float64 `json:"safe_level"`
}

type TodayAppointment struct {
	ID             string    `json:"id"`
	StartTime      time.Time `json:"start_time"`
	CustomerName   string    `json:"customer_name"`
	ServiceSummary string    `json:"service_summary"`
	StaffName      string    `json:"staff_name"`
	Status         string    `json:"status"`
}

type RecentOrder struct {
	ID            string  `json:"id"`
	Code          string  `json:"code"`
	CustomerName  string  `json:"customer_name"`
	Summary       string  `json:"summary"`
	TotalAmount   float64 `json:"total_amount"`
	PaymentStatus string  `json:"payment_status"`
}

// OrderMetrics là số liệu đơn hàng thô repository trả về cho một ngày.
type OrderMetrics struct {
	Revenue         float64 `db:"revenue"`
	CompletedOrders int     `db:"completed_orders"`
	TotalOrders     int     `db:"total_orders"`
	UnpaidOrders    int     `db:"unpaid_orders"`
}

// AppointmentSummary là số liệu lịch hẹn thô của một ngày.
type AppointmentSummary struct {
	Total   int `db:"total"`
	Pending int `db:"pending"`
}

// DailyRevenueRow là doanh thu + số lịch hẹn của một ngày (yyyy-MM-dd).
type DailyRevenueRow struct {
	Day          string  `db:"day"`
	Revenue      float64 `db:"revenue"`
	Appointments int     `db:"appointments"`
}

// LowStockRow là một sản phẩm dưới mức tồn an toàn.
type LowStockRow struct {
	ID        string  `db:"id"`
	Name      string  `db:"name"`
	Unit      string  `db:"unit"`
	Stock     float64 `db:"stock_quantity"`
	SafeLevel float64 `db:"min_stock"`
}

// TodayAppointmentRow là một lịch hẹn trong ngày kèm tên khách/nhân viên.
type TodayAppointmentRow struct {
	ID             string    `db:"id"`
	StartTime      time.Time `db:"start_time"`
	CustomerName   string    `db:"customer_name"`
	ServiceSummary string    `db:"service_summary"`
	StaffName      string    `db:"staff_name"`
	Status         string    `db:"status"`
}

// RecentOrderRow là một đơn hàng gần đây kèm trạng thái thanh toán.
type RecentOrderRow struct {
	ID            string  `db:"id"`
	Code          string  `db:"code"`
	CustomerName  string  `db:"customer_name"`
	Summary       string  `db:"summary"`
	TotalAmount   float64 `db:"total_amount"`
	PaymentStatus string  `db:"payment_status"`
}
