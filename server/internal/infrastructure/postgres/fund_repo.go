package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	domain "github.com/daidat02/server/internal/domain/cashflow"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

// PostgresFundRepository triển khai cashflow.FundRepository (quỹ: két tiền mặt,
// TK ngân hàng, ví điện tử).
type PostgresFundRepository struct {
	db *pgxpool.Pool
	qx *sqlx.DB
}

func NewPostgresFundRepository(db *pgxpool.Pool) *PostgresFundRepository {
	return &PostgresFundRepository{
		db: db,
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

func (r *PostgresFundRepository) CreateFund(ctx context.Context, fund *domain.Fund) error {
	// Quỹ mới chưa có phiếu phát sinh nên số dư hiện tại = số dư đầu kỳ.
	_, err := r.db.Exec(
		ctx,
		insertFundQuery,
		fund.ID,
		fund.OrganizationID,
		fund.Code,
		fund.Name,
		fund.FundType,
		fund.BankName,
		fund.AccountNumber,
		fund.OpeningBalance,
		fund.OpeningBalance,
		fund.IsActive,
		fund.IsDefault,
		fund.IsConfigured,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi tạo quỹ: %w", err)
	}
	return nil
}

func (r *PostgresFundRepository) GetFundByID(ctx context.Context, orgID, id string) (*domain.Fund, error) {
	var fund domain.Fund
	if err := r.qx.GetContext(ctx, &fund, getFundByIDQuery, orgID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrFundNotFound
		}
		return nil, fmt.Errorf("lỗi khi lấy quỹ: %w", err)
	}
	return &fund, nil
}

func (r *PostgresFundRepository) GetFundsByOrgID(ctx context.Context, orgID string, activeOnly bool) ([]*domain.Fund, error) {
	query := listFundsByOrgIDQuery
	if activeOnly {
		query += " AND is_active = true"
	}
	query += " ORDER BY created_at"

	funds := make([]*domain.Fund, 0)
	if err := r.qx.SelectContext(ctx, &funds, query, orgID); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách quỹ: %w", err)
	}
	return funds, nil
}

func (r *PostgresFundRepository) GetFundBalance(ctx context.Context, orgID, fundID string) (float64, float64, float64, error) {
	var row struct {
		OpeningBalance float64 `db:"opening_balance"`
		TotalIncome    float64 `db:"total_income"`
		TotalExpense   float64 `db:"total_expense"`
	}
	if err := r.qx.GetContext(ctx, &row, fundBalanceQuery, orgID, fundID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, 0, 0, domain.ErrFundNotFound
		}
		return 0, 0, 0, fmt.Errorf("lỗi khi tính số dư quỹ: %w", err)
	}
	return row.OpeningBalance, row.TotalIncome, row.TotalExpense, nil
}

func (r *PostgresFundRepository) UpdateFund(ctx context.Context, fund *domain.Fund) error {
	tag, err := r.db.Exec(
		ctx,
		updateFundQuery,
		fund.OrganizationID,
		fund.ID,
		fund.Name,
		fund.BankName,
		fund.AccountNumber,
		fund.IsActive,
		fund.IsDefault,
		fund.IsConfigured,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật quỹ: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrFundNotFound
	}
	return nil
}

func (r *PostgresFundRepository) DeactivateFund(ctx context.Context, orgID, id string) error {
	tag, err := r.db.Exec(ctx, deactivateFundQuery, orgID, id)
	if err != nil {
		return fmt.Errorf("lỗi khi ngừng sử dụng quỹ: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrFundNotFound
	}
	return nil
}

func (r *PostgresFundRepository) GetFundStats(ctx context.Context, orgID string) ([]*domain.FundStats, error) {
	funds := make([]*domain.FundStats, 0)
	if err := r.qx.SelectContext(ctx, &funds, getFundStatsQuery, orgID); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn thống kê quỹ: %w", err)
	}
	return funds, nil
}

func (r *PostgresFundRepository) GetFundMovementHistory(ctx context.Context, orgID string) ([]*domain.CashFlowResponse, error) {
	movements := make([]*domain.CashFlowResponse, 0)
	if err := r.qx.SelectContext(ctx, &movements, getHistoricalFundBalanceQuery, orgID); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn lịch sử nạp/rút quỹ: %w", err)
	}
	return movements, nil
}
