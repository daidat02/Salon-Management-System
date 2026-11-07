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

	getStaffByIDQuery = `
		SELECT ` + staffSelectColumns + `
		FROM staff
		WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL
	`

	getStaffBasicByIDQuery = `
		SELECT id, code, full_name, position
		FROM staff
		WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL
	`

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

	getStaffPayrollQuery = `
	WITH params AS (
		SELECT
			COALESCE(
				NULLIF($3, '')::date,
				date_trunc('month', COALESCE(NULLIF($4, '')::date, CURRENT_DATE))::date
			) AS date_from,
			COALESCE(
				NULLIF($4, '')::date,
				(date_trunc('month', COALESCE(NULLIF($3, '')::date, CURRENT_DATE)) + INTERVAL '1 month - 1 day')::date
			) AS date_to,
			$5::int AS standard_working_days
	),
	bonus_adjustments_cte AS (
		SELECT
			sa.staff_id,
			COALESCE(SUM(sa.amount), 0) AS bonus_amount
		FROM staff_salary_adjustments sa
		CROSS JOIN params p
		WHERE sa.adjustment_type = 'ALLOWANCE'
			AND sa.organization_id = $1
			AND sa.effective_date >= p.date_from
			AND sa.effective_date <= p.date_to
		GROUP BY sa.staff_id
	),
	deduction_adjustments_cte AS (
		SELECT
			sa.staff_id,
			COALESCE(SUM(sa.amount), 0) AS adjustment_deduction
		FROM staff_salary_adjustments sa
		CROSS JOIN params p
		WHERE sa.adjustment_type = 'DEDUCTION'
			AND sa.organization_id = $1
			AND sa.effective_date >= p.date_from
			AND sa.effective_date <= p.date_to
		GROUP BY sa.staff_id
	),
	salary_advance_cte AS (
		SELECT
			cf.staff_id,
			COALESCE(SUM(cf.amount), 0) AS advance_amount
		FROM cash_flows cf
		INNER JOIN cash_flow_categories cfc ON cfc.id = cf.category_id
		CROSS JOIN params p
		WHERE cfc.kind = 'expense'
			AND cfc.code = 'SALARY_ADVANCE'
			AND cf.organization_id = $1
			AND cf.created_at >= p.date_from::timestamptz
			AND cf.created_at < (p.date_to + 1)::timestamptz
		GROUP BY cf.staff_id
	),
	penalty_cte AS (
		SELECT
			cf.staff_id,
			COALESCE(SUM(cf.amount), 0) AS penalty_amount
		FROM cash_flows cf
		INNER JOIN cash_flow_categories cfc ON cfc.id = cf.category_id
		CROSS JOIN params p
		WHERE cfc.kind = 'expense'
			AND cfc.code = 'PENALTY'
			AND cf.organization_id = $1
			AND cf.created_at >= p.date_from::timestamptz
			AND cf.created_at < (p.date_to + 1)::timestamptz
		GROUP BY cf.staff_id
	),
	leave_days_cte AS (
		SELECT
			a.staff_id,
			COUNT(a.id) AS total_leave_days
		FROM attendances a
		CROSS JOIN params p
		WHERE a.organization_id = $1
			AND a.status IN ('LEAVE_EXCUSED', 'LEAVE_UNEXCUSED')
			AND a.target_date >= p.date_from
			AND a.target_date <= p.date_to
		GROUP BY a.staff_id
	),
	commission_cte AS (
		SELECT
			COUNT(DISTINCT oi.order_id) AS total_orders,
			COUNT(ois.id) AS total_items,
			COALESCE(SUM(ois.commission_amount), 0) AS total_commission,
			COALESCE(SUM(oi.line_total), 0) AS total_amount_value
		FROM order_item_staff ois
		INNER JOIN order_items oi ON oi.id = ois.order_item_id
		INNER JOIN orders o ON o.id = oi.order_id
		CROSS JOIN params p
		WHERE o.status = 'completed'
			AND oi.service_id IS NOT NULL
			AND oi.product_id IS NULL
			AND ois.organization_id = $1
			AND ois.staff_id = $2
			AND ois.created_at >= p.date_from::timestamptz
			AND ois.created_at < (p.date_to + 1)::timestamptz
	)

	SELECT
		s.id AS staff_id,
		p.date_from,
		p.date_to,
		s.base_salary,
		p.standard_working_days,
		COALESCE(ld.total_leave_days, 0)::int AS total_leave_days,
		GREATEST(p.standard_working_days - COALESCE(ld.total_leave_days, 0), 0)::int AS actual_working_days,
		ROUND(
			s.base_salary * GREATEST(p.standard_working_days - COALESCE(ld.total_leave_days, 0), 0)
			/ NULLIF(p.standard_working_days, 0),
			2
		) AS prorated_base_salary,
		COALESCE(ba.bonus_amount, 0) AS bonus_amount,
		COALESCE(da.adjustment_deduction, 0) AS adjustment_deduction,
		COALESCE(pc.penalty_amount, 0) AS penalty_amount,
		COALESCE(sa.advance_amount, 0) AS advance_amount,
		(COALESCE(da.adjustment_deduction, 0) + COALESCE(pc.penalty_amount, 0)) AS total_deduction,
		COALESCE(c.total_orders, 0) AS total_orders,
		COALESCE(c.total_items, 0) AS total_items,
		COALESCE(c.total_commission, 0) AS total_commission,
		COALESCE(c.total_amount_value, 0) AS total_amount_value,
		GREATEST(
			ROUND(
				s.base_salary * GREATEST(p.standard_working_days - COALESCE(ld.total_leave_days, 0), 0)
				/ NULLIF(p.standard_working_days, 0),
				2
			)
			+ COALESCE(c.total_commission, 0)
			+ COALESCE(ba.bonus_amount, 0)
			- COALESCE(sa.advance_amount, 0)
			- COALESCE(da.adjustment_deduction, 0)
			- COALESCE(pc.penalty_amount, 0),
			0
		) AS net_pay
	FROM staff s
	CROSS JOIN params p
	LEFT JOIN bonus_adjustments_cte ba ON ba.staff_id = s.id
	LEFT JOIN deduction_adjustments_cte da ON da.staff_id = s.id
	LEFT JOIN salary_advance_cte sa ON sa.staff_id = s.id
	LEFT JOIN penalty_cte pc ON pc.staff_id = s.id
	LEFT JOIN leave_days_cte ld ON ld.staff_id = s.id
	LEFT JOIN commission_cte c ON TRUE
	WHERE s.organization_id = $1
		AND s.id = $2
		AND s.deleted_at IS NULL
	`

	existPayrollOfStaffAndPeriodQuery = `
		SELECT 1
		FROM payrolls
		WHERE organization_id = $1 AND staff_id = $2 AND period_month = $3
		LIMIT 1
	`

	createPayrollQuery = `
    INSERT INTO payrolls (
        id, organization_id, staff_id, period_month, base_salary,
        commission_amount, bonus_amount, advance_amount, deduction_amount,
        net_pay, status, cash_flow_id, created_by, approved_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
`

	createSalaryAdjustmentQuery = `
		INSERT INTO staff_salary_adjustments (
			id, organization_id, staff_id, adjustment_type, amount, reason, effective_date
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7);
	`
	getSalaryAdjustmentsQuery = `
		SELECT id, organization_id, staff_id, payroll_id, adjustment_type, amount, reason, effective_date,created_at, updated_at
		FROM staff_salary_adjustments
		WHERE organization_id = $1 AND staff_id = $2 
		AND effective_date >= date_trunc('month', $3::timestamptz) 
		AND effective_date < date_trunc('month', $3::timestamptz) + INTERVAL '1 month'
	`
	updateStaffSalaryAdjustmentsQuery = `
		UPDATE staff_salary_adjustments
		SET payroll_id = $4
		WHERE organization_id = $1 AND staff_id = $2 
		AND effective_date >= date_trunc('month', $3::timestamptz)
      	AND effective_date < date_trunc('month', $3::timestamptz) + INTERVAL '1 month';
	`
	deleteStaffSalaryAdjustmentsQuery = `
		DELETE FROM staff_salary_adjustments
		WHERE organization_id = $1 AND id = $2 AND payroll_id IS NULL;
	`

	createAttendanceQuery = `
		INSERT INTO attendances (
			id, organization_id, staff_id, target_date, status, note
		)
		VALUES ($1, $2, $3, $4, $5, $6);
	`

	getAttendancesOfStaffQuery = `
		SELECT id, organization_id, staff_id, target_date, status, note, payroll_id, created_at, updated_at
		FROM attendances
		WHERE organization_id = $1 AND staff_id = $2
			AND target_date >= date_trunc('month', $3::timestamptz)
			AND target_date < date_trunc('month', $3::timestamptz) + INTERVAL '1 month';
	`

	updateAttendancesQuery = `
		UPDATE attendances
		SET payroll_id = $4
		WHERE organization_id = $1 AND staff_id = $2 
		AND target_date >= date_trunc('month', $3::timestamptz)
	  	AND target_date < date_trunc('month', $3::timestamptz) + INTERVAL '1 month';
	`

	createStaffLeaveQuery = `
		INSERT INTO staff_leaves (
			id, organization_id, staff_id, leave_type, start_date, end_date, note
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7);
	`

	getStaffLeavesQuery = `
		SELECT id, organization_id, staff_id, leave_type, start_date, end_date,
			COALESCE(note, '') AS note, created_at, updated_at
		FROM staff_leaves
		WHERE organization_id = $1 AND staff_id = $2
		ORDER BY start_date DESC, created_at DESC;
	`

	lockedAttendanceInRangeQuery = `
		SELECT EXISTS(
			SELECT 1
			FROM attendances
			WHERE organization_id = $1 AND staff_id = $2
				AND target_date BETWEEN $3 AND $4
				AND payroll_id IS NOT NULL
		);
	`

	upsertLeaveAttendanceQuery = `
		INSERT INTO attendances (id, organization_id, staff_id, target_date, status, note)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
		ON CONFLICT (staff_id, target_date) DO UPDATE
		SET status = EXCLUDED.status,
			note = EXCLUDED.note,
			updated_at = now()
		WHERE attendances.payroll_id IS NULL;
	`
)
