package organization

import (
	"context"
	"errors"
)

// ErrSlugExists trùng unique slug khi tạo tổ chức.
var ErrSlugExists = errors.New("organization slug already exists")

type OrganizationRepository interface {
	// CreateOrganization tạo tổ chức + tài khoản owner + settings mặc định
	// trong cùng transaction.
	CreateOrganization(ctx context.Context, org *Organization, owner *OwnerAccount) (*OrganizationResponse, error)
}
