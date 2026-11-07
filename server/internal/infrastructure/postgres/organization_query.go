package postgres

const (
	createOrganizationQuery = `
		INSERT INTO organizations (id, name, slug, phone, address, timezone, status,
		                           email, website, tax_code, slogan, logo_url)
		VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), $6, $7,
		        NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''), NULLIF($12, ''))
		RETURNING created_at, updated_at
	`

	createOwnerUserQuery = `
		INSERT INTO users (id, organization_id, phone, password_hash, full_name, role, status)
		VALUES ($1, $2, $3, $4, $5, 'owner', 'active')
	`
)
