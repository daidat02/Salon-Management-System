package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	domain "github.com/daidat02/server/internal/domain/cashflow"
	"github.com/daidat02/server/pkg/utils"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type CashFlowRepository struct {
	db *pgxpool.Pool
	qx *sqlx.DB
}


func NewCashFlowRepository(db *pgxpool.Pool) *CashFlowRepository {
	
	return &CashFlowRepository{
		db: db,
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

// createCashFlowTx chèn phiếu trong tx gọi: nếu phiếu approved thì lock
// dòng quỹ + check âm (chi) + cộng số dư, tất cả nguyên tử.
// Dùng chung cho tạo phiếu duyệt ngay và hook sinh phiếu khi chốt đơn.
func createCashFlowTx(ctx context.Context, tx pgx.Tx, voucher *domain.CashFlow) error {
	if voucher.Status == domain.VoucherStatusApproved {
		if err := lockFundRowTx(ctx, tx, voucher.OrganizationID, voucher.FundID, voucher.Kind, voucher.Amount); err != nil {
			return err
		}
	}

	_, err := tx.Exec(ctx,
		InsertCashFlowQuery,
		voucher.ID,
		voucher.OrganizationID,
		voucher.Code,
		voucher.Kind,
		voucher.CategoryID,
		voucher.FundID,
		voucher.Amount,
		voucher.Description,
		voucher.OccurredAt,
		voucher.Status,
		voucher.OrderID,
		voucher.InventoryDocumentID,
		voucher.CreatedBy,
	)
	if err != nil {
		return err
	}

	if voucher.Status == domain.VoucherStatusApproved {
		if err := updateFundBalanceTx(ctx, tx, voucher.OrganizationID, voucher.FundID, voucher.Kind, voucher.Amount); err != nil {
			return err
		}
	}
	return nil
}

// lockFundRowTx khóa dòng quỹ (serialize 2 thu ngân chốt cùng lúc) + đọc
// số dư lưu trữ; phiếu chi vượt số dư thì chặn bằng ErrInsufficientFundBalance.
func lockFundRowTx(ctx context.Context, tx pgx.Tx, orgID, fundID string, kind string, amount float64) error {
	var dummy string
	var currentBalance float64

	err := tx.QueryRow(ctx, lockFundRowQuery, orgID, fundID).Scan(&dummy, &currentBalance)
	if err != nil {
		if err == pgx.ErrNoRows {
			return domain.ErrFundNotFound
		}
		return err
	}

	if kind == domain.KindExpense && currentBalance < amount {
		return domain.ErrInsufficientFundBalance
	}
	return nil
}

// updateFundBalanceTx cộng/trừ số dư lưu trữ của quỹ (thu +, chi -).
func updateFundBalanceTx(ctx context.Context, tx pgx.Tx, orgID, fundID string, kind string, amount float64) error {
	multiplier := 1.0
	if kind == domain.KindExpense {
		multiplier = -1.0
	}
	finalAmount := amount * multiplier

	_, err := tx.Exec(ctx, updateFundBalanceQuery, orgID, fundID, finalAmount)
	if err != nil {
		return err
	}
	return nil
}

func (r *CashFlowRepository) CreateCashFlow(ctx context.Context, voucher *domain.CashFlow) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := createCashFlowTx(ctx, tx, voucher); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	return nil
}

// ---------- Hook chốt đơn (hard-code quỹ CASH phase 1) ----------

// Hard-coded system codes cho hook chốt đơn.
const (
	hookCashFundCode        = "CASH"
	hookRevenueCategoryCode = "SALON_REVENUE"
)

// insertOrderIncomeVoucherTx sinh phiếu thu tiền mặt khi chốt đơn, chạy
// trong tx của CompleteOrderWithSlip nên nguyên tử với chốt đơn.
// Idempotent theo order_id: đơn đã có phiếu thì bỏ qua (chốt lại an toàn).
// Đơn 0đ caller tự bỏ qua trước (không có dòng tiền thật).
func insertOrderIncomeVoucherTx(ctx context.Context, tx pgx.Tx, orgID, orderID, orderCode string, orderTotal float64) error {
	var existingID string
	err := tx.QueryRow(ctx, findCashFlowIDByOrderQuery, orgID, orderID).Scan(&existingID)
	if err != nil && err != pgx.ErrNoRows {
		return fmt.Errorf("lỗi khi kiểm tra phiếu thu của đơn hàng: %w", err)
	}
	if err == nil {
		return nil
	}

	var fundID string
	if err := tx.QueryRow(ctx, findActiveFundIDByCodeQuery, orgID, hookCashFundCode).Scan(&fundID); err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("quỹ tiền mặt (CASH) chưa được khởi tạo")
		}
		return fmt.Errorf("lỗi khi tìm quỹ tiền mặt: %w", err)
	}

	// Danh mục doanh thu thiếu (seed lỗi) thì phiếu vẫn sinh với category NULL
	// để không chặn chốt đơn — đối soát danh mục bổ sung sau.
	var categoryID *string
	var resolvedCategory string
	if err := tx.QueryRow(ctx, findActiveCategoryIDByCodeQuery, orgID, hookRevenueCategoryCode, domain.KindIncome).Scan(&resolvedCategory); err == nil {
		categoryID = &resolvedCategory
	} else if err != pgx.ErrNoRows {
		return fmt.Errorf("lỗi khi tìm danh mục doanh thu: %w", err)
	}

	now := time.Now()
	desc := "Thu tiền đơn #" + orderCode
	voucher := &domain.CashFlow{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		Kind:           domain.KindIncome,
		CategoryID:     categoryID,
		FundID:         fundID,
		Amount:         orderTotal,
		Description:    &desc,
		OccurredAt:     &now,
		Status:         domain.VoucherStatusApproved,
		OrderID:        &orderID,
	}
	// Trùng mã phiếu (23505) thì sinh lại tối đa 3 lần như phiếu bán hàng.
	for attempts := 0; ; attempts++ {
		voucher.Code = utils.GenerateCashFlowCode(domain.KindIncome)
		if err := createCashFlowTx(ctx, tx, voucher); err == nil {
			return nil
		} else if !isUniqueViolation(err) || attempts >= 2 {
			return fmt.Errorf("lỗi khi sinh phiếu thu của đơn hàng: %w", err)
		}
	}
}

