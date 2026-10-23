package postgres

const (
	insertCashFlowCategoryQuery = `
		INSERT INTO cash_flow_categories (
			id, organization_id, code, name, kind, category_type,
			is_system, sort_order, is_active
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	listCashFlowCategoriesByOrgIDQuery = `
		SELECT id, organization_id, code, name, kind, category_type,
		       is_system, sort_order, is_active, created_at, updated_at
		FROM cash_flow_categories
		WHERE organization_id = $1
	`

	updateCashFlowCategoryQuery = `
		UPDATE cash_flow_categories
		SET name = $3,
		    sort_order = $4,
		    is_active = $5,
		    updated_at = now()
		WHERE organization_id = $1 AND id = $2
	`

	// Chặn xóa danh mục hệ thống (is_system = true). 0 dòng -> ErrCashFlowCategoryNotFound.
	deleteCashFlowCategoryQuery = `
		DELETE FROM cash_flow_categories
		WHERE organization_id = $1 AND id = $2 AND is_system = false
	`



)
