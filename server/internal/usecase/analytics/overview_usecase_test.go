package analytics

import (
	"context"
	"testing"
	"time"

	domain "github.com/daidat02/server/internal/domain/analytics"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func overviewPeriods() (todayFrom, todayTo, yesterdayFrom, yesterdayTo, weekFrom time.Time) {
	now := time.Now()
	todayFrom = startOfDay(now)
	todayTo = endOfDay(now)
	yesterday := now.AddDate(0, 0, -1)
	yesterdayFrom = startOfDay(yesterday)
	yesterdayTo = endOfDay(yesterday)
	weekFrom = todayFrom.AddDate(0, 0, -6)
	return
}

func TestGetOverview_Success(t *testing.T) {
	repo := new(MockAnalyticsRepository)
	u := NewAnalyticsUsecase(repo)
	todayFrom, todayTo, yesterdayFrom, yesterdayTo, weekFrom := overviewPeriods()
	now := time.Now()

	repo.On("GetOrderMetrics", mock.Anything, "org-123", todayFrom, todayTo).
		Return(&domain.OrderMetrics{Revenue: 1000, CompletedOrders: 4, TotalOrders: 5, UnpaidOrders: 2}, nil).Once()
	repo.On("GetOrderMetrics", mock.Anything, "org-123", yesterdayFrom, yesterdayTo).
		Return(&domain.OrderMetrics{Revenue: 800, CompletedOrders: 2, TotalOrders: 3, UnpaidOrders: 1}, nil).Once()
	repo.On("GetAppointmentSummary", mock.Anything, "org-123", todayFrom, todayTo).
		Return(&domain.AppointmentSummary{Total: 12, Pending: 3}, nil).Once()
	repo.On("GetDailyRevenue", mock.Anything, "org-123", weekFrom, todayTo).
		Return([]*domain.DailyRevenueRow{
			{Day: todayFrom.Format("2006-01-02"), Revenue: 1000, Appointments: 5},
		}, nil).Once()
	repo.On("GetLowStockProducts", mock.Anything, "org-123", 5).
		Return([]*domain.LowStockRow{
			{ID: "p1", Name: "Dầu gội", Unit: "chai", Stock: 3, SafeLevel: 10},
		}, nil).Once()
	repo.On("GetTodayAppointments", mock.Anything, "org-123", todayFrom, todayTo, 5).
		Return([]*domain.TodayAppointmentRow{
			{
				ID:             "a1",
				StartTime:      todayFrom.Add(9 * time.Hour),
				CustomerName:   "Lan Hương",
				ServiceSummary: "Nhuộm Balayage",
				StaffName:      "Tuấn Kiệt",
				Status:         "in_progress",
			},
		}, nil).Once()
	repo.On("GetRecentOrders", mock.Anything, "org-123", 5).
		Return([]*domain.RecentOrderRow{
			{ID: "o1", Code: "DH-1049", CustomerName: "Phương Uyên", Summary: "Combo Cắt", TotalAmount: 1850000, PaymentStatus: "paid"},
		}, nil).Once()

	result, err := u.GetOverview(withAnalyticsOrgCtx("org-123"))

	assert.NoError(t, err)
	assert.NotZero(t, result.GeneratedAt)
	assert.InDelta(t, 1000, result.KPI.RevenueToday, 0.001)
	assert.InDelta(t, 25, result.KPI.RevenueChange, 0.001)
	assert.InDelta(t, 250, result.KPI.AOVToday, 0.001)
	assert.InDelta(t, -37.5, result.KPI.AOVChange, 0.001)
	assert.Equal(t, 12, result.KPI.AppointmentsToday)
	assert.Equal(t, 3, result.KPI.AppointmentsPending)
	assert.Equal(t, 5, result.KPI.OrdersToday)
	assert.Equal(t, 2, result.KPI.OrdersUnpaid)

	assert.Len(t, result.Revenue7D, 7)
	assert.Equal(t, weekFrom.Format("2006-01-02"), result.Revenue7D[0].Date)
	assert.Equal(t, weekdayLabel(weekFrom.Weekday()), result.Revenue7D[0].Label)
	assert.Equal(t, now.Format("2006-01-02"), result.Revenue7D[6].Date)
	assert.InDelta(t, 1000, result.Revenue7D[6].Revenue, 0.001)
	assert.Equal(t, 5, result.Revenue7D[6].Appointments)
	assert.InDelta(t, 0, result.Revenue7D[0].Revenue, 0.001)

	assert.Len(t, result.LowStock, 1)
	assert.Equal(t, "p1", result.LowStock[0].ID)
	assert.Len(t, result.TodayAppointments, 1)
	assert.Equal(t, "a1", result.TodayAppointments[0].ID)
	assert.Len(t, result.RecentOrders, 1)
	assert.Equal(t, "paid", result.RecentOrders[0].PaymentStatus)

	repo.AssertExpectations(t)
}

func TestGetOverview_PreviousPeriodZero(t *testing.T) {
	repo := new(MockAnalyticsRepository)
	u := NewAnalyticsUsecase(repo)
	todayFrom, todayTo, yesterdayFrom, yesterdayTo, weekFrom := overviewPeriods()

	repo.On("GetOrderMetrics", mock.Anything, "org-123", todayFrom, todayTo).
		Return(&domain.OrderMetrics{Revenue: 1000, CompletedOrders: 4, TotalOrders: 4}, nil).Once()
	repo.On("GetOrderMetrics", mock.Anything, "org-123", yesterdayFrom, yesterdayTo).
		Return(&domain.OrderMetrics{}, nil).Once()
	repo.On("GetAppointmentSummary", mock.Anything, "org-123", todayFrom, todayTo).
		Return(&domain.AppointmentSummary{}, nil).Once()
	repo.On("GetDailyRevenue", mock.Anything, "org-123", weekFrom, todayTo).
		Return([]*domain.DailyRevenueRow{}, nil).Once()
	repo.On("GetLowStockProducts", mock.Anything, "org-123", 5).
		Return([]*domain.LowStockRow{}, nil).Once()
	repo.On("GetTodayAppointments", mock.Anything, "org-123", todayFrom, todayTo, 5).
		Return([]*domain.TodayAppointmentRow{}, nil).Once()
	repo.On("GetRecentOrders", mock.Anything, "org-123", 5).
		Return([]*domain.RecentOrderRow{}, nil).Once()

	result, err := u.GetOverview(withAnalyticsOrgCtx("org-123"))

	assert.NoError(t, err)
	assert.InDelta(t, 100, result.KPI.RevenueChange, 0.001)
	assert.InDelta(t, 100, result.KPI.AOVChange, 0.001)
	assert.Len(t, result.Revenue7D, 7)
	assert.Empty(t, result.LowStock)
	assert.Empty(t, result.TodayAppointments)
	assert.Empty(t, result.RecentOrders)

	repo.AssertExpectations(t)
}

func TestGetOverview_MissingOrg(t *testing.T) {
	repo := new(MockAnalyticsRepository)
	u := NewAnalyticsUsecase(repo)

	_, err := u.GetOverview(context.Background())

	assertAppErrorCode(t, err, 400)
	repo.AssertNotCalled(t, "GetOrderMetrics", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	repo.AssertNotCalled(t, "GetLowStockProducts", mock.Anything, mock.Anything, mock.Anything)
}

func TestGetOverview_RepositoryError(t *testing.T) {
	repo := new(MockAnalyticsRepository)
	u := NewAnalyticsUsecase(repo)
	todayFrom, todayTo, _, _, _ := overviewPeriods()

	repo.On("GetOrderMetrics", mock.Anything, "org-123", todayFrom, todayTo).
		Return(nil, context.DeadlineExceeded).Once()

	_, err := u.GetOverview(withAnalyticsOrgCtx("org-123"))

	assertAppErrorCode(t, err, 500)
	repo.AssertNotCalled(t, "GetAppointmentSummary", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	repo.AssertNotCalled(t, "GetRecentOrders", mock.Anything, mock.Anything, mock.Anything)
}
