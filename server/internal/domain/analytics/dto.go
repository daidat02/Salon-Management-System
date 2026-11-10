package analytics

import "time"

// RevenueReportResponse là read model trang Báo cáo doanh thu & lợi nhuận.
type RevenueReportResponse struct {
	Range           DateRange             `json:"range"`
	KPI             RevenueKPI            `json:"kpi"`
	Monthly         []MonthlyPoint        `json:"monthly"`
	AnnualYear      int                   `json:"annual_year"`
	AnnualMonthly   []MonthlyPoint        `json:"annual_monthly"`
	ProfitBreakdown []ProfitBreakdownItem `json:"profit_breakdown"`
	Composition     []CompositionItem     `json:"composition"`
	TopServices     []TopService          `json:"top_services"`
}

type DateRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

type RevenueKPI struct {
	Revenue                float64 `json:"revenue"`
	NetProfit              float64 `json:"net_profit"`
	OperatingExpense       float64 `json:"operating_expense"`
	Margin                 float64 `json:"margin"`
	RevenueChange          float64 `json:"revenue_change"`
	NetProfitChange        float64 `json:"net_profit_change"`
	OperatingExpenseChange float64 `json:"operating_expense_change"`
	MarginChange           float64 `json:"margin_change"`
}

type MonthlyPoint struct {
	Key              string  `json:"key"`
	Label            string  `json:"label"`
	MonthLabel       string  `json:"month_label"`
	Revenue          float64 `json:"revenue"`
	COGS             float64 `json:"cogs"`
	Commission       float64 `json:"commission"`
	OperatingExpense float64 `json:"operating_expense"`
	NetProfit        float64 `json:"net_profit"`
}

type ProfitBreakdownItem struct {
	ID     string  `json:"id"`
	Label  string  `json:"label"`
	Amount float64 `json:"amount"`
	Ratio  float64 `json:"ratio"`
}

type CompositionItem struct {
	ID     string  `json:"id"`
	Label  string  `json:"label"`
	Amount float64 `json:"amount"`
	Ratio  float64 `json:"ratio"`
}

type TopService struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Turns    float64 `json:"turns"`
	Revenue  float64 `json:"revenue"`
	Profit   float64 `json:"profit"`
}

// Totals là số liệu gốc của một kỳ trước khi usecase tính lợi nhuận/tỷ suất.
type Totals struct {
	Revenue          float64 `db:"revenue"`
	COGS             float64 `db:"cogs"`
	Commission       float64 `db:"commission"`
	OperatingExpense float64 `db:"operating_expense"`
}

// MonthlyAggregate là dữ liệu thô repository trả về cho một tháng có phát sinh.
type MonthlyAggregate struct {
	Key              string  `db:"month_key"`
	Revenue          float64 `db:"revenue"`
	COGS             float64 `db:"cogs"`
	Commission       float64 `db:"commission"`
	OperatingExpense float64 `db:"operating_expense"`
}

// CompositionAmounts là doanh thu đã phân bổ giảm giá theo nhóm hàng hóa.
type CompositionAmounts struct {
	Service float64 `db:"service"`
	Retail  float64 `db:"retail"`
}

func (t Totals) NetProfit() float64 {
	return t.Revenue - t.COGS - t.Commission - t.OperatingExpense
}

func (t Totals) Margin() float64 {
	if t.Revenue == 0 {
		return 0
	}
	return t.NetProfit() / t.Revenue * 100
}
