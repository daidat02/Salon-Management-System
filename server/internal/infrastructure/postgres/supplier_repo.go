package postgres

import (
	"context"
	"fmt"
	"strings"

	domain "github.com/daidat02/server/internal/domain/supplier"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SupplierRepository struct {
	db *pgxpool.Pool
}

func NewSupplierRepository(db *pgxpool.Pool) *SupplierRepository {
	return &SupplierRepository{db: db}
}

func (r *SupplierRepository) CreateSupplier(ctx context.Context, supplier *domain.Supplier) error {
	_, err := r.db.Exec(
		ctx,
		createSupplierQuery,
		supplier.ID,
		supplier.OrganizationID,
		supplier.Name,
		supplier.Phone,
		supplier.Address,
		supplier.Note,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi tạo nhà cung cấp: %w", err)
	}
	return nil
}

func (r *SupplierRepository) GetSuppliersByOrgID(ctx context.Context, orgID, search string, limit, offset int) ([]*domain.Supplier, error) {
	formattedSearch := supplierSearchPattern(search)
	rows, err := r.db.Query(ctx, listSuppliersQuery, orgID, formattedSearch, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách nhà cung cấp: %w", err)
	}
	defer rows.Close()

	suppliers := make([]*domain.Supplier, 0)
	for rows.Next() {
		var supplier domain.Supplier
		if err := rows.Scan(
			&supplier.ID,
			&supplier.OrganizationID,
			&supplier.Name,
			&supplier.Phone,
			&supplier.Address,
			&supplier.Note,
			&supplier.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc nhà cung cấp: %w", err)
		}
		suppliers = append(suppliers, &supplier)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lỗi khi duyệt danh sách nhà cung cấp: %w", err)
	}
	return suppliers, nil
}

func (r *SupplierRepository) CountSuppliersByOrgID(ctx context.Context, orgID, search string) (int64, error) {
	var total int64
	if err := r.db.QueryRow(ctx, countSuppliersQuery, orgID, supplierSearchPattern(search)).Scan(&total); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm nhà cung cấp: %w", err)
	}
	return total, nil
}

func (r *SupplierRepository) ExistsInOrg(ctx context.Context, orgID, id string) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, supplierExistsQuery, orgID, id).Scan(&exists); err != nil {
		return false, fmt.Errorf("lỗi khi kiểm tra nhà cung cấp: %w", err)
	}
	return exists, nil
}

func supplierSearchPattern(search string) string {
	search = strings.TrimSpace(search)
	if search == "" {
		return ""
	}
	return "%" + search + "%"
}
