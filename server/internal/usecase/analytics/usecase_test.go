package analytics

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	domain "github.com/daidat02/server/internal/domain/analytics"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func withAnalyticsOrgCtx(orgID string) context.Context {
	return context.WithValue(context.Background(), middlewares.OrgIdKey, orgID)
}

func assertAppErrorCode(t *testing.T, err error, expectedCode int) {
	t.Helper()
	var appErr *apperror.AppError
	assert.True(t, errors.As(err, &appErr), "Lỗi phải là *apperror.AppError")
	if appErr != nil {
		assert.Equal(t, expectedCode, appErr.StatusCode)
	}
}

func currentMonth() (time.Time, time.Time) {
	return time.Date(2026, time.November, 1, 0, 0, 0, 0, time.Local),
		endOfDay(time.Date(2026, time.November, 30, 0, 0, 0, 0, time.Local))
}

func TestGetRevenueReport_Success(t *testing.T) {
	repo := new(MockAnalyticsRepository)
	u := NewAnalyticsUsecase(repo)
	from, to := currentMonth()
	previousFrom, previousTo := previousPeriod(from, to)
	annualFrom := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.Local)
	annualTo := endOfDay(time.Date(2026, time.December, 31, 0, 0, 0, 0, time.Local))

	repo.On("GetTotals", mock.Anything, "org-123", from, to).
		Return(&domain.Totals{Revenue: 1000, COGS: 200, Commission: 100, OperatingExpense: 150}, nil).Once()
	repo.On("GetTotals", mock.Anything, "org-123", previousFrom, previousTo).
		Return(&domain.Totals{Revenue: 800, COGS: 100, Commission: 80, OperatingExpense: 120}, nil).Once()
	monthly := []*domain.MonthlyAggregate{
		{Key: "2026-11", Revenue: 1000, COGS: 200, Commission: 100, OperatingExpense: 150},
	}
	repo.On("GetMonthly", mock.Anything, "org-123", from, to).Return(monthly, nil).Once()
	repo.On("GetMonthly", mock.Anything, "org-123", annualFrom, annualTo).Return(monthly, nil).Once()
	repo.On("GetComposition", mock.Anything, "org-123", from, to).
		Return(&domain.CompositionAmounts{Service: 700, Retail: 250}, nil).Once()
	repo.On("GetTopServices", mock.Anything, "org-123", from, to, 5).
		Return([]*domain.TopService{
			{ID: "svc-1", Name: "Cắt tóc", Category: "Cắt tóc", Turns: 12, Revenue: 600, Profit: 300},
		}, nil).Once()

	result, err := u.GetRevenueReport(withAnalyticsOrgCtx("org-123"), "2026-11-01", "2026-11-30")

	assert.NoError(t, err)
	assert.Equal(t, from, result.Range.From)
	assert.Equal(t, to, result.Range.To)
	assert.InDelta(t, 1000, result.KPI.Revenue, 0.001)
	assert.InDelta(t, 550, result.KPI.NetProfit, 0.001)
	assert.InDelta(t, 55, result.KPI.Margin, 0.001)
	assert.InDelta(t, 25, result.KPI.RevenueChange, 0.001)
	assert.InDelta(t, 10, result.KPI.NetProfitChange, 0.001)
	assert.InDelta(t, 25, result.KPI.OperatingExpenseChange, 0.001)
	assert.InDelta(t, -7.5, result.KPI.MarginChange, 0.001)

	assert.Len(t, result.Monthly, 1)
	assert.InDelta(t, 550, result.Monthly[0].NetProfit, 0.001)
	assert.Equal(t, 2026, result.AnnualYear)
	assert.Len(t, result.AnnualMonthly, 12)
	assert.InDelta(t, 550, result.AnnualMonthly[10].NetProfit, 0.001)

	assert.Len(t, result.ProfitBreakdown, 6)
	assert.Equal(t, "gross", result.ProfitBreakdown[3].ID)
	assert.InDelta(t, 700, result.ProfitBreakdown[3].Amount, 0.001)
	assert.Len(t, result.Composition, 3)
	assert.InDelta(t, 50, result.Composition[2].Amount, 0.001)
	assert.InDelta(t, 5, result.Composition[2].Ratio, 0.001)
	assert.Len(t, result.TopServices, 1)

	repo.AssertExpectations(t)
}

func TestGetRevenueReport_DefaultCurrentMonth(t *testing.T) {
	repo := new(MockAnalyticsRepository)
	u := NewAnalyticsUsecase(repo)

	repo.On("GetTotals", mock.Anything, "org-123", mock.Anything, mock.Anything).
		Return(&domain.Totals{}, nil)
	repo.On("GetMonthly", mock.Anything, "org-123", mock.Anything, mock.Anything).
		Return([]*domain.MonthlyAggregate{}, nil)
	repo.On("GetComposition", mock.Anything, "org-123", mock.Anything, mock.Anything).
		Return(&domain.CompositionAmounts{}, nil)
	repo.On("GetTopServices", mock.Anything, "org-123", mock.Anything, mock.Anything, 5).
		Return([]*domain.TopService{}, nil)

	result, err := u.GetRevenueReport(withAnalyticsOrgCtx("org-123"), "", "")

	now := time.Now()
	assert.NoError(t, err)
	assert.Equal(t, 1, result.Range.From.Day())
	assert.Equal(t, now.Month(), result.Range.From.Month())
	assert.Equal(t, now.Year(), result.Range.From.Year())
	assert.True(t, result.Range.To.After(result.Range.From))
	repo.AssertExpectations(t)
}

func TestGetRevenueReport_InvalidDates(t *testing.T) {
	u := NewAnalyticsUsecase(new(MockAnalyticsRepository))

	testCases := []struct {
		name string
		from string
		to   string
	}{
		{name: "sai định dạng", from: "31/11/2026", to: ""},
		{name: "from sau to", from: "2026-12-01", to: "2026-11-01"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := u.GetRevenueReport(withAnalyticsOrgCtx("org-123"), tc.from, tc.to)
			assertAppErrorCode(t, err, 400)
		})
	}
}

func TestGetRevenueReport_MissingOrg(t *testing.T) {
	u := NewAnalyticsUsecase(new(MockAnalyticsRepository))

	_, err := u.GetRevenueReport(context.Background(), "2026-11-01", "2026-11-30")

	assertAppErrorCode(t, err, 400)
}

func TestGetRevenueReport_RepositoryError(t *testing.T) {
	repo := new(MockAnalyticsRepository)
	u := NewAnalyticsUsecase(repo)

	repo.On("GetTotals", mock.Anything, "org-123", mock.Anything, mock.Anything).
		Return(nil, errors.New("db down")).Once()

	_, err := u.GetRevenueReport(withAnalyticsOrgCtx("org-123"), "2026-11-01", "2026-11-30")

	assertAppErrorCode(t, err, 500)
	repo.AssertExpectations(t)
}

func TestResolvePeriod_OnlyFromUsesEndOfMonth(t *testing.T) {
	from, to, err := resolvePeriod("2026-11-10", "")

	assert.NoError(t, err)
	assert.Equal(t, time.Date(2026, time.November, 10, 0, 0, 0, 0, time.Local), from)
	assert.Equal(t, endOfDay(time.Date(2026, time.November, 30, 0, 0, 0, 0, time.Local)), to)
}

func TestPercentChange(t *testing.T) {
	assert.Equal(t, 0.0, percentChange(0, 0))
	assert.Equal(t, 100.0, percentChange(10, 0))
	assert.InDelta(t, -50.0, percentChange(50, 100), 0.001)
}
