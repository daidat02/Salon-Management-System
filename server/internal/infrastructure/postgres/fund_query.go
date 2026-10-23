package postgres

const (
	insertFundQuery = `
		INSERT INTO funds (
			id, organization_id, code, name, fund_type, bank_name, account_number,
			opening_balance, current_balance, is_active, is_default, is_configured
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	getFundByIDQuery = `
		SELECT id, organization_id, code, name, fund_type, bank_name, account_number,
		       opening_balance, current_balance, is_active, is_default, is_configured,
		       created_at, updated_at
		FROM funds
		WHERE organization_id = $1 AND id = $2
	`

	listFundsByOrgIDQuery = `
		SELECT id, organization_id, code, name, fund_type, bank_name, account_number,
		       opening_balance, current_balance, is_active, is_default, is_configured,
		       created_at, updated_at
		FROM funds
		WHERE organization_id = $1
	`

	updateFundQuery = `
		UPDATE funds
		SET name = $3,
		    bank_name = $4,
		    account_number = $5,
		    is_active = $6,
		    is_default = $7,
		    is_configured = $8,
		    updated_at = now()
		WHERE organization_id = $1 AND id = $2
	`

	deactivateFundQuery = `
		UPDATE funds
		SET is_active = false, updated_at = now()
		WHERE organization_id = $1 AND id = $2
	`

	// fundBalanceQuery tính breakdown từ phiếu đã duyệt. Không thấy quỹ -> pgx.ErrNoRows.
	fundBalanceQuery = `
		SELECT f.opening_balance,
		       COALESCE(SUM(CASE WHEN c.kind = 'income' THEN c.amount END), 0) AS total_income,
		       COALESCE(SUM(CASE WHEN c.kind = 'expense' THEN c.amount END), 0) AS total_expense
		FROM funds f
		LEFT JOIN cash_flows c
		       ON c.fund_id = f.id
		      AND c.status = 'approved'
		      AND c.deleted_at IS NULL
		WHERE f.organization_id = $1 AND f.id = $2
		GROUP BY f.id, f.opening_balance
	`

	lockFundRowQuery = `
		SELECT id, current_balance
		FROM funds
		WHERE organization_id = $1 AND id = $2 AND is_active
		FOR UPDATE
	`

	updateFundBalanceQuery = `
		UPDATE funds
		SET current_balance = current_balance + $3, updated_at = now()
		WHERE organization_id = $1 AND id = $2
	`

	getFundStatsQuery = `
		SELECT f.id, f.organization_id, f.code, f.fund_type, f.name, f.opening_balance,
		       f.current_balance, f.is_active, f.is_default, f.is_configured
		FROM funds f
		WHERE f.organization_id = $1
		ORDER BY f.created_at
	`

	getHistoricalFundBalanceQuery = `
		SELECT cf.id, cf.organization_id, cf.code, cf.kind, cf.category_id, cfc.name AS category_name,
			cf.fund_id, f.name AS fund_name, cf.amount, 
			cf.description, cf.occurred_at, cf.status, cf.order_id, cf.inventory_document_id,
			cf.created_by, cf.approved_by, cf.approved_at, cf.created_at, cf.updated_at 
		FROM cash_flows cf
		LEFT JOIN cash_flow_categories cfc ON cfc.id = cf.category_id
		LEFT JOIN funds f ON cf.fund_id = f.id
		WHERE cf.organization_id = $1
		AND cfc.category_type = 'non_pnl' 
		AND cfc.code IN ('CAPITAL_IN', 'CAPITAL_OUT') 
		AND cf.status = 'approved' AND cf.deleted_at IS NULL
		ORDER BY cf.created_at DESC 
	`
)
