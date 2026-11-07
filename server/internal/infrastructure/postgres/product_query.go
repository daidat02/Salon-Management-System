package postgres

const (
	createProductQuery = `
		INSERT INTO products (id, organization_id, category_id, sku, name, unit,net_unit,net_amount, product_type, show_on_web, cost_price, sell_price, stock_quantity, min_stock, is_active)
		VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,$14, $15)
	`
	listProductsByOrgIDQuery = `
		SELECT p.id, p.organization_id, p.category_id, c.name AS category_name, p.sku, p.name,
		       p.unit, p.net_unit, p.net_amount, p.product_type, p.show_on_web,
		       p.cost_price, p.sell_price, p.stock_quantity, p.min_stock, p.is_active,
		       p.created_at, p.updated_at
		FROM products p
		LEFT JOIN categories c
		       ON c.id = p.category_id AND c.organization_id = p.organization_id
		WHERE p.organization_id = $1
	`
	searchProductsFilter = `
		AND ($2 = '' OR p.name ILIKE $2 OR p.sku ILIKE $2 OR p.product_type ILIKE $2)
	`
	filterProductsStatus = `
		AND ($3 = '' 
		OR ($3 = 'active' AND p.is_active = TRUE)
		OR ($3 = 'low_stock' AND p.stock_quantity <= p.min_stock AND p.is_active = TRUE)
		OR ($3 = 'out_of_stock' AND p.stock_quantity = 0 AND p.is_active = TRUE))
	`
	filterProductCategory = `
		AND ($4 = '' OR p.category_id = NULLIF($4, '')::uuid)
	`

	sortProductsFilter = `
		ORDER BY 
			CASE WHEN $5 = 'created_at_desc' THEN p.created_at END DESC,
			CASE WHEN $5 = 'price_asc' THEN p.sell_price END ASC,
			CASE WHEN $5 = 'price_desc' THEN p.sell_price END DESC,
			CASE WHEN $5 = 'stock_asc' THEN p.stock_quantity END ASC,
			p.created_at DESC
	`
	countProductsByOrgIDQuery = `
		SELECT COUNT(*)
		FROM products p
		WHERE p.organization_id = $1
	`
	// Doanh thu tháng hiện tại của các sản phẩm trong page: chỉ tính dòng
	// product của đơn completed, tháng theo orders.created_at.
	productRevenueThisMonthQuery = `
		SELECT oi.product_id, COALESCE(SUM(oi.line_total), 0) AS revenue
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id AND o.organization_id = oi.organization_id
		WHERE oi.organization_id = $1
		  AND oi.item_type = 'product'
		  AND oi.product_id = ANY($2::uuid[])
		  AND o.status = 'completed'
		  AND date_trunc('month', o.created_at) = date_trunc('month', NOW())
		GROUP BY oi.product_id
	`
	// Thống kê tổng quan kho/sản phẩm: tổng SP, đang bán, sắp hết hàng
	// (cùng điều kiện low_stock với filter list) + doanh thu bán lẻ tháng này
	// (dòng product trong đơn completed).
	getProductStatsQuery = `
		SELECT
			COUNT(p.id) AS total_products,
			COUNT(p.id) FILTER (WHERE p.is_active) AS on_sale_products,
			COUNT(p.id) FILTER (WHERE p.is_active AND p.stock_quantity <= p.min_stock) AS low_stock_products,
			COALESCE((
				SELECT SUM(oi.line_total)
				FROM order_items oi
				JOIN orders o ON o.id = oi.order_id AND o.organization_id = oi.organization_id
				WHERE oi.organization_id = $1
					AND oi.item_type = 'product'
					AND o.status = 'completed'
					AND date_trunc('month', o.created_at) = date_trunc('month', NOW())
			), 0) AS retail_revenue_month
		FROM products p
		WHERE p.organization_id = $1
	`
	updateProductQuery = `
		UPDATE products
		SET category_id = $3, sku = $4, name = $5, unit = $6, product_type = $7, show_on_web = $8,
		    cost_price = $9, sell_price = $10, stock_quantity = $11, min_stock = $12, is_active = $13,
		    net_unit = $14, net_amount = $15
		WHERE id = $1 AND organization_id = $2
	`
	deleteProductQuery = `
		DELETE FROM products
		WHERE id = $1 AND organization_id = $2
	`
	getProductDetailQuery = `
		SELECT p.id, p.organization_id, p.category_id, c.name AS category_name, p.sku, p.name,
		       p.unit, p.net_unit, p.net_amount, p.product_type, p.show_on_web,
		       p.cost_price, p.sell_price, p.stock_quantity, p.min_stock, p.is_active,
		       p.created_at, p.updated_at
		FROM products p
		LEFT JOIN categories c
		       ON c.id = p.category_id AND c.organization_id = p.organization_id
		WHERE p.id = $1 AND p.organization_id = $2
	`
	// Doanh số/doanh thu theo tháng của một sản phẩm trong N tháng gần nhất
	// (chỉ tính dòng product của đơn completed).
	productSalesLastMonthsQuery = `
		SELECT date_trunc('month', o.created_at) AS month_start,
		       COALESCE(SUM(oi.quantity), 0) AS quantity,
		       COALESCE(SUM(oi.line_total), 0) AS revenue
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id AND o.organization_id = oi.organization_id
		WHERE oi.organization_id = $1
		  AND oi.product_id = $2
		  AND oi.item_type = 'product'
		  AND o.status = 'completed'
		  AND o.created_at >= date_trunc('month', NOW()) - (($3::int - 1) * INTERVAL '1 month')
		GROUP BY 1
		ORDER BY 1
	`
	productPricingQuery = `
		SELECT id, sell_price, cost_price
		FROM products
		WHERE organization_id = $1 AND id = ANY($2)
	`
	productUnitsQuery = `
		SELECT id, unit, net_unit, net_amount
		FROM products
		WHERE organization_id = $1 AND id = ANY($2)
	`
	// Trả về id tìm thấy (đúng chủ bảng products; service repo có bản riêng cho service usecase).
	productExistInOrgQuery = `
		SELECT id FROM products WHERE organization_id = $1 AND id = ANY($2::uuid[])
	`
	// Giữ chỗ mềm: tăng reserved khi tồn khả dụng (stock - reserved) còn đủ.
	reserveStockQuery = `
		UPDATE products
		SET reserved_quantity = reserved_quantity + $3
		WHERE id = $1 AND organization_id = $2 AND stock_quantity - reserved_quantity >= $3
	`
	// Nhả giữ chỗ (idempotent, không bao giờ âm).
	releaseReserveQuery = `
		UPDATE products
		SET reserved_quantity = GREATEST(reserved_quantity - $3, 0)
		WHERE id = $1 AND organization_id = $2
	`
	// Hoàn kho luôn thành công (cộng lại, không cần điều kiện).
	restoreStockQuery = `
		UPDATE products
		SET stock_quantity = stock_quantity + $3
		WHERE id = $1 AND organization_id = $2
	`
	// Trừ kho thật lúc chốt đơn: trừ cả tồn và giữ chỗ, chỉ cần tồn đủ (giữ chỗ có thể đã hết hạn).
	completeDeductStockQuery = `
		UPDATE products
		SET stock_quantity = stock_quantity - $3,
		    reserved_quantity = GREATEST(reserved_quantity - $3, 0)
		WHERE id = $1 AND organization_id = $2 AND stock_quantity >= $3
	`
)
