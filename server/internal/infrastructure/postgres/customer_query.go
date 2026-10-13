package postgres

const (
	createCustomerQuery = `
		INSERT INTO customers (id, organization_id, full_name, phone, gender, birth_date, note)
		VALUES($1, $2, $3, $4, $5, $6, $7)
	`
	listCustomersByOrgIDQuery = `
		SELECT id, organization_id, full_name, phone,
		       COALESCE(gender, '') AS gender, birth_date, COALESCE(note, '') AS note,
		       total_spent, total_visits, reward_points, is_flagged_risk, created_at, updated_at, deleted_at
		FROM customers
		WHERE organization_id = $1 AND deleted_at IS NULL
	`
	countCustomersByOrgIDQuery = `
		SELECT COUNT(*)
		FROM customers
		WHERE organization_id = $1 AND deleted_at IS NULL
	`
	// searchCustomersFilter lọc theo tên hoặc phone (ILIKE, không phân biệt hoa thường).
	// $2 là từ khóa đã bọc %...% ở tầng repo.
	searchCustomersFilter = `
		AND (full_name ILIKE $2 OR phone ILIKE $2)
	`
	getCustomerQuery = `
		SELECT id, organization_id, full_name, phone,
		       COALESCE(gender, '') AS gender, birth_date, COALESCE(note, '') AS note,
		       total_spent, total_visits, reward_points, is_flagged_risk, created_at, updated_at, deleted_at
		FROM customers
		WHERE organization_id = $1 
	`
	withIDFilter = `
		AND id = $2 AND deleted_at IS NULL
	`
	withPhoneFilter = `
		AND phone = $2 AND deleted_at IS NULL
	`
	updateCustomerQuery = `
		UPDATE customers
		SET full_name = $3, phone = $4, gender = $5, birth_date = $6, note = $7
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	deleteCustomerQuery = `
		UPDATE customers
		SET deleted_at = now()
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	findCustomerByPhoneQuery = `
		SELECT id, organization_id, full_name, phone,
		       COALESCE(gender, '') AS gender, birth_date, COALESCE(note, '') AS note,
		       total_spent, total_visits, reward_points, is_flagged_risk, created_at, updated_at, deleted_at
		FROM customers
		WHERE organization_id = $1 AND phone = $2 AND deleted_at IS NULL
		LIMIT 1
	`
	customerExistsInOrgQuery = `
		SELECT EXISTS(SELECT 1 FROM customers WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL)
	`
	getCustomerDetailsQuery = `
		WITH last_6_months AS (
			SELECT generate_series(
				date_trunc('month', NOW() - INTERVAL '5 months'),
				date_trunc('month', NOW()),
				INTERVAL '1 month'
			) AS month_start
		),
		customer_monthly_spending AS (
			SELECT 
				m.month_start,
				COALESCE(SUM(o.total_amount), 0) AS total_spent,
				COUNT(o.id) AS total_orders
			FROM last_6_months m
			LEFT JOIN orders o ON o.customer_id = $2 
				AND o.organization_id = $1
				AND date_trunc('month', o.created_at) = m.month_start
				AND o.status = 'paid' -- (Tùy chọn) Chỉ tính đơn hoàn thành
			GROUP BY m.month_start
		)
		SELECT 
			c.id, 
			c.organization_id, 
			c.full_name, 
			c.phone, 
			COALESCE(c.gender, '') AS gender, 
			c.birth_date, 
			COALESCE(c.note, '') AS note, 
			c.total_spent, 
			c.total_visits,
			c.reward_points,
			c.is_flagged_risk,
			c.created_at,
			c.updated_at,
			c.deleted_at,
			(
                SELECT COUNT(a.id)
                FROM appointments a
                WHERE a.organization_id = $1 
                  AND a.customer_id = $2 
                  AND a.status IN ('no_show', 'cancelled')
            ) AS total_cancelled_appointments,
			(
				SELECT json_agg(
					json_build_object(
						'month', TO_CHAR(cms.month_start, 'YYYY-MM'),
						'total_spent', cms.total_spent,
						'total_orders', cms.total_orders
					) ORDER BY cms.month_start ASC
				)
				FROM customer_monthly_spending cms
			) AS spending_by_month
		FROM customers c
		WHERE 
			c.organization_id = $1
			AND c.id = $2
			AND c.deleted_at IS NULL;
	`

	getCustomerStatsQuery = `
		SELECT 
			COUNT(c.id) AS total_customer,
			COUNT(c.id) FILTER (
				WHERE c.created_at >= date_trunc('month', NOW())
				AND c.deleted_at IS NULL
			) AS total_new_customer,
			COUNT(c.id) FILTER (
				WHERE c.created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
				AND c.created_at < date_trunc('month', NOW())
				AND c.deleted_at IS NULL
			) AS total_new_customer_last_month,
			COALESCE(SUM(c.reward_points), 0) AS total_outstanding_points
		FROM customers c
		WHERE c.organization_id = $1
		AND c.deleted_at IS NULL;
	`
)
