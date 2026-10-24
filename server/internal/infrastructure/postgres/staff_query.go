package postgres

const (
	staffSelectColumns = `
		id, organization_id, code, full_name, COALESCE(phone, '') AS phone,
		COALESCE(email, '') AS email, birth_date, COALESCE(gender, '') AS gender,
		COALESCE(address, '') AS address, position,
		COALESCE(employment_type, '') AS employment_type, commission_rate,
		base_salary, COALESCE(bank_name, '') AS bank_name,
		COALESCE(bank_account_number, '') AS bank_account_number,
		COALESCE(bank_account_holder, '') AS bank_account_holder,
		status, COALESCE(hire_date, '0001-01-01') AS hire_date, created_at, updated_at, deleted_at
	`
	nextStaffCodeQuery = `
		SELECT COALESCE(
			MAX(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '')::int),
			0
		) + 1
		FROM staff
		WHERE organization_id = $1 AND code ~ '^NV[0-9]+$'
	`
	createStaffQuery = `
		INSERT INTO staff (
			id, organization_id, code, full_name, phone, email, birth_date, gender,
			address, position, employment_type, commission_rate, base_salary,
			bank_name, bank_account_number, bank_account_holder, status, hire_date
		)
		VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`
	getStaffsByOrgIDQuery = `
		SELECT ` + staffSelectColumns + `
		FROM staff
		WHERE organization_id = $1 AND deleted_at IS NULL
	`
	searchStaffsFilter = `
		AND ($2 = '' OR full_name ILIKE $2 OR code ILIKE $2 OR phone ILIKE $2 OR position ILIKE $2)
	`
	filterStaffsStatus = `
		AND ($3 = '' OR status = $3)
	`
	sortStaffsFilter = `
		ORDER BY
			CASE WHEN $4 = 'name_asc' THEN full_name END ASC,
			CASE WHEN $4 = 'name_desc' THEN full_name END DESC,
			CASE WHEN $4 = 'hire_date_asc' THEN hire_date END ASC,
			CASE WHEN $4 = 'hire_date_desc' THEN hire_date END DESC,
			created_at DESC
	`
	countStaffsByOrgIDQuery = `
		SELECT COUNT(*)
		FROM staff
		WHERE organization_id = $1 AND deleted_at IS NULL`
	updateStaffQuery = `
		UPDATE staff
		SET code = $3, full_name = $4, phone = $5, email = $6, birth_date = $7,
		    gender = $8, address = $9, position = $10, employment_type = $11,
		    commission_rate = $12, base_salary = $13, bank_name = $14,
		    bank_account_number = $15, bank_account_holder = $16, status = $17,
		    hire_date = $18
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	deleteStaffQuery = `
		UPDATE staff
		SET deleted_at = now()
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	staffsExistInOrgQuery = `
		SELECT id
		FROM staff
		WHERE organization_id = $1 AND id = ANY($2) AND deleted_at IS NULL
	`
)
