package postgres

const (
	createOrganizationQuery = `
		INSERT INTO organizations (id, name, slug, phone, address, timezone, status,
		                           email, website, tax_code, slogan, logo_url, is_demo)
		VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), $6, $7,
		        NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''), NULLIF($12, ''), $13)
		RETURNING created_at, updated_at
	`

	createOwnerUserQuery = `
		INSERT INTO users (id, organization_id, phone, password_hash, full_name, role, status)
		VALUES ($1, $2, $3, $4, $5, 'owner', 'active')
	`
)

const getOrganizationForDemoQuery = `
	SELECT id, name, slug, COALESCE(phone, '') AS phone, COALESCE(address, '') AS address,
	       timezone, status, COALESCE(email, '') AS email, COALESCE(website, '') AS website,
	       COALESCE(tax_code, '') AS tax_code, COALESCE(slogan, '') AS slogan,
	       COALESCE(logo_url, '') AS logo_url, is_demo, created_at, updated_at
	FROM organizations
	WHERE id = $1
	FOR UPDATE
`

const updateOrganizationDemoQuery = `
	UPDATE organizations
	SET is_demo = false, updated_at = now()
	WHERE id = $1
	RETURNING updated_at
`

const resetOrganizationFundsQuery = `
	UPDATE funds
	SET current_balance = opening_balance, updated_at = now()
	WHERE organization_id = $1
`
