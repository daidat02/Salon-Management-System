package supplier

import (
	"context"
	"errors"
)

var ErrSupplierNotFound = errors.New("supplier not found")

type SupplierRepository interface {
	CreateSupplier(ctx context.Context, supplier *Supplier) error
	GetSuppliersByOrgID(ctx context.Context, orgID, search string, limit, offset int) ([]*Supplier, error)
	CountSuppliersByOrgID(ctx context.Context, orgID, search string) (int64, error)
	ExistsInOrg(ctx context.Context, orgID, id string) (bool, error)
}
