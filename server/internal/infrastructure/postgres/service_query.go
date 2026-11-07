package postgres

const (
	createServiceQuery = `
		INSERT INTO services (id, organization_id, category_id, name, description, duration_minutes, buffer_minutes, price, is_active)
		VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	listServicesByOrgIDQuery = `
		SELECT s.id, s.organization_id, s.category_id, c.name AS category_name,
		       s.name, s.description, s.duration_minutes, s.buffer_minutes, s.price,
		       s.is_active, stats.sold_this_month, stats.revenue_this_month,
		       s.created_at, s.updated_at
		FROM services s
		LEFT JOIN categories c
		       ON c.id = s.category_id AND c.organization_id = s.organization_id
		LEFT JOIN LATERAL (
			SELECT COALESCE(SUM(oi.quantity), 0) AS sold_this_month,
			       COALESCE(SUM(oi.line_total), 0) AS revenue_this_month
			FROM order_items oi
			JOIN orders o ON o.id = oi.order_id AND o.organization_id = oi.organization_id
			WHERE oi.organization_id = s.organization_id
			  AND oi.service_id = s.id
			  AND oi.item_type = 'service'
			  AND o.status = 'completed'
			  AND date_trunc('month', o.created_at) = date_trunc('month', NOW())
		) stats ON TRUE
		WHERE s.organization_id = $1
	`
	searchServicesFilter = `
		AND ($2 = '' OR s.name ILIKE $2 OR s.description ILIKE $2)
	`
	filterServicesStatus = `
		AND ($3 = '' 
		OR ($3 = 'active' AND s.is_active = TRUE)
		OR ($3 = 'inactive' AND s.is_active = FALSE))
	`
	filterServicesCategory = `
		AND ($4 = '' OR s.category_id = NULLIF($4, '')::uuid)
	`
	sortServicesFilter = `
		ORDER BY 
			CASE WHEN $5 = 'price_asc' THEN s.price END ASC,
			CASE WHEN $5 = 'price_desc' THEN s.price END DESC,
			CASE WHEN $5 = 'duration_asc' THEN s.duration_minutes END ASC,
			CASE WHEN $5 = 'name_asc' THEN s.name END ASC,
			s.created_at DESC
	`
	countServicesByOrgIDQuery = `
		SELECT COUNT(*)
		FROM services s
		WHERE s.organization_id = $1
	`
	getServiceStatsQuery = `
		SELECT
			COUNT(s.id) AS total_services,
			COUNT(s.id) FILTER (WHERE s.is_active) AS active_services,
			COUNT(s.id) FILTER (WHERE NOT s.is_active) AS inactive_services,
			COALESCE((
				SELECT SUM(oi.line_total)
				FROM order_items oi
				JOIN orders o ON o.id = oi.order_id AND o.organization_id = oi.organization_id
				WHERE oi.organization_id = $1
				  AND oi.item_type = 'service'
				  AND o.status = 'completed'
				  AND date_trunc('month', o.created_at) = date_trunc('month', NOW())
			), 0) AS service_revenue_month
		FROM services s
		WHERE s.organization_id = $1
	`
	serviceSalesLastMonthsQuery = `
		SELECT date_trunc('month', o.created_at) AS month_start,
		       COALESCE(SUM(oi.quantity), 0) AS quantity,
		       COALESCE(SUM(oi.line_total), 0) AS revenue
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id AND o.organization_id = oi.organization_id
		WHERE oi.organization_id = $1
		  AND oi.service_id = $2
		  AND oi.item_type = 'service'
		  AND o.status = 'completed'
		  AND o.created_at >= date_trunc('month', NOW()) - (($3::int - 1) * INTERVAL '1 month')
		GROUP BY 1
		ORDER BY 1
	`
	getServiceBookingStatsQuery = `
		SELECT
			COUNT(DISTINCT a.id) FILTER (
				WHERE date_trunc('month', a.start_time) = date_trunc('month', NOW())
			) AS bookings_this_month,
			COUNT(DISTINCT a.id) FILTER (
				WHERE a.status = 'completed'
				  AND date_trunc('month', a.start_time) = date_trunc('month', NOW())
			) AS completed_this_month,
			COALESCE((
				SELECT SUM(m.quantity * m.unit_cost_at_time)
				FROM order_item_materials m
				JOIN order_items oi ON oi.id = m.order_item_id
				JOIN orders o ON o.id = oi.order_id AND o.organization_id = oi.organization_id
				WHERE oi.organization_id = $1
				  AND oi.service_id = $2
				  AND oi.item_type = 'service'
				  AND o.status = 'completed'
				  AND date_trunc('month', o.created_at) = date_trunc('month', NOW())
			), 0) AS material_cost_this_month
		FROM appointment_items ai
		JOIN appointments a ON a.id = ai.appointment_id AND a.organization_id = ai.organization_id
		WHERE ai.organization_id = $1
		  AND ai.service_id = $2
		  AND ai.item_type = 'service'
	`
	updateServiceQuery = `
		UPDATE services
		SET category_id = $3, name = $4, description = $5, duration_minutes = $6,
		    buffer_minutes = $7, price = $8, is_active = $9
		WHERE id = $1 AND organization_id = $2
	`
	deleteServiceQuery = `
		DELETE FROM services
		WHERE id = $1 AND organization_id = $2
	`

	bulkInsertServiceMaterialsQuery = `
		INSERT INTO service_materials (id, organization_id, service_id, product_id, quantity, unit)
		VALUES
	`
	categoryExistsInOrgQuery = `
		SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1 AND organization_id = $2)
	`
	productsExistInOrgQuery = `
		SELECT id FROM products WHERE organization_id = $1 AND id = ANY($2)
	`
	productUnitsInOrgQuery = `
		SELECT id, unit, net_unit, net_amount FROM products WHERE organization_id = $1 AND id = ANY($2)
	`
	servicesExistInOrgQuery = `
		SELECT id FROM services WHERE organization_id = $1 AND id = ANY($2::uuid[])
	`
	serviceMaterialsWithCostQuery = `
		SELECT sm.service_id, sm.product_id, sm.quantity, COALESCE(sm.unit, ''), p.cost_price
		FROM service_materials sm
		JOIN products p ON p.id = sm.product_id AND p.organization_id = sm.organization_id
		WHERE sm.organization_id = $1 AND sm.service_id = ANY($2)
	`
	servicePricesQuery = `
		SELECT id, price
		FROM services
		WHERE organization_id = $1 AND id = ANY($2)
	`
	getServiceDetailsQuery = `
		SELECT 
			s.id, s.organization_id, s.category_id, c.name AS category_name,
			s.name, s.description, s.duration_minutes,
			s.buffer_minutes, s.price, s.is_active,
			COALESCE((
				SELECT SUM(oi.quantity)
				FROM order_items oi
				JOIN orders o ON o.id = oi.order_id AND o.organization_id = oi.organization_id
				WHERE oi.organization_id = s.organization_id
				  AND oi.service_id = s.id
				  AND oi.item_type = 'service'
				  AND o.status = 'completed'
				  AND date_trunc('month', o.created_at) = date_trunc('month', NOW())
			), 0) AS sold_this_month,
			COALESCE((
				SELECT SUM(oi.line_total)
				FROM order_items oi
				JOIN orders o ON o.id = oi.order_id AND o.organization_id = oi.organization_id
				WHERE oi.organization_id = s.organization_id
				  AND oi.service_id = s.id
				  AND oi.item_type = 'service'
				  AND o.status = 'completed'
				  AND date_trunc('month', o.created_at) = date_trunc('month', NOW())
			), 0) AS revenue_this_month,
			s.created_at, s.updated_at,
			COALESCE(
				json_agg(
					json_build_object(
						'id', sm.id,
						'organization_id', sm.organization_id,
						'service_id', sm.service_id,
						'product_id', sm.product_id,
						'product_name', p.name,
						-- cost_price luôn là giá trên đơn vị lớn của SP; quy về
						-- đúng đơn vị của định mức (sm.unit) để quantity * cost_price
						-- ra đúng giá vốn. Chỉ trường hợp định mức dùng đơn vị nhỏ
						-- (net_unit) mới cần chia cho net_amount.
						'cost_price', CASE
							WHEN p.net_unit IS NOT NULL
							  AND btrim(p.net_unit) <> ''
							  AND p.net_unit <> p.unit
							  AND p.net_amount > 0
							  AND btrim(COALESCE(sm.unit, '')) = p.net_unit
							THEN p.cost_price / p.net_amount
							ELSE p.cost_price
						END,
						'product_unit', p.unit,
						'quantity', sm.quantity,
						'unit', sm.unit,
						'created_at', sm.created_at,
						'updated_at', sm.updated_at
					)
				) FILTER (WHERE sm.product_id IS NOT NULL), '[]'
			) AS materials
		FROM services s
		LEFT JOIN categories c ON c.id = s.category_id AND c.organization_id = s.organization_id
		LEFT JOIN service_materials sm ON s.id = sm.service_id
		LEFT JOIN products p ON sm.product_id = p.id
		WHERE s.organization_id = $1 AND s.id = $2
		GROUP BY s.id, c.name
	`
)
