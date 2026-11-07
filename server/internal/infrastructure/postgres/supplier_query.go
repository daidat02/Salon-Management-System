package postgres

const (
	createSupplierQuery = `
		INSERT INTO suppliers (id, organization_id, name, phone, address, note)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	listSuppliersQuery = `
		SELECT id, organization_id, name, phone, address, note, created_at
		FROM suppliers
		WHERE organization_id = $1
		  AND ($2 = '' OR name ILIKE $2 OR phone ILIKE $2)
		ORDER BY name ASC, created_at DESC
		LIMIT $3 OFFSET $4
	`

	countSuppliersQuery = `
		SELECT COUNT(*)
		FROM suppliers
		WHERE organization_id = $1
		  AND ($2 = '' OR name ILIKE $2 OR phone ILIKE $2)
	`

	supplierExistsQuery = `
		SELECT EXISTS(
			SELECT 1 FROM suppliers WHERE organization_id = $1 AND id = $2
		)
	`
)
