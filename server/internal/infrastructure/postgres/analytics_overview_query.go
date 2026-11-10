package postgres

const getOverviewOrderMetricsQuery = `
	WITH day_orders AS (
		SELECT
			o.id,
			o.total_amount,
			o.status
		FROM orders o
		WHERE o.organization_id = $1
			AND o.created_at >= $2
			AND o.created_at <= $3
	),
	paid_amounts AS (
		SELECT
			p.order_id,
			SUM(p.amount) AS paid_amount
		FROM payments p
		INNER JOIN day_orders o ON o.id = p.order_id
		WHERE p.status = 'succeeded'
		GROUP BY p.order_id
	)
	SELECT
		COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) AS revenue,
		COUNT(*) FILTER (WHERE o.status = 'completed') AS completed_orders,
		COUNT(*) FILTER (WHERE o.status <> 'cancelled') AS total_orders,
		COUNT(*) FILTER (
			WHERE o.status <> 'cancelled'
				AND COALESCE(pa.paid_amount, 0) < o.total_amount
		) AS unpaid_orders
	FROM day_orders o
	LEFT JOIN paid_amounts pa ON pa.order_id = o.id
`

const getOverviewAppointmentSummaryQuery = `
	SELECT
		COUNT(*) FILTER (WHERE status NOT IN ('cancelled', 'no_show')) AS total,
		COUNT(*) FILTER (WHERE status = 'pending') AS pending
	FROM appointments
	WHERE organization_id = $1
		AND start_time >= $2
		AND start_time <= $3
`

const getOverviewDailyRevenueQuery = `
	WITH days AS (
		SELECT generate_series(
			($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
			($3::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
			interval '1 day'
		)::date AS day
	),
	order_daily AS (
		SELECT
			(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
			SUM(o.total_amount) AS revenue
		FROM orders o
		WHERE o.organization_id = $1
			AND o.status = 'completed'
			AND o.created_at >= $2
			AND o.created_at <= $3
		GROUP BY 1
	),
	appointment_daily AS (
		SELECT
			(a.start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
			COUNT(*) AS appointments
		FROM appointments a
		WHERE a.organization_id = $1
			AND a.status NOT IN ('cancelled', 'no_show')
			AND a.start_time >= $2
			AND a.start_time <= $3
		GROUP BY 1
	)
	SELECT
		to_char(d.day, 'YYYY-MM-DD') AS day,
		COALESCE(od.revenue, 0) AS revenue,
		COALESCE(ad.appointments, 0) AS appointments
	FROM days d
	LEFT JOIN order_daily od ON od.day = d.day
	LEFT JOIN appointment_daily ad ON ad.day = d.day
	ORDER BY d.day
`

const getOverviewLowStockQuery = `
	SELECT
		p.id::text AS id,
		p.name,
		COALESCE(p.unit, '') AS unit,
		p.stock_quantity,
		p.min_stock
	FROM products p
	WHERE p.organization_id = $1
		AND p.is_active = true
		AND p.min_stock > 0
		AND p.stock_quantity <= p.min_stock
	ORDER BY (p.stock_quantity / NULLIF(p.min_stock, 0)) ASC, p.name ASC
	LIMIT $2
`

const getOverviewTodayAppointmentsQuery = `
	SELECT
		a.id::text AS id,
		a.start_time,
		COALESCE(c.full_name, '') AS customer_name,
		COALESCE((
			SELECT string_agg(COALESCE(s.name, p.name), ' + ' ORDER BY COALESCE(s.name, p.name))
			FROM appointment_items ai
			LEFT JOIN services s ON s.id = ai.service_id
			LEFT JOIN products p ON p.id = ai.product_id
			WHERE ai.appointment_id = a.id
		), '') AS service_summary,
		COALESCE(st.full_name, '') AS staff_name,
		a.status
	FROM appointments a
	LEFT JOIN customers c ON c.id = a.customer_id
	LEFT JOIN staff st ON st.id = a.staff_id
	WHERE a.organization_id = $1
		AND a.start_time >= $2
		AND a.start_time <= $3
		AND a.status NOT IN ('cancelled', 'no_show')
	ORDER BY a.start_time ASC
	LIMIT $4
`

const getOverviewRecentOrdersQuery = `
	SELECT
		o.id::text AS id,
		o.code,
		COALESCE(c.full_name, '') AS customer_name,
		COALESCE((
			SELECT string_agg(COALESCE(s.name, p.name), ' + ' ORDER BY COALESCE(s.name, p.name))
			FROM order_items oi
			LEFT JOIN services s ON s.id = oi.service_id
			LEFT JOIN products p ON p.id = oi.product_id
			WHERE oi.order_id = o.id
		), '') AS summary,
		o.total_amount,
		CASE
			WHEN COALESCE((
				SELECT SUM(pay.amount)
				FROM payments pay
				WHERE pay.order_id = o.id
					AND pay.status = 'succeeded'
			), 0) >= o.total_amount THEN 'paid'
			ELSE 'unpaid'
		END AS payment_status
	FROM orders o
	LEFT JOIN customers c ON c.id = o.customer_id
	WHERE o.organization_id = $1
		AND o.status <> 'cancelled'
	ORDER BY o.created_at DESC
	LIMIT $2
`
