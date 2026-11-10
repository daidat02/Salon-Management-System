package analytics

import (
	"context"
	"time"
)

// AnalyticsRepository là read-only seam cho báo cáo doanh thu/lợi nhuận và
// tổng quan vận hành. Không tái sử dụng repository của Order/Cashflow/
// Appointment/Product để tránh phụ thuộc chéo module.
type AnalyticsRepository interface {
	GetTotals(ctx context.Context, orgID string, from, to time.Time) (*Totals, error)
	GetMonthly(ctx context.Context, orgID string, from, to time.Time) ([]*MonthlyAggregate, error)
	GetComposition(ctx context.Context, orgID string, from, to time.Time) (*CompositionAmounts, error)
	GetTopServices(ctx context.Context, orgID string, from, to time.Time, limit int) ([]*TopService, error)

	GetOrderMetrics(ctx context.Context, orgID string, from, to time.Time) (*OrderMetrics, error)
	GetAppointmentSummary(ctx context.Context, orgID string, from, to time.Time) (*AppointmentSummary, error)
	GetDailyRevenue(ctx context.Context, orgID string, from, to time.Time) ([]*DailyRevenueRow, error)
	GetLowStockProducts(ctx context.Context, orgID string, limit int) ([]*LowStockRow, error)
	GetTodayAppointments(ctx context.Context, orgID string, from, to time.Time, limit int) ([]*TodayAppointmentRow, error)
	GetRecentOrders(ctx context.Context, orgID string, limit int) ([]*RecentOrderRow, error)
}
