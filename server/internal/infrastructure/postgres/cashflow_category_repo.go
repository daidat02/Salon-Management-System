package postgres

import (
	"context"
	"fmt"

	domain "github.com/daidat02/server/internal/domain/cashflow"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

// PostgresCashFlowCategoryRepository triển khai cashflow.CashFlowCategoryRepository
// (danh mục thu/chi — tách biệt với domain category của dịch vụ/sản phẩm).
type PostgresCashFlowCategoryRepository struct {
	db *pgxpool.Pool
	qx *sqlx.DB
}

func NewPostgresCashFlowCategoryRepository(db *pgxpool.Pool) *PostgresCashFlowCategoryRepository {
	return &PostgresCashFlowCategoryRepository{
		db: db,
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

func (r *PostgresCashFlowCategoryRepository) CreateCategory(ctx context.Context, category *domain.CashFlowCategory) error {
	_, err := r.db.Exec(
		ctx,
		insertCashFlowCategoryQuery,
		category.ID,
		category.OrganizationID,
		category.Code,
		category.Name,
		category.Kind,
		category.CategoryType,
		category.IsSystem,
		category.SortOrder,
		category.IsActive,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi tạo danh mục thu/chi: %w", err)
	}
	return nil
}

func (r *PostgresCashFlowCategoryRepository) GetCategoriesByOrgID(ctx context.Context, orgID, kind string) ([]*domain.CashFlowCategory, error) {
	query := listCashFlowCategoriesByOrgIDQuery
	args := []any{orgID}
	if kind != "" {
		query += " AND kind = $2"
		args = append(args, kind)
	}
	query += " ORDER BY sort_order, name"

	categories := make([]*domain.CashFlowCategory, 0)
	if err := r.qx.SelectContext(ctx, &categories, query, args...); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách danh mục thu/chi: %w", err)
	}
	return categories, nil
}

func (r *PostgresCashFlowCategoryRepository) UpdateCategory(ctx context.Context, category *domain.CashFlowCategory) error {
	tag, err := r.db.Exec(
		ctx,
		updateCashFlowCategoryQuery,
		category.OrganizationID,
		category.ID,
		category.Name,
		category.SortOrder,
		category.IsActive,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật danh mục thu/chi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrCashFlowCategoryNotFound
	}
	return nil
}

func (r *PostgresCashFlowCategoryRepository) DeleteCategory(ctx context.Context, orgID, id string) error {
	tag, err := r.db.Exec(ctx, deleteCashFlowCategoryQuery, orgID, id)
	if err != nil {
		return fmt.Errorf("lỗi khi xóa danh mục thu/chi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrCashFlowCategoryNotFound
	}
	return nil
}
