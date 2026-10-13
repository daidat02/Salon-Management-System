package postgres

// Thứ tự const theo vòng đời đơn hàng:
//  1. Tạo đơn (orders + items + materials snapshot + giữ chỗ kho)
//  2. Đọc đơn (header + items kèm NV + materials + payments)
//  3. Gán lại sub-resource (NV thực hiện, vật tư tiêu hao)
//  4. Kho + chuyển trạng thái (giữ/nhả/trừ/hoàn, serve, phiếu, sổ)
//  5. Thanh toán
//  6. Catalog/POS (giá, định mức, danh mục bán hàng)
const (
	// ---------- 1. Tạo đơn ----------
	createOrderQuery = `
		INSERT INTO orders (id, organization_id, code, customer_id, appointment_id, subtotal_amount, discount_amount, total_amount, status, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	bulkInsertOrderItemsQuery = `
		INSERT INTO order_items (id, organization_id, order_id, item_type, service_id, product_id, staff_id, quantity, unit_price, unit,line_total)
		VALUES
	`
	bulkInsertOrderItemMaterialsQuery = `
		INSERT INTO order_item_materials (id, order_item_id, product_id, quantity, unit_cost_at_time, unit)
		VALUES
	`

	// ---------- 2. Đọc đơn ----------
	orderColumns      = `id, organization_id, code, customer_id, appointment_id, subtotal_amount, discount_amount, total_amount, status, created_by, created_at, updated_at`
	getOrderByIDQuery = `
		SELECT ` + orderColumns + `
		FROM orders
		WHERE organization_id = $1 AND id = $2
	`
	// Lịch sử đơn hàng của 1 khách (mới nhất trước, phân trang limit/offset).
	listHistoriesOrderByCustomerIdQuery = `
		SELECT ` + orderColumns + `
		FROM orders
		WHERE organization_id = $1 AND customer_id = $2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`
	countHistoriesOrderByCustomerIdQuery = `
		SELECT COUNT(*)
		FROM orders
		WHERE organization_id = $1 AND customer_id = $2
	`
	// Lấy dòng đơn kèm NV thực hiện (join order_item_staff + staff, gom bằng json_agg
	// để 1 item = 1 row; item chưa gán NV thì staff = []).
	listOrderItemsQuery = `
		SELECT i.id, i.organization_id, i.order_id, i.item_type, i.service_id, i.product_id,
		       i.staff_id, i.quantity, i.unit_price, i.line_total,
		       COALESCE(json_agg(
		           json_build_object(
		               'id', s.id,
		               'staff_id', s.staff_id,
		               'full_name', st.full_name,
		               'type', s.type,
		               'share_pct', s.share_pct,
		               'commission_amount', s.commission_amount
		           ) ORDER BY s.created_at
		       ) FILTER (WHERE s.id IS NOT NULL), '[]')::text AS staff
		FROM order_items i
		LEFT JOIN order_item_staff s ON s.order_item_id = i.id
		LEFT JOIN staff st ON st.id = s.staff_id
		WHERE i.organization_id = $1 AND i.order_id = $2
		GROUP BY i.id
		ORDER BY i.id
	`
	listOrderMaterialsQuery = `
		SELECT m.id, m.order_item_id, m.product_id, m.quantity, m.unit_cost_at_time, COALESCE(m.unit, '') AS unit
		FROM order_item_materials m
		JOIN order_items i ON i.id = m.order_item_id
		WHERE i.organization_id = $1 AND i.order_id = $2
	`
	listOrderPaymentsQuery = `
		SELECT id, organization_id, order_id, method, provider, provider_txn_id, amount, status, paid_at, created_at
		FROM payments
		WHERE organization_id = $1 AND order_id = $2
		ORDER BY created_at ASC
	`

	// ---------- 3. Gán lại sub-resource (NV, vật tư) ----------
	orderItemExistsInOrgQuery = `
		SELECT EXISTS(SELECT 1 FROM order_items WHERE organization_id = $1 AND id = $2)
	`
	// Tra đơn chứa từng dòng đơn (vừa suy scope vừa chặn dòng lạ/khác salon).
	mapItemOrdersQuery = `
		SELECT id, order_id
		FROM order_items
		WHERE organization_id = $1 AND id = ANY($2)
	`
	bulkInsertStaffOrderItemsQuery = `
		INSERT INTO order_item_staff (id, organization_id, order_item_id, staff_id, type, share_pct, commission_amount)
		VALUES
	`
	deleteStaffOrderItemsQuery = `
		DELETE FROM order_item_staff WHERE order_item_id = $1
	`
	deleteOrderMaterialsByOrderQuery = `
		DELETE FROM order_item_materials
		WHERE order_item_id IN (
			SELECT id FROM order_items WHERE organization_id = $1 AND order_id = ANY($2)
		)
	`
	// Tổng vật tư hiện tại theo sản phẩm (đọc trước khi xóa để tính delta giữ chỗ).
	oldMaterialTotalsQuery = `
		SELECT product_id, COALESCE(SUM(quantity), 0)
		FROM order_item_materials
		WHERE order_item_id IN (
			SELECT id FROM order_items WHERE organization_id = $1 AND order_id = ANY($2)
		)
		GROUP BY product_id
	`

	// ---------- 4. Kho + chuyển trạng thái ----------
	// Query giữ/trừ/hoàn kho nằm ở product_query.go (đúng chủ bảng products).
	// Chuyển pending/confirm/delivery -> completed khi thu đủ tiền, guard chống chốt 2 lần.
	flipToCompletedQuery = `
		UPDATE orders
		SET status = 'completed', updated_at = now()
		WHERE organization_id = $1 AND id = $2 AND status IN ('pending', 'confirm', 'delivery')
	`
	updateOrderStatusQuery = `
		UPDATE orders
		SET status = $3
		WHERE organization_id = $1 AND id = $2
	`
	// Gán/đổi khách hàng của đơn (customer_id nullable).
	updateOrderCustomerQuery = `
		UPDATE orders
		SET customer_id = $3, updated_at = now()
		WHERE organization_id = $1 AND id = $2
	`
	// Khóa dòng đơn để serialize các payment/serve đồng thời.
	lockOrderRowQuery = `
		SELECT status
		FROM orders
		WHERE organization_id = $1 AND id = $2
		FOR UPDATE
	`
	insertInventoryLedgerQuery = `
		INSERT INTO inventory_transactions (id, organization_id, product_id, type, quantity, reference_type, reference_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	// Vô hiệu phiếu bán hàng của đơn (no-op nếu chưa từng có phiếu).
	voidSaleSlipQuery = `
		UPDATE inventory_documents
		SET status = 'cancelled'
		WHERE organization_id = $1 AND order_id = $2 AND status = 'completed'
	`

	// ---------- 5. Thanh toán ----------
	findPaymentByProviderTxnQuery = `
		SELECT id, organization_id, order_id, method, provider, provider_txn_id, amount, status, paid_at, created_at
		FROM payments
		WHERE provider = $1 AND provider_txn_id = $2
	`
	createPaymentQuery = `
		INSERT INTO payments (id, organization_id, order_id, method, provider, provider_txn_id, amount, status, paid_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	totalPaidByOrderQuery = `
		SELECT COALESCE(SUM(amount), 0)
		FROM payments
		WHERE organization_id = $1 AND order_id = $2 AND status = 'succeeded'
	`

	// ---------- 6. POS (danh mục bán hàng; giá/định mức nằm ở product/service repo) ----------
	listItemPosQuery = `
        SELECT * FROM (
            SELECT id, organization_id, category_id, 'product' AS type, name, NULL AS description, NULL AS duration_minutes, unit, sell_price AS price, stock_quantity, is_active
            FROM products p
            WHERE p.organization_id = $1 AND p.is_active = true 
            AND (product_type = $2 OR product_type = $3)
            UNION ALL
            SELECT id, organization_id, category_id, 'service' AS type, name, description, duration_minutes, NULL AS unit, price, NULL AS stock_quantity, is_active
            FROM services s
            WHERE s.organization_id = $1 AND s.is_active = true
        ) AS pos_items
        WHERE 1 = 1
    `

	searchItemPosQuery = `
        AND ($4 = '' OR unaccent(name) ILIKE unaccent($4))
    `

	filterItemPosQuery = `
        AND ($5 = '' OR category_id::text = $5) 
    `

	// Sắp xếp lại thứ tự con trỏ khớp với ORDER BY: (type, name, id)
	// NULLIF + cast ::uuid để so sánh đúng kiểu UUID khi phân trang;
	// nhánh $6 = '' short-circuit nên không bao giờ cast chuỗi rỗng.
	paginateItemPosQuery = `
        AND ($6 = '' OR (type, name, id) > ($6, $7, NULLIF($8, '')::uuid))
        ORDER BY type ASC, name ASC, id ASC
        LIMIT $9
    `
)
