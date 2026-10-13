package postgres

const (
	createServiceQuery = `
		INSERT INTO services (id, organization_id, category_id, name, description, duration_minutes, buffer_minutes, price, is_active)
		VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	listServicesByOrgIDQuery = `
		SELECT id, organization_id, category_id, name, description, duration_minutes,
		       buffer_minutes, price, is_active, created_at, updated_at
		FROM services
		WHERE organization_id = $1
	`
	searchServicesFilter = `
		AND ($2 = '' OR name ILIKE $2 OR description ILIKE $2)
	`
	filterServicesStatus = `
		AND ($3 = '' 
		OR ($3 = 'active' AND is_active = TRUE)
		OR ($3 = 'inactive' AND is_active = FALSE))
	`
	sortServicesFilter = `
		ORDER BY 
			CASE WHEN $4 = 'price_asc' THEN price END ASC,
			CASE WHEN $4 = 'price_desc' THEN price END DESC,
			CASE WHEN $4 = 'duration_asc' THEN duration_minutes END ASC,
			CASE WHEN $4 = 'name_asc' THEN name END ASC,
			created_at DESC
	`
	countServicesByOrgIDQuery = `
		SELECT COUNT(*)
		FROM services
		WHERE organization_id = $1
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
	servicePriceQuery = `
		SELECT price
		FROM services
		WHERE organization_id = $1 AND id = $2
	`
	getServiceDetailsQuery = `
		SELECT 
			s.id, s.organization_id, s.category_id, s.name, s.description, s.duration_minutes,
			s.buffer_minutes, s.price, s.is_active, s.created_at, s.updated_at,
			COALESCE(
				json_agg(
					json_build_object(
						'id', sm.id,
						'organization_id', sm.organization_id,
						'service_id', sm.service_id,
						'product_id', sm.product_id,
						'product_name', p.name,
						'cost_price', p.cost_price,
						'product_unit', p.unit,
						'quantity', sm.quantity,
						'unit', sm.unit,
						'created_at', sm.created_at,
						'updated_at', sm.updated_at
					)
				) FILTER (WHERE sm.product_id IS NOT NULL), '[]'
			) AS materials
		FROM services s
		LEFT JOIN service_materials sm ON s.id = sm.service_id
		LEFT JOIN products p ON sm.product_id = p.id
		WHERE s.organization_id = $1 AND s.id = $2
		GROUP BY s.id
	`
	
)
