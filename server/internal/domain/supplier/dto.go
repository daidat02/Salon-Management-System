package supplier

import "time"

type CreateSupplierRequest struct {
	Name    string  `json:"name"`
	Phone   *string `json:"phone"`
	Address *string `json:"address"`
	Note    *string `json:"note"`
}

type SupplierResponse struct {
	ID             string     `json:"id" db:"id"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	Name           string     `json:"name" db:"name"`
	Phone          *string    `json:"phone" db:"phone"`
	Address        *string    `json:"address" db:"address"`
	Note           *string    `json:"note" db:"note"`
	CreatedAt      *time.Time `json:"created_at" db:"created_at"`
}