type FilterCashFlow struct {
	Search string
	Status string
	Kind   string

	DateFrom string
	DateTo   string

	SortBy string
}



func (r *CashFlowRepository) GetCashFlowByOrgID(ctx context.Context, orgID string, filter domain.ListCashFlowsQuery) ([]*domain.CashFlowResponse, int64, error) {
	query := getCashflowByOrgIDQuery + searchCashflowFilter + 
			filterCashflow + filterCashflowByDate + sortCashflowFilter
	formattedSearch := ""
	if strings.TrimSpace(filter.Search) != "" {
		formattedSearch = "%" + strings.TrimSpace(filter.Search) + "%"
	}

	args := []any{
        orgID,             // $1
        formattedSearch,   // $2
        filter.Status,     // $3
        filter.Kind,       // $4
        filter.CategoryID, // $5
        filter.FundID,     // $6
        filter.DateFrom,   // $7
        filter.DateTo,     // $8
        filter.SortBy,     // $9
    }

	query += fmt.Sprintf("LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	offset := (filter.Page - 1) * filter.PageSize
	args = append(args, filter.PageSize, offset)

	cashflows := make([]*domain.CashFlowResponse, 0)

	if err := r.qx.SelectContext(ctx, &cashflows, query, args...); err != nil {
		return nil, 0, fmt.Errorf("lỗi khi lấy danh sách phiếu thu: %w", err)
	}

	total := int64(0)
	countQuery := countCashflowByOrgIDQuery + searchCashflowFilter + filterCashflow + filterCashflowByDate
	if err := r.qx.QueryRowContext(ctx, countQuery, args[:8]...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("lỗi khi đếm số lượng phiếu thu: %w", err)
	}

	return cashflows, total, nil
}

// ---------- Get / Approve / Cancel ----------

// GetCashFlowByID trả 1 phiếu, không thấy -> ErrCashFlowNotFound.
func (r *CashFlowRepository) GetCashFlowByID(ctx context.Context, orgID, id string) (*domain.CashFlow, error) {
	var voucher domain.CashFlow
	if err := r.qx.GetContext(ctx, &voucher, getCashFlowEntityByIDQuery, orgID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrCashFlowNotFound
		}
		return nil, fmt.Errorf("lỗi khi lấy phiếu thu/chi: %w", err)
	}
	return &voucher, nil
}

func (r *CashFlowRepository) GetCashFlowStats(ctx context.Context, orgID, dateFrom, dateTo string) (*domain.CashFlowStats, error) {
	var stats domain.CashFlowStats
	if err := r.qx.GetContext(ctx, &stats, getCashFlowStats, orgID, dateFrom, dateTo); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy thống kê phiếu thu/chi: %w", err)
	}
	return &stats, nil
}

// ApproveCashFlow duyệt phiếu pending: lock phiếu + lock quỹ, check đủ số dư
// (nếu chi), cập nhật status/approved_by/approved_at và cộng trừ
// current_balance trong cùng 1 transaction.
func (r *CashFlowRepository) ApproveCashFlow(ctx context.Context, orgID, id, approvedBy string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var kind, fundID, status string
	var amount float64
	if err := tx.QueryRow(ctx, lockCashFlowForApproveQuery, orgID, id).
		Scan(&kind, &fundID, &amount, &status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrCashFlowNotFound
		}
		return fmt.Errorf("lỗi khi khóa phiếu thu/chi: %w", err)
	}
	if status != domain.VoucherStatusPending {
		return domain.ErrCashFlowNotFound
	}

	if err := lockFundRowTx(ctx, tx, orgID, fundID, kind, amount); err != nil {
		return err
	}

	tag, err := tx.Exec(ctx, approveCashFlowQuery, orgID, id, nullableStr(&approvedBy))
	if err != nil {
		return fmt.Errorf("lỗi khi duyệt phiếu thu/chi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrCashFlowNotFound
	}

	if err := updateFundBalanceTx(ctx, tx, orgID, fundID, kind, amount); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// CancelCashFlow hủy phiếu pending (phiếu đã duyệt sửa bằng phiếu đảo).
func (r *CashFlowRepository) CancelCashFlow(ctx context.Context, orgID, id string) error {
	tag, err := r.db.Exec(ctx, cancelCashFlowQuery, orgID, id)
	if err != nil {
		return fmt.Errorf("lỗi khi hủy phiếu thu/chi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrCashFlowNotFound
	}
	return nil
}