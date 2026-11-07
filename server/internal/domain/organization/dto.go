package organization

import "time"

// CreateOrganizationRequest là body của API tạo tổ chức.
type CreateOrganizationRequest struct {
	Name     string `json:"name" binding:"required"`
	Slug     string `json:"slug" binding:"required"`
	Phone    string `json:"phone"`
	Address  string `json:"address"`
	Timezone string `json:"timezone"`
	Email    string `json:"email"`
	Website  string `json:"website"`
	TaxCode  string `json:"tax_code"`
	Slogan   string `json:"slogan"`
	LogoURL  string `json:"logo_url"`

	// Tài khoản owner tạo kèm tổ chức.
	OwnerPhone    string `json:"owner_phone" binding:"required"`
	OwnerPassword string `json:"owner_password" binding:"required"`
	OwnerFullName string `json:"owner_full_name"`
}

// OrganizationResponse trả về thông tin tổ chức vừa tạo.
type OrganizationResponse struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Slug      string     `json:"slug"`
	Phone     string     `json:"phone"`
	Address   string     `json:"address"`
	Timezone  string     `json:"timezone"`
	Status    string     `json:"status"`
	Email     *string    `json:"email,omitempty"`
	Website   *string    `json:"website,omitempty"`
	TaxCode   *string    `json:"tax_code,omitempty"`
	Slogan    *string    `json:"slogan,omitempty"`
	LogoURL   *string    `json:"logo_url,omitempty"`
	CreatedAt *time.Time `json:"created_at,omitempty"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
}
