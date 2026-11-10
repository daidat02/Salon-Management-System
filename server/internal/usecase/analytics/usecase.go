package analytics

import (
	"context"
	"fmt"
	"strings"
	"time"

	domain "github.com/daidat02/server/internal/domain/analytics"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
)

type AnalyticsUsecase struct {
	repo domain.AnalyticsRepository
}

func NewAnalyticsUsecase(repo domain.AnalyticsRepository) *AnalyticsUsecase {
	return &AnalyticsUsecase{repo: repo}
}

// GetRevenueReport tổng hợp báo cáo doanh thu/lợi nhuận theo kỳ.
func (u *AnalyticsUsecase) GetRevenueReport(ctx context.Context, rawFrom, rawTo string) (*domain.RevenueReportResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	from, to, err := resolvePeriod(rawFrom, rawTo)
	if err != nil {
		return nil, err
	}
	previousFrom, previousTo := previousPeriod(from, to)

	current, err := u.repo.GetTotals(ctx, orgID, from, to)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy doanh thu báo cáo", err)
	}
	previous, err := u.repo.GetTotals(ctx, orgID, previousFrom, previousTo)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy doanh thu kỳ trước", err)
	}
	monthly, err := u.repo.GetMonthly(ctx, orgID, from, to)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy doanh thu theo tháng", err)
	}

	annualYear := to.Year()
	annualFrom := time.Date(annualYear, time.January, 1, 0, 0, 0, 0, time.Local)
	annualTo := endOfDay(time.Date(annualYear, time.December, 31, 0, 0, 0, 0, time.Local))
	annualMonthly, err := u.repo.GetMonthly(ctx, orgID, annualFrom, annualTo)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy doanh thu theo năm", err)
	}

	composition, err := u.repo.GetComposition(ctx, orgID, from, to)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy cơ cấu doanh thu", err)
	}
	topServices, err := u.repo.GetTopServices(ctx, orgID, from, to, 5)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy top dịch vụ", err)
	}
	topServiceItems := make([]domain.TopService, 0, len(topServices))
	for _, service := range topServices {
		if service != nil {
			topServiceItems = append(topServiceItems, *service)
		}
	}

	return &domain.RevenueReportResponse{
		Range:           domain.DateRange{From: from, To: to},
		KPI:             buildKPI(current, previous),
		Monthly:         fillMonthly(monthly, from, to),
		AnnualYear:      annualYear,
		AnnualMonthly:   fillMonthly(annualMonthly, annualFrom, annualTo),
		ProfitBreakdown: buildProfitBreakdown(current),
		Composition:     buildComposition(composition, current.Revenue),
		TopServices:     topServiceItems,
	}, nil
}

func parseDateParam(raw, field string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		value := parsed.In(time.Local)
		return &value, nil
	}
	if parsed, err := time.ParseInLocation("2006-01-02", raw, time.Local); err == nil {
		return &parsed, nil
	}
	return nil, apperror.New(400, fmt.Sprintf("Tham số %s không hợp lệ (RFC3339 hoặc yyyy-MM-dd)", field), nil)
}

func resolvePeriod(rawFrom, rawTo string) (time.Time, time.Time, error) {
	parsedFrom, err := parseDateParam(rawFrom, "date_from")
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	parsedTo, err := parseDateParam(rawTo, "date_to")
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	now := time.Now()
	var from, to time.Time
	switch {
	case parsedFrom == nil && parsedTo == nil:
		from = startOfMonth(now)
		to = endOfMonth(now)
	case parsedFrom == nil:
		from = startOfMonth(*parsedTo)
		to = endOfDay(*parsedTo)
	case parsedTo == nil:
		from = startOfDay(*parsedFrom)
		to = endOfMonth(*parsedFrom)
	default:
		from = startOfDay(*parsedFrom)
		to = endOfDay(*parsedTo)
	}

	if from.After(to) {
		return time.Time{}, time.Time{}, apperror.New(400, "Khoảng thời gian không hợp lệ (date_from phải trước date_to)", nil)
	}
	return from, to, nil
}

func startOfDay(value time.Time) time.Time {
	return time.Date(value.Year(), value.Month(), value.Day(), 0, 0, 0, 0, value.Location())
}

func endOfDay(value time.Time) time.Time {
	return time.Date(value.Year(), value.Month(), value.Day(), 23, 59, 59, 999999999, value.Location())
}

func startOfMonth(value time.Time) time.Time {
	return time.Date(value.Year(), value.Month(), 1, 0, 0, 0, 0, value.Location())
}

