package postgres

import (
	"context"
	"fmt"
	"time"

	domain "github.com/daidat02/server/internal/domain/analytics"
)

func (r *PostgresAnalyticsRepository) GetOrderMetrics(ctx context.Context, orgID string, from, to time.Time) (*domain.OrderMetrics, error) {
	var metrics domain.OrderMetrics
	if err := r.qx.GetContext(ctx, &metrics, getOverviewOrderMetricsQuery, orgID, from, to); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy số liệu đơn hàng tổng quan: %w", err)
	}
	return &metrics, nil
}

func (r *PostgresAnalyticsRepository) GetAppointmentSummary(ctx context.Context, orgID string, from, to time.Time) (*domain.AppointmentSummary, error) {
	var summary domain.AppointmentSummary
	if err := r.qx.GetContext(ctx, &summary, getOverviewAppointmentSummaryQuery, orgID, from, to); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy số liệu lịch hẹn tổng quan: %w", err)
	}
	return &summary, nil
}

func (r *PostgresAnalyticsRepository) GetDailyRevenue(ctx context.Context, orgID string, from, to time.Time) ([]*domain.DailyRevenueRow, error) {
	rows := make([]*domain.DailyRevenueRow, 0)
	if err := r.qx.SelectContext(ctx, &rows, getOverviewDailyRevenueQuery, orgID, from, to); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy doanh thu 7 ngày: %w", err)
	}
	return rows, nil
}

func (r *PostgresAnalyticsRepository) GetLowStockProducts(ctx context.Context, orgID string, limit int) ([]*domain.LowStockRow, error) {
	rows := make([]*domain.LowStockRow, 0)
	if err := r.qx.SelectContext(ctx, &rows, getOverviewLowStockQuery, orgID, limit); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy cảnh báo tồn kho: %w", err)
	}
	return rows, nil
}

func (r *PostgresAnalyticsRepository) GetTodayAppointments(ctx context.Context, orgID string, from, to time.Time, limit int) ([]*domain.TodayAppointmentRow, error) {
	rows := make([]*domain.TodayAppointmentRow, 0)
	if err := r.qx.SelectContext(ctx, &rows, getOverviewTodayAppointmentsQuery, orgID, from, to, limit); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy lịch hẹn hôm nay: %w", err)
	}
	return rows, nil
}

func (r *PostgresAnalyticsRepository) GetRecentOrders(ctx context.Context, orgID string, limit int) ([]*domain.RecentOrderRow, error) {
	rows := make([]*domain.RecentOrderRow, 0)
	if err := r.qx.SelectContext(ctx, &rows, getOverviewRecentOrdersQuery, orgID, limit); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy đơn hàng gần đây: %w", err)
	}
	return rows, nil
}
