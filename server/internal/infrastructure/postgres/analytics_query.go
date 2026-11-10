package postgres

const getRevenueTotalsQuery = `
	SELECT
		(
			SELECT COALESCE(SUM(o.total_amount), 0)
			FROM orders o
			WHERE o.organization_id = $1
				AND o.status = 'completed'
				AND o.created_at >= $2
				AND o.created_at <= $3
		) AS revenue,
		(
			(
				SELECT COALESCE(SUM(oim.unit_cost_at_time * oim.quantity), 0)
				FROM order_item_materials oim
				INNER JOIN order_items oi ON oi.id = oim.order_item_id
				INNER JOIN orders o ON o.id = oi.order_id
				WHERE o.organization_id = $1
					AND o.status = 'completed'
					AND o.created_at >= $2
					AND o.created_at <= $3
			)
			+
			(
				SELECT COALESCE(SUM(p.cost_price * oi.quantity), 0)
				FROM order_items oi
				INNER JOIN products p ON p.id = oi.product_id
				INNER JOIN orders o ON o.id = oi.order_id
				WHERE o.organization_id = $1
					AND o.status = 'completed'
					AND o.created_at >= $2
					AND o.created_at <= $3
					AND oi.item_type = 'product'
			)
		) AS cogs,
		(
			SELECT COALESCE(SUM(ois.commission_amount), 0)
			FROM order_item_staff ois
			INNER JOIN order_items oi ON oi.id = ois.order_item_id
			INNER JOIN orders o ON o.id = oi.order_id
			WHERE o.organization_id = $1
				AND o.status = 'completed'
				AND o.created_at >= $2
				AND o.created_at <= $3
		) AS commission,
		(
			SELECT COALESCE(SUM(cf.amount), 0)
			FROM cash_flows cf
			INNER JOIN cash_flow_categories cfc ON cfc.id = cf.category_id AND cfc.organization_id = $1
			WHERE cf.organization_id = $1
				AND cf.kind = 'expense'
				AND cf.status = 'approved'
				AND cf.deleted_at IS NULL
				AND cfc.category_type = 'operating_expense'
				AND cf.occurred_at >= $2
				AND cf.occurred_at <= $3
		) AS operating_expense
`

const getRevenueMonthlyQuery = `
	WITH completed_orders AS (
		SELECT
			o.id,
			o.total_amount,
			date_trunc('month', o.created_at) AS month
		FROM orders o
		WHERE o.organization_id = $1
			AND o.status = 'completed'
			AND o.created_at >= $2
			AND o.created_at <= $3
	),
	service_costs AS (
		SELECT
			oi.order_id,
			SUM(oim.unit_cost_at_time * oim.quantity) AS cogs
		FROM order_item_materials oim
		INNER JOIN order_items oi ON oi.id = oim.order_item_id
		INNER JOIN completed_orders o ON o.id = oi.order_id
		GROUP BY oi.order_id
	),
	product_costs AS (
		SELECT
			oi.order_id,
			SUM(p.cost_price * oi.quantity) AS cogs
		FROM order_items oi
		INNER JOIN products p ON p.id = oi.product_id
		INNER JOIN completed_orders o ON o.id = oi.order_id
		WHERE oi.item_type = 'product'
		GROUP BY oi.order_id
	),
	commissions AS (
		SELECT
			oi.order_id,
			SUM(ois.commission_amount) AS commission
		FROM order_item_staff ois
		INNER JOIN order_items oi ON oi.id = ois.order_item_id
		INNER JOIN completed_orders o ON o.id = oi.order_id
		GROUP BY oi.order_id
	),
	order_totals AS (
		SELECT
			o.month,
			SUM(o.total_amount) AS revenue,
			SUM(COALESCE(sc.cogs, 0) + COALESCE(pc.cogs, 0)) AS cogs,
			SUM(COALESCE(c.commission, 0)) AS commission
		FROM completed_orders o
		LEFT JOIN service_costs sc ON sc.order_id = o.id
		LEFT JOIN product_costs pc ON pc.order_id = o.id
		LEFT JOIN commissions c ON c.order_id = o.id
		GROUP BY o.month
	),
	operating_expenses AS (
		SELECT
			date_trunc('month', cf.occurred_at) AS month,
			SUM(cf.amount) AS operating_expense
		FROM cash_flows cf
		INNER JOIN cash_flow_categories cfc ON cfc.id = cf.category_id AND cfc.organization_id = $1
		WHERE cf.organization_id = $1
			AND cf.kind = 'expense'
			AND cf.status = 'approved'
			AND cf.deleted_at IS NULL
			AND cfc.category_type = 'operating_expense'
			AND cf.occurred_at >= $2
			AND cf.occurred_at <= $3
		GROUP BY date_trunc('month', cf.occurred_at)
	)
	SELECT
		to_char(COALESCE(ot.month, oe.month), 'YYYY-MM') AS month_key,
		COALESCE(ot.revenue, 0) AS revenue,
		COALESCE(ot.cogs, 0) AS cogs,
		COALESCE(ot.commission, 0) AS commission,
		COALESCE(oe.operating_expense, 0) AS operating_expense
	FROM order_totals ot
	FULL OUTER JOIN operating_expenses oe ON oe.month = ot.month
	ORDER BY 1
`

