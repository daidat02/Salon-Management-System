package postgres

import (
	"context"
	"fmt"
	"strings"

	domain "github.com/daidat02/server/internal/domain/cashflow"
	"github.com/daidat02/server/pkg/utils"
	"github.com/jackc/pgx/v5"
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


type DefaultCategory struct {
	Code         string
	Name         string
	Kind         string // 'income' | 'expense'
	CategoryType string // 'revenue' | 'operating_expense' | 'non_pnl'
	SortOrder    int
}

var defaultCategories = []DefaultCategory{
	// ==========================================
	// 1. DOANH THU HOẠT ĐỘNG (Income - Revenue)
	// ==========================================
	{"SALON_REVENUE", "Bán hàng & Dịch vụ", "income", "revenue", 1},
	{"PACKAGE_REVENUE", "Thẻ liệu trình / Thẻ dịch vụ", "income", "revenue", 2},
	{"OTHER_REVENUE", "Doanh thu khác", "income", "revenue", 3},

	// ==========================================
	// 2. CHI PHÍ VẬN HÀNH (Expense - Operating Expense) -> Tính vào P&L
	// ==========================================
	// Nhóm Nhân sự
	{"SALARY_EXPENSE", "Lương cứng nhân viên", "expense", "operating_expense", 4},
	{"COMMISSION_EXPENSE", "Hoa hồng & Tip thợ", "expense", "operating_expense", 5},
	{"BONUS_EXPENSE", "Thưởng & Phụ cấp", "expense", "operating_expense", 6},

	// Nhóm Mặt bằng & Tiện ích
	{"RENT_EXPENSE", "Tiền thuê mặt bằng", "expense", "operating_expense", 7},
	{"UTILITIES_EXPENSE", "Điện, nước & Internet", "expense", "operating_expense", 8},

	// Nhóm Marketing & Khách hàng
	{"MARKETING_EXPENSE", "Quảng cáo & Marketing", "expense", "operating_expense", 9},
	{"DISCOUNT_PROMO", "Khuyến mãi & Quà tặng", "expense", "operating_expense", 10},

	// Nhóm Tiêu hao & Vận hành Salon
	{"SUPPLIES_EXPENSE", "Vật tư & Dụng cụ salon", "expense", "operating_expense", 11},
	{"MAINTENANCE_EXPENSE", "Sửa chữa & Bảo dưỡng", "expense", "operating_expense", 12},
	{"ADMIN_EXPENSE", "Văn phòng phẩm & Lễ tân", "expense", "operating_expense", 13},

	// ==========================================
	// 3. DÒNG TIỀN PHI P&L (Non-PnL) -> Thu/Chi trung gian, lưu chuyển quỹ
	// ==========================================
	// Công nợ & Ứng lương
	{"SALARY_ADVANCE", "Tạm ứng lương", "expense", "non_pnl", 14},
	{"SALARY_ADVANCE_REPAY", "Thu hồi tạm ứng lương", "income", "non_pnl", 15},

	// Nhập hàng
	{"GOODS_IMPORT", "Thanh toán nhập hàng", "expense", "non_pnl", 16},

	// Dòng vốn & Đặt cọc
	{"CAPITAL_IN", "Nạp quỹ / Góp vốn", "income", "non_pnl", 17},
	{"CAPITAL_OUT", "Rút quỹ / Rút vốn", "expense", "non_pnl", 18},
	{"DEPOSIT_IN", "Tiền cọc giữ lịch", "income", "non_pnl", 19},
	{"REFUND_OUT", "Hoàn tiền / Hoàn cọc", "expense", "non_pnl", 20},
}


func InsertDefaultCategoriesCashFlow(ctx context.Context, tx pgx.Tx, orgID string) error {
	valueStrings := make([]string, 0, len(defaultCategories))
	valueArgs := make([]interface{}, 0, len(defaultCategories)*9)

	for i, cat := range defaultCategories {
		idx := i * 9
		valueStrings = append(valueStrings, fmt.Sprintf(
			"($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			idx+1, idx+2, idx+3, idx+4, idx+5, idx+6, idx+7, idx+8, idx+9,
		))

		valueArgs = append(valueArgs,
			utils.NewID(), // Tự tạo ID mới hoàn toàn cho từng org
			orgID,
			cat.Code,
			cat.Name,
			cat.Kind,
			cat.CategoryType,
			true, // is_system
			cat.SortOrder,
			true, // is_active
		)
	}

	query := fmt.Sprintf(`
		INSERT INTO cash_flow_categories 
			(id, organization_id, code, name, kind, category_type, is_system, sort_order, is_active)
		VALUES %s
		ON CONFLICT (organization_id, code) DO NOTHING;
	`, strings.Join(valueStrings, ","))

	_, err := tx.Exec(ctx, query, valueArgs...)
	return err
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
