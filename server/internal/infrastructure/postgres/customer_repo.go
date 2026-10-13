package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	domain "github.com/daidat02/server/internal/domain/customer"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type PostgresCustomerRepository struct {
	db *pgxpool.Pool
	qx *sqlx.DB
}

func NewPostgresCustomerRepository(db *pgxpool.Pool) *PostgresCustomerRepository {
	return &PostgresCustomerRepository{
		db: db,
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

// nullableGender chuyển "" thành nil để qua được CHECK gender của DB.
func nullableGender(gender string) any {
	if gender == "" {
		return nil
	}
	return gender
}

func (r *PostgresCustomerRepository) CreateCustomer(ctx context.Context, customer *domain.Customer) error {
	_, err := r.db.Exec(
		ctx,
		createCustomerQuery,
		customer.ID,
		customer.OrganizationID,
		customer.FullName,
		customer.Phone,
		nullableGender(customer.Gender),
		customer.BirthDate,
		customer.Note,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi tạo khách hàng: %w", err)
	}

	return nil
}

func (r *PostgresCustomerRepository) GetCustomersByOrgID(ctx context.Context, orgID, search string, limit, offset int) ([]*domain.Customer, error) {
	query := listCustomersByOrgIDQuery
	args := []any{orgID}
	if strings.TrimSpace(search) != "" {
		query += searchCustomersFilter
		args = append(args, "%"+strings.TrimSpace(search)+"%")
	}
	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	customers := make([]*domain.Customer, 0)
	if err := r.qx.SelectContext(ctx, &customers, query, args...); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách khách hàng: %w", err)
	}

	return customers, nil
}

func (r *PostgresCustomerRepository) CountCustomersByOrgID(ctx context.Context, orgID, search string) (int64, error) {
	query := countCustomersByOrgIDQuery
	args := []any{orgID}
	if strings.TrimSpace(search) != "" {
		query += searchCustomersFilter
		args = append(args, "%"+strings.TrimSpace(search)+"%")
	}

	var total int64
	if err := r.qx.GetContext(ctx, &total, query, args...); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm danh sách khách hàng: %w", err)
	}
	return total, nil
}

// customerDetailsRow hứng kết quả getCustomerDetailsQuery: scalar map thẳng
// vào DTO embedded, cột JSON spending_by_month parse riêng (sqlx không
// scan JSON text vào slice được).
type customerDetailsRow struct {
	domain.CustomerDetailsResponse
	SpendingJSON []byte `db:"spending_by_month"`
}

func (r *PostgresCustomerRepository) GetCustomerDetailByID(ctx context.Context, orgID, id string) (*domain.CustomerDetailsResponse, error) {
	var row customerDetailsRow
	if err := r.qx.GetContext(ctx, &row, getCustomerDetailsQuery, orgID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("khách hàng %s: %w", id, domain.ErrCustomerNotFound)
		}
		return nil, fmt.Errorf("lỗi khi lấy chi tiết khách hàng: %w", err)
	}

	out := row.CustomerDetailsResponse
	out.SpendingByMonth = make([]domain.SpendByMonth, 0)
	if len(row.SpendingJSON) > 0 && string(row.SpendingJSON) != "null" {
		if err := json.Unmarshal(row.SpendingJSON, &out.SpendingByMonth); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc chi tiêu theo tháng: %w", err)
		}
	}

	return &out, nil
}

func (r *PostgresCustomerRepository) GetCustomerByPhone(ctx context.Context, orgID, phone string) (*domain.Customer, error) {
	var c domain.Customer

	if err := r.qx.GetContext(ctx, &c, getCustomerQuery+withPhoneFilter, orgID, phone); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("khách hàng với số điện thoại %s: %w", phone, domain.ErrCustomerNotFound)
		}
		return nil, fmt.Errorf("lỗi khi lấy khách hàng theo số điện thoại: %w", err)
	}
	return &c, nil
}

func (r *PostgresCustomerRepository) UpdateCustomer(ctx context.Context, customer *domain.Customer) error {
	tag, err := r.db.Exec(
		ctx,
		updateCustomerQuery,
		customer.ID,
		customer.OrganizationID,
		customer.FullName,
		customer.Phone,
		nullableGender(customer.Gender),
		customer.BirthDate,
		customer.Note,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật khách hàng: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("cập nhật khách hàng %s: %w", customer.ID, domain.ErrCustomerNotFound)
	}

	return nil
}

func (r *PostgresCustomerRepository) DeleteCustomer(ctx context.Context, orgID, id string) error {
	tag, err := r.db.Exec(
		ctx,
		deleteCustomerQuery,
		id,
		orgID,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi xóa khách hàng: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("xóa khách hàng %s: %w", id, domain.ErrCustomerNotFound)
	}

	return nil
}

func (r *PostgresCustomerRepository) FindCustomerByPhone(ctx context.Context, orgID, phone string) (*domain.Customer, error) {
	var c domain.Customer

	if err := r.qx.GetContext(ctx, &c, findCustomerByPhoneQuery, orgID, phone); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("lỗi khi tìm khách hàng theo số điện thoại: %w", err)
	}

	return &c, nil
}

func (r *PostgresCustomerRepository) CustomerExistsInOrg(ctx context.Context, orgID, customerID string) (bool, error) {
	var exists bool
	if err := r.qx.GetContext(ctx, &exists, customerExistsInOrgQuery, orgID, customerID); err != nil {
		return false, fmt.Errorf("lỗi khi kiểm tra khách hàng: %w", err)
	}
	return exists, nil
}

// GetCustomerStats thống kê tổng quan tệp khách của salon
// (tổng khách, khách mới tháng này/tháng trước, tổng điểm tồn).
func (r *PostgresCustomerRepository) GetCustomerStats(ctx context.Context, orgID string) (*domain.CustomerStatsResponse, error) {
	var stats domain.CustomerStatsResponse
	if err := r.qx.GetContext(ctx, &stats, getCustomerStatsQuery, orgID); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy thống kê khách hàng: %w", err)
	}
	return &stats, nil
}