const getRevenueCompositionQuery = `
	WITH completed_orders AS (
		SELECT
			o.id,
			o.total_amount,
			o.subtotal_amount
		FROM orders o
		WHERE o.organization_id = $1
			AND o.status = 'completed'
			AND o.created_at >= $2
			AND o.created_at <= $3
	),
	items AS (
		SELECT
			oi.item_type,
			oi.line_total * CASE
				WHEN o.subtotal_amount > 0 THEN o.total_amount / o.subtotal_amount
				ELSE 0
			END AS net_amount
		FROM order_items oi
		INNER JOIN completed_orders o ON o.id = oi.order_id
	)
	SELECT
		COALESCE(SUM(net_amount) FILTER (WHERE item_type = 'service'), 0) AS service,
		COALESCE(SUM(net_amount) FILTER (WHERE item_type = 'product'), 0) AS retail
	FROM items
`

const getTopServicesQuery = `
	WITH completed_orders AS (
		SELECT
			o.id,
			o.total_amount,
			o.subtotal_amount
		FROM orders o
		WHERE o.organization_id = $1
			AND o.status = 'completed'
			AND o.created_at >= $2
			AND o.created_at <= $3
	),
	material_costs AS (
		SELECT
			oim.order_item_id,
			SUM(oim.unit_cost_at_time * oim.quantity) AS cogs
		FROM order_item_materials oim
		GROUP BY oim.order_item_id
	),
	commissions AS (
		SELECT
			ois.order_item_id,
			SUM(ois.commission_amount) AS commission
		FROM order_item_staff ois
		GROUP BY ois.order_item_id
	),
	service_items AS (
		SELECT
			oi.service_id,
			s.name,
			COALESCE(c.name, 'Khác') AS category,
			oi.quantity,
			oi.line_total * CASE
				WHEN o.subtotal_amount > 0 THEN o.total_amount / o.subtotal_amount
				ELSE 0
			END AS net_revenue,
			COALESCE(mc.cogs, 0) AS cogs,
			COALESCE(cm.commission, 0) AS commission
		FROM order_items oi
		INNER JOIN completed_orders o ON o.id = oi.order_id
		INNER JOIN services s ON s.id = oi.service_id
		LEFT JOIN categories c ON c.id = s.category_id
		LEFT JOIN material_costs mc ON mc.order_item_id = oi.id
		LEFT JOIN commissions cm ON cm.order_item_id = oi.id
		WHERE oi.item_type = 'service'
			AND oi.service_id IS NOT NULL
	)
	SELECT
		si.service_id AS id,
		si.name AS name,
		si.category AS category,
		COALESCE(SUM(si.quantity), 0) AS turns,
		COALESCE(SUM(si.net_revenue), 0) AS revenue,
		COALESCE(SUM(si.net_revenue - si.cogs - si.commission), 0) AS profit
	FROM service_items si
	GROUP BY si.service_id, si.name, si.category
	ORDER BY revenue DESC
	LIMIT $4
`
