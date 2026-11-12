package organization

import (
	"context"
	"errors"
)

// ErrSlugExists trùng unique slug khi tạo tổ chức.
var ErrSlugExists = errors.New("organization slug already exists")

// ErrOrganizationNotFound không tìm thấy tổ chức.
var ErrOrganizationNotFound = errors.New("organization not found")

type OrganizationRepository interface {
	// CreateOrganization tạo tổ chức + tài khoản owner + settings mặc định
	// trong cùng transaction.
	CreateOrganization(ctx context.Context, org *Organization, owner *OwnerAccount) (*OrganizationResponse, error)
	// DisableDemo xóa dữ liệu mẫu, reset quỹ và tắt cờ demo trong cùng transaction.
	DisableDemo(ctx context.Context, orgID string) (*OrganizationResponse, error)
}
