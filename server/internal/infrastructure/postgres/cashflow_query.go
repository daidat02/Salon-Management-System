package postgres


const (
	InsertCashFlowQuery = `
		INSERT INTO cash_flows (id, organization_id, code, kind, category_id, fund_id, amount, description, occurred_at, status, order_id, inventory_document_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	// findCashFlowIDByOrderQuery phục vụ idempotency hook chốt đơn:
	// đơn đã có phiếu thì không sinh thêm. Không thấy trả pgx.ErrNoRows.
	findCashFlowIDByOrderQuery = `
		SELECT id FROM cash_flows
		WHERE organization_id = $1 AND order_id = $2 AND deleted_at IS NULL
		LIMIT 1
	`

	// findActiveFundIDByCodeQuery resolve quỹ hệ thống hard-code (vd CASH).
	// Không thấy trả pgx.ErrNoRows.
	findActiveFundIDByCodeQuery = `
		SELECT id FROM funds
		WHERE organization_id = $1 AND code = $2 AND is_active
		LIMIT 1
	`

	// findActiveCategoryIDByCodeQuery resolve danh mục hệ thống (vd SALON_REVENUE).
	// Không thấy trả pgx.ErrNoRows.
	findActiveCategoryIDByCodeQuery = `
		SELECT id FROM cash_flow_categories
		WHERE organization_id = $1 AND code = $2 AND kind = $3 AND is_active
		LIMIT 1
	`
)	