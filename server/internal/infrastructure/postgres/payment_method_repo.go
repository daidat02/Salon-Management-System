package postgres

import (
	"context"
	"fmt"

	settingDomain "github.com/daidat02/server/internal/domain/setting"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type PostgresPaymentMethodRepository struct {
	qx *sqlx.DB
}

func NewPostgresPaymentMethodRepository(db *pgxpool.Pool) *PostgresPaymentMethodRepository {
	return &PostgresPaymentMethodRepository{
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

const listPaymentMethodsQuery = `
	SELECT pm.id, pm.fund_id, f.name AS fund_name, f.fund_type AS fund_type,
	       pm.code, pm.name, pm.is_system, pm.is_active, pm.sort_order
	FROM payment_methods pm
	JOIN funds f ON f.id = pm.fund_id
	WHERE pm.organization_id = $1
	ORDER BY pm.sort_order, pm.name
`

func (r *PostgresPaymentMethodRepository) ListPaymentMethods(ctx context.Context, orgID string) ([]settingDomain.PaymentMethod, error) {
	methods := make([]settingDomain.PaymentMethod, 0)
	if err := r.qx.SelectContext(ctx, &methods, listPaymentMethodsQuery, orgID); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy phương thức thanh toán: %w", err)
	}
	return methods, nil
}