func endOfMonth(value time.Time) time.Time {
	return endOfDay(startOfMonth(value).AddDate(0, 1, -1))
}

func previousPeriod(from, to time.Time) (time.Time, time.Time) {
	days := int(to.Sub(from).Hours()/24) + 1
	previousTo := endOfDay(from.Add(-time.Second))
	previousFrom := startOfDay(previousTo.AddDate(0, 0, -(days - 1)))
	return previousFrom, previousTo
}

func buildKPI(current, previous *domain.Totals) domain.RevenueKPI {
	currentRevenue := current.Revenue
	currentNet := current.NetProfit()
	currentMargin := current.Margin()
	previousMargin := previous.Margin()

	return domain.RevenueKPI{
		Revenue:                currentRevenue,
		NetProfit:              currentNet,
		OperatingExpense:       current.OperatingExpense,
		Margin:                 currentMargin,
		RevenueChange:          percentChange(currentRevenue, previous.Revenue),
		NetProfitChange:        percentChange(currentNet, previous.NetProfit()),
		OperatingExpenseChange: percentChange(current.OperatingExpense, previous.OperatingExpense),
		MarginChange:           currentMargin - previousMargin,
	}
}

func percentChange(current, previous float64) float64 {
	if previous == 0 {
		if current == 0 {
			return 0
		}
		return 100
	}
	return (current - previous) / previous * 100
}

func ratio(amount, revenue float64) float64 {
	if revenue == 0 {
		return 0
	}
	return amount / revenue * 100
}

func buildProfitBreakdown(totals *domain.Totals) []domain.ProfitBreakdownItem {
	grossProfit := totals.Revenue - totals.COGS - totals.Commission
	return []domain.ProfitBreakdownItem{
		{ID: "revenue", Label: "Doanh thu", Amount: totals.Revenue, Ratio: 100},
		{ID: "cogs", Label: "Giá vốn vật tư", Amount: totals.COGS, Ratio: ratio(totals.COGS, totals.Revenue)},
		{ID: "commission", Label: "Hoa hồng nhân viên", Amount: totals.Commission, Ratio: ratio(totals.Commission, totals.Revenue)},
		{ID: "gross", Label: "Lợi nhuận gộp", Amount: grossProfit, Ratio: ratio(grossProfit, totals.Revenue)},
		{ID: "opex", Label: "Chi phí vận hành", Amount: totals.OperatingExpense, Ratio: ratio(totals.OperatingExpense, totals.Revenue)},
		{ID: "net", Label: "Lợi nhuận thuần", Amount: totals.NetProfit(), Ratio: totals.Margin()},
	}
}

func buildComposition(amounts *domain.CompositionAmounts, revenue float64) []domain.CompositionItem {
	other := revenue - amounts.Service - amounts.Retail
	if other < 0 {
		other = 0
	}
	return []domain.CompositionItem{
		{ID: "service", Label: "Dịch vụ", Amount: amounts.Service, Ratio: ratio(amounts.Service, revenue)},
		{ID: "retail", Label: "Bán lẻ", Amount: amounts.Retail, Ratio: ratio(amounts.Retail, revenue)},
		{ID: "other", Label: "Khác", Amount: other, Ratio: ratio(other, revenue)},
	}
}

func fillMonthly(aggregates []*domain.MonthlyAggregate, from, to time.Time) []domain.MonthlyPoint {
	byKey := make(map[string]*domain.MonthlyAggregate, len(aggregates))
	for _, aggregate := range aggregates {
		if aggregate != nil {
			byKey[aggregate.Key] = aggregate
		}
	}

	points := make([]domain.MonthlyPoint, 0)
	cursor := startOfMonth(from)
	last := startOfMonth(to)
	for !cursor.After(last) {
		key := cursor.Format("2006-01")
		point := domain.MonthlyPoint{
			Key:        key,
			Label:      fmt.Sprintf("Tháng %d", int(cursor.Month())),
			MonthLabel: cursor.Format("01/2006"),
		}
		if aggregate, ok := byKey[key]; ok {
			point.Revenue = aggregate.Revenue
			point.COGS = aggregate.COGS
			point.Commission = aggregate.Commission
			point.OperatingExpense = aggregate.OperatingExpense
			point.NetProfit = aggregate.Revenue - aggregate.COGS - aggregate.Commission - aggregate.OperatingExpense
		}
		points = append(points, point)
		cursor = cursor.AddDate(0, 1, 0)
	}
	return points
}
