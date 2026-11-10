package postgres

import (
	"context"
	"fmt"
	"time"

	domain "github.com/daidat02/server/internal/domain/analytics"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type PostgresAnalyticsRepository struct {
	db *pgxpool.Pool
	qx *sqlx.DB
}

func NewPostgresAnalyticsRepository(db *pgxpool.Pool) *PostgresAnalyticsRepository {
	return &PostgresAnalyticsRepository{
		db: db,
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

func (r *PostgresAnalyticsRepository) GetTotals(ctx context.Context, orgID string, from, to time.Time) (*domain.Totals, error) {
	var totals domain.Totals
	if err := r.qx.GetContext(ctx, &totals, getRevenueTotalsQuery, orgID, from, to); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy tổng doanh thu: %w", err)
	}
	return &totals, nil
}

func (r *PostgresAnalyticsRepository) GetMonthly(ctx context.Context, orgID string, from, to time.Time) ([]*domain.MonthlyAggregate, error) {
	rows := make([]*domain.MonthlyAggregate, 0)
	if err := r.qx.SelectContext(ctx, &rows, getRevenueMonthlyQuery, orgID, from, to); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy doanh thu theo tháng: %w", err)
	}
	return rows, nil
}

func (r *PostgresAnalyticsRepository) GetComposition(ctx context.Context, orgID string, from, to time.Time) (*domain.CompositionAmounts, error) {
	var amounts domain.CompositionAmounts
	if err := r.qx.GetContext(ctx, &amounts, getRevenueCompositionQuery, orgID, from, to); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy cơ cấu doanh thu: %w", err)
	}
	return &amounts, nil
}

func (r *PostgresAnalyticsRepository) GetTopServices(ctx context.Context, orgID string, from, to time.Time, limit int) ([]*domain.TopService, error) {
	rows := make([]*domain.TopService, 0)
	if err := r.qx.SelectContext(ctx, &rows, getTopServicesQuery, orgID, from, to, limit); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy top dịch vụ: %w", err)
	}
	return rows, nil
}
