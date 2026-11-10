package analytics

import (
	"context"
	"fmt"
	"time"

	domain "github.com/daidat02/server/internal/domain/analytics"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
)

const overviewListLimit = 5

// GetOverview tổng hợp số liệu vận hành trong ngày cho trang Tổng quan.
func (u *AnalyticsUsecase) GetOverview(ctx context.Context) (*domain.OverviewResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	todayFrom := startOfDay(now)
	todayTo := endOfDay(now)
	yesterday := now.AddDate(0, 0, -1)
	yesterdayFrom := startOfDay(yesterday)
	yesterdayTo := endOfDay(yesterday)
	weekFrom := todayFrom.AddDate(0, 0, -6)

	current, err := u.repo.GetOrderMetrics(ctx, orgID, todayFrom, todayTo)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy số liệu đơn hàng hôm nay", err)
	}
	previous, err := u.repo.GetOrderMetrics(ctx, orgID, yesterdayFrom, yesterdayTo)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy số liệu đơn hàng hôm qua", err)
	}
	appointments, err := u.repo.GetAppointmentSummary(ctx, orgID, todayFrom, todayTo)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy số liệu lịch hẹn hôm nay", err)
	}
	daily, err := u.repo.GetDailyRevenue(ctx, orgID, weekFrom, todayTo)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy doanh thu 7 ngày", err)
	}
	lowStock, err := u.repo.GetLowStockProducts(ctx, orgID, overviewListLimit)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy cảnh báo tồn kho", err)
	}
	todayAppointments, err := u.repo.GetTodayAppointments(ctx, orgID, todayFrom, todayTo, overviewListLimit)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy lịch hẹn hôm nay", err)
	}
	recentOrders, err := u.repo.GetRecentOrders(ctx, orgID, overviewListLimit)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy đơn hàng gần đây", err)
	}

	aovToday := averageOrderValue(current)
	aovYesterday := averageOrderValue(previous)

	return &domain.OverviewResponse{
		GeneratedAt: now,
		KPI: domain.OverviewKPI{
			RevenueToday:        current.Revenue,
			RevenueChange:       percentChange(current.Revenue, previous.Revenue),
			AOVToday:            aovToday,
			AOVChange:           percentChange(aovToday, aovYesterday),
			AppointmentsToday:   appointments.Total,
			AppointmentsPending: appointments.Pending,
			OrdersToday:         current.TotalOrders,
			OrdersUnpaid:        current.UnpaidOrders,
		},
		Revenue7D:         buildDailyRevenue(daily, weekFrom),
		LowStock:          buildLowStock(lowStock),
		TodayAppointments: buildTodayAppointments(todayAppointments),
		RecentOrders:      buildRecentOrders(recentOrders),
	}, nil
}

func averageOrderValue(metrics *domain.OrderMetrics) float64 {
	if metrics == nil || metrics.CompletedOrders == 0 {
		return 0
	}
	return metrics.Revenue / float64(metrics.CompletedOrders)
}

func buildDailyRevenue(rows []*domain.DailyRevenueRow, weekFrom time.Time) []domain.DailyRevenuePoint {
	byDate := make(map[string]*domain.DailyRevenueRow, len(rows))
	for _, row := range rows {
		if row != nil {
			byDate[row.Day] = row
		}
	}

	points := make([]domain.DailyRevenuePoint, 0, 7)
	for i := 0; i < 7; i++ {
		day := weekFrom.AddDate(0, 0, i)
		key := day.Format("2006-01-02")
		point := domain.DailyRevenuePoint{
			Date:  key,
			Label: weekdayLabel(day.Weekday()),
		}
		if row, ok := byDate[key]; ok {
			point.Revenue = row.Revenue
			point.Appointments = row.Appointments
		}
		points = append(points, point)
	}
	return points
}

func weekdayLabel(weekday time.Weekday) string {
	if weekday == time.Sunday {
		return "CN"
	}
	return fmt.Sprintf("T%d", int(weekday)+1)
}

func buildLowStock(rows []*domain.LowStockRow) []domain.LowStockProduct {
	items := make([]domain.LowStockProduct, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		items = append(items, domain.LowStockProduct{
			ID:        row.ID,
			Name:      row.Name,
			Unit:      row.Unit,
			Stock:     row.Stock,
			SafeLevel: row.SafeLevel,
		})
	}
	return items
}

func buildTodayAppointments(rows []*domain.TodayAppointmentRow) []domain.TodayAppointment {
	items := make([]domain.TodayAppointment, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		items = append(items, domain.TodayAppointment{
			ID:             row.ID,
			StartTime:      row.StartTime,
			CustomerName:   row.CustomerName,
			ServiceSummary: row.ServiceSummary,
			StaffName:      row.StaffName,
			Status:         row.Status,
		})
	}
	return items
}

func buildRecentOrders(rows []*domain.RecentOrderRow) []domain.RecentOrder {
	items := make([]domain.RecentOrder, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		items = append(items, domain.RecentOrder{
			ID:            row.ID,
			Code:          row.Code,
			CustomerName:  row.CustomerName,
			Summary:       row.Summary,
			TotalAmount:   row.TotalAmount,
			PaymentStatus: row.PaymentStatus,
		})
	}
	return items
}
