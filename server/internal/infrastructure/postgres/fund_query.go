package postgres


const (


	lockFundRowQuery = `
		SELECT id, current_balance
		FROM funds
		WHERE organization_id = $1 AND id = $2 AND is_active
		FOR UPDATE
	`

	updateFundBalanceQuery = `
		UPDATE funds
		SET opening_balance  = opening_balance + $3, updated_at = now()
		WHERE organization_id = $1 AND id = $2
	`
)