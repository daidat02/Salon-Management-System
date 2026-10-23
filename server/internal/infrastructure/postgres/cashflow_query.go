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

	getCashflowByOrgIDQuery = `
		SELECT 
			cf.id, cf.organization_id, cf.code, cf.kind, cf.category_id, cat.name AS category_name,
			cf.fund_id, f.name AS fund_name, cf.amount, 
			cf.description, cf.occurred_at, cf.status, cf.order_id, cf.inventory_document_id,
			cf.created_by, cf.approved_by, cf.approved_at, cf.created_at, cf.updated_at
		FROM cash_flows cf
		LEFT JOIN cash_flow_categories cat ON cf.category_id = cat.id
		LEFT JOIN funds f ON cf.fund_id = f.id
		WHERE cf.organization_id = $1 
		AND cf.deleted_at IS NULL
	`
	searchCashflowFilter = `
        AND ($2 = '' OR cf.code ILIKE $2 OR cf.description ILIKE $2)
    `
	filterCashflow = `
        AND (
            $3 = '' OR cf.status = $3
        )
        AND (
            $4 = '' OR cf.kind = $4
        )
        AND (
            $5 = '' OR cf.category_id::text = $5
        )
        AND (
            $6 = '' OR cf.fund_id::text = $6
        )
    `
	filterCashflowByDate = `
        AND cf.occurred_at >= COALESCE(NULLIF($7, '')::timestamptz, date_trunc('month', CURRENT_TIMESTAMP))
        AND cf.occurred_at <= COALESCE(NULLIF($8, '')::timestamptz, (date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month - 1 second'))
    `
	sortCashflowFilter = `
        ORDER BY 
        CASE WHEN $9 = 'amount_asc' THEN cf.amount END ASC,
        CASE WHEN $9 = 'amount_desc' THEN cf.amount END DESC,
        CASE WHEN $9 = 'created_at_asc' THEN cf.created_at END ASC,
        CASE WHEN $9 = 'created_at_desc' THEN cf.created_at END DESC,
        cf.created_at DESC
    `
	countCashflowByOrgIDQuery = `
		SELECT COUNT(*) FROM cash_flows cf
		WHERE cf.organization_id = $1 
		AND cf.deleted_at IS NULL
	`

	// Dùng cho GetCashFlowByID (trả entity, không join tên danh mục/quỹ).
	getCashFlowEntityByIDQuery = `
		SELECT id, organization_id, code, kind, category_id, fund_id, amount, description,
		       occurred_at, status, order_id, inventory_document_id, created_by, approved_by,
		       approved_at, created_at, updated_at, deleted_at
		FROM cash_flows
		WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL
	`

	// lockCashFlowForApproveQuery khóa phiếu để duyệt nguyên tử.
	// Không thấy trả pgx.ErrNoRows.
	lockCashFlowForApproveQuery = `
		SELECT kind, fund_id, amount, status
		FROM cash_flows
		WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL
		FOR UPDATE
	`

	approveCashFlowQuery = `
		UPDATE cash_flows
		SET status = 'approved',
		    approved_by = $3,
		    approved_at = now(),
		    updated_at = now()
		WHERE organization_id = $1 AND id = $2 AND status = 'pending' AND deleted_at IS NULL
	`

	cancelCashFlowQuery = `
		UPDATE cash_flows
		SET status = 'cancelled', updated_at = now()
		WHERE organization_id = $1 AND id = $2 AND status = 'pending' AND deleted_at IS NULL
	`

	getCashFlowStats = `
		SELECT
			COALESCE(SUM(amount) FILTER(WHERE cf.kind = 'income' AND cf.status = 'approved' AND cfc.category_type = 'revenue'), 0) AS total_income,
			COALESCE(SUM(amount) FILTER(WHERE cf.kind = 'expense' AND cf.status = 'approved' AND cfc.category_type = 'operating_expense'), 0) AS total_operating_expense,
			COALESCE(SUM(amount) FILTER(WHERE cf.kind = 'expense' AND cf.status = 'approved' AND cfc.category_type = 'non_pnl'), 0) AS total_non_pnl_expense
		FROM cash_flows cf
		LEFT JOIN cash_flow_categories cfc ON cfc.id = cf.category_id
		WHERE cf.organization_id = $1
		AND cf.deleted_at IS NULL
		AND cf.occurred_at >= COALESCE(NULLIF($2, '')::timestamptz, date_trunc('month', CURRENT_TIMESTAMP))
		AND cf.occurred_at <= COALESCE(NULLIF($3, '')::timestamptz, (date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month - 1 second'))
	`
)
