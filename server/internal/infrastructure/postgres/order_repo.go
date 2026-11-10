package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	invdomain "github.com/daidat02/server/internal/domain/inventory"
	domain "github.com/daidat02/server/internal/domain/order"
	"github.com/daidat02/server/pkg/utils"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"

	"github.com/jmoiron/sqlx"
)

type PostgresOrderRepository struct {
	db *pgxpool.Pool
	qx *sqlx.DB
}

func NewPostgresOrderRepository(db *pgxpool.Pool) *PostgresOrderRepository {
	return &PostgresOrderRepository{
		db: db,
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

// ---------- Helper dùng chung (pure, không chạm DB) ----------

// nullableStr chuyển "" thành nil để qua được cột nullable (customer/appointment/staff).
func nullableStr(s *string) any {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil
	}
	return strings.TrimSpace(*s)
}

// nullableUnit chuẩn hoá unit vật tư: rỗng -> NULL.
func nullableUnit(s string) any {
	if v := strings.TrimSpace(s); v != "" {
		return v
	}
	return nil
}

// isUniqueViolation nhận diện lỗi unique PostgreSQL (mã 23505).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// orderItemRow hứng 1 dòng order_items kèm JSON nhân viên (cột staff);
// map sang domain.OrderItem sau khi unmarshal (sqlx không scan JSON vào slice).
type orderItemRow struct {
	ID             string  `db:"id"`
	OrganizationID string  `db:"organization_id"`
	OrderID        string  `db:"order_id"`
	ItemType       string  `db:"item_type"`
	ServiceID      *string `db:"service_id"`
	ProductID      *string `db:"product_id"`
	StaffID        *string `db:"staff_id"`
	Quantity       float64 `db:"quantity"`
	Unit           *string `db:"unit"`
	UnitPrice      float64 `db:"unit_price"`
	LineTotal      float64 `db:"line_total"`
	StaffJSON      string  `db:"staff"`
}

// orderListFilter dựng mệnh đề lọc status cho list/count (trả về SQL + args,
// startIdx là vị trí placeholder tiếp theo).
func orderListFilter(status string, startIdx int) (string, []any) {
	if strings.TrimSpace(status) == "" {
		return "", nil
	}
	return fmt.Sprintf(" AND status = $%d", startIdx), []any{strings.TrimSpace(status)}
}

// slipCodeForOrder sinh mã phiếu bán hàng từ mã đơn (XK-<suffix>), retry khi trùng.
func slipCodeForOrder(orderCode string, attempt int) string {
	suffix := strings.TrimPrefix(orderCode, "ORD-")
	if attempt == 0 {
		return "XK-" + suffix
	}
	return fmt.Sprintf("XK-%s-%d", suffix, attempt+1)
}

// ---------- 1. Tạo đơn (1 tx: đơn + items + materials snapshot + giữ chỗ kho) ----------

// CreateOrder ghi đơn + dòng đơn + snapshot vật tư + giữ chỗ kho trong 1 transaction.
// Chỉ giữ chỗ (reserved), KHÔNG trừ tồn thật và KHÔNG ghi sổ — tồn trừ lúc phục vụ.
func (r *PostgresOrderRepository) CreateOrder(ctx context.Context, order *domain.Order, items []*domain.OrderItem, materials []*domain.OrderItemMaterial, deductions []domain.StockDeduction) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, createOrderQuery,
		order.ID, order.OrganizationID, order.Code,
		nullableStr(order.CustomerID), nullableStr(order.AppointmentID),
		order.SubtotalAmount, order.DiscountAmount, order.TotalAmount, order.Status, nullableStr(order.CreatedBy),
	); err != nil {
		return fmt.Errorf("lỗi khi tạo đơn hàng: %w", err)
	}

	if err := bulkInsertOrderItems(ctx, tx, items); err != nil {
		return fmt.Errorf("lỗi khi thêm dòng đơn hàng: %w", err)
	}
	if err := bulkInsertOrderItemMaterials(ctx, tx, materials); err != nil {
		return fmt.Errorf("lỗi khi lưu vật tư tiêu hao: %w", err)
	}

	if err := adjustReservations(ctx, tx, order.OrganizationID, deductionQtyByProduct(deductions)); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit transaction: %w", err)
	}
	return nil
}

// AddOrderItems thêm dòng đơn + vật tư snapshot + giữ chỗ kho + chốt tổng mới
// trong 1 tx: khóa đơn + check lại trạng thái (chỉ pending/confirm, chống race
// chốt đơn xen giữa lúc usecase kiểm tra và lúc commit).
func (r *PostgresOrderRepository) AddOrderItems(ctx context.Context, orgID, orderID string, items []*domain.OrderItem, materials []*domain.OrderItemMaterial, deductions []domain.StockDeduction, newSubtotal, newTotal float64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var status string
	if err := tx.QueryRow(ctx, lockOrderRowQuery, orgID, orderID).Scan(&status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotFound)
		}
		return fmt.Errorf("lỗi khi khóa đơn hàng: %w", err)
	}
	switch status {
	case domain.StatusPending, domain.StatusConfirm:
	default:
		return fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotEditable)
	}

	if err := bulkInsertOrderItems(ctx, tx, items); err != nil {
		return fmt.Errorf("lỗi khi thêm dòng đơn hàng: %w", err)
	}

	if err := bulkInsertOrderItemMaterials(ctx, tx, materials); err != nil {
		return fmt.Errorf("lỗi khi lưu vật tư tiêu hao: %w", err)
	}

	if err := adjustReservations(ctx, tx, orgID, deductionQtyByProduct(deductions)); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, updateOrderTotalsQuery, orgID, orderID, newSubtotal, newTotal); err != nil {
		return fmt.Errorf("lỗi khi chốt tổng mới của đơn: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit thêm dòng đơn: %w", err)
	}
	return nil
}

// bulkInsertOrderItems chèn nhiều dòng đơn trong tx có sẵn (nhận tx, không tự mở).
func bulkInsertOrderItems(ctx context.Context, tx pgx.Tx, items []*domain.OrderItem) error {
	if len(items) == 0 {
		return nil
	}
	var args []any
	var placeholders []string
	for _, it := range items {
		placeholders = append(placeholders, fmt.Sprintf(
			"($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			len(args)+1, len(args)+2, len(args)+3, len(args)+4, len(args)+5,
			len(args)+6, len(args)+7, len(args)+8, len(args)+9, len(args)+10, len(args)+11,
		))
		args = append(args,
			it.ID, it.OrganizationID, it.OrderID, it.ItemType,
			nullableStr(it.ServiceID), nullableStr(it.ProductID), nullableStr(it.StaffID),
			it.Quantity, it.UnitPrice, it.Unit, it.LineTotal,
		)
	}
	_, err := tx.Exec(ctx, bulkInsertOrderItemsQuery+strings.Join(placeholders, ", "), args...)
	return err
}

// bulkInsertOrderItemMaterials chèn nhiều vật tư trong tx có sẵn (nhận tx, không tự mở).
func bulkInsertOrderItemMaterials(ctx context.Context, tx pgx.Tx, materials []*domain.OrderItemMaterial) error {
	if len(materials) == 0 {
		return nil
	}
	var args []any
	var placeholders []string
	for _, m := range materials {
		placeholders = append(placeholders, fmt.Sprintf(
			"($%d, $%d, $%d, $%d, $%d, $%d)",
			len(args)+1, len(args)+2, len(args)+3, len(args)+4, len(args)+5, len(args)+6,
		))
		args = append(args, m.ID, m.OrderItemID, m.ProductID, m.Quantity, m.UnitCostAtTime, nullableUnit(m.Unit))
	}
	_, err := tx.Exec(ctx, bulkInsertOrderItemMaterialsQuery+strings.Join(placeholders, ", "), args...)
	return err
}

// ---------- 2. Đọc đơn ----------

// GetOrdersByOrgID lấy danh sách đơn phân trang (lọc status tùy chọn, mới nhất trước).
func (r *PostgresOrderRepository) GetOrdersByOrgID(ctx context.Context, orgID, status string, limit, offset int) ([]*domain.Order, error) {
	filter, args := orderListFilter(status, 2)
	query := fmt.Sprintf(`
		SELECT `+orderColumns+`
		FROM orders
		WHERE organization_id = $1%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, filter, len(args)+2, len(args)+3)
	args = append([]any{orgID}, append(args, limit, offset)...)

	orders := make([]*domain.Order, 0)
	if err := r.qx.SelectContext(ctx, &orders, query, args...); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách đơn hàng: %w", err)
	}
	return orders, nil
}

// CountOrdersByOrgID đếm đơn theo salon (cùng điều kiện lọc với GetOrdersByOrgID).
func (r *PostgresOrderRepository) CountOrdersByOrgID(ctx context.Context, orgID, status string) (int64, error) {
	filter, args := orderListFilter(status, 2)
	query := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM orders
		WHERE organization_id = $1%s
	`, filter)
	args = append([]any{orgID}, args...)

	var total int64
	if err := r.qx.GetContext(ctx, &total, query, args...); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm danh sách đơn hàng: %w", err)
	}
	return total, nil
}

// GetOrderStats gom 4 số thẻ thống kê đơn của salon trong 1 query.
func (r *PostgresOrderRepository) GetOrderStats(ctx context.Context, orgID string) (*domain.OrderStatsResponse, error) {
	var stats domain.OrderStatsResponse
	if err := r.qx.GetContext(ctx, &stats, getOrderStatsQuery, orgID); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy thống kê đơn hàng: %w", err)
	}
	return &stats, nil
}

// GetStaffCommissionStats thống kê hoa hồng dịch vụ của 1 NV trong khoảng ngày
// (dateFrom/dateTo rỗng = tháng hiện tại).
func (r *PostgresOrderRepository) GetStaffCommissionStats(ctx context.Context, orgID, staffID, dateFrom, dateTo string) (*domain.StaffCommissionStats, error) {
	var stats domain.StaffCommissionStats
	query := getStaffCommissionStatsQuery + filtterByDateRange + staffServiceHistorySearchFilter
	if err := r.qx.GetContext(ctx, &stats, query, orgID, staffID, dateFrom, dateTo, ""); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy thống kê hoa hồng nhân viên: %w", err)
	}
	return &stats, nil
}

// ListHistoriesOrderByCustomerId lịch sử đơn hàng của 1 khách (mới nhất trước).
func (r *PostgresOrderRepository) ListHistoriesOrderByCustomerId(ctx context.Context, orgID, customerID string, limit, offset int) ([]*domain.Order, error) {
	orders := make([]*domain.Order, 0)
	if err := r.qx.SelectContext(ctx, &orders, listHistoriesOrderByCustomerIdQuery, orgID, customerID, limit, offset); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn lịch sử đơn hàng: %w", err)
	}
	return orders, nil
}

// CountHistoriesOrderByCustomerId đếm lịch sử đơn hàng của 1 khách.
func (r *PostgresOrderRepository) CountHistoriesOrderByCustomerId(ctx context.Context, orgID, customerID string) (int64, error) {
	var total int64
	if err := r.qx.GetContext(ctx, &total, countHistoriesOrderByCustomerIdQuery, orgID, customerID); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm lịch sử đơn hàng: %w", err)
	}
	return total, nil
}

// GetOrderByID lấy 1 đơn theo salon; sai id/khác salon trả ErrOrderNotFound.
func (r *PostgresOrderRepository) GetOrderByID(ctx context.Context, orgID, id string) (*domain.Order, error) {
	var o domain.Order
	if err := r.qx.GetContext(ctx, &o, getOrderByIDQuery, orgID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("đơn hàng %s: %w", id, domain.ErrOrderNotFound)
		}
		return nil, fmt.Errorf("lỗi khi lấy đơn hàng: %w", err)
	}
	return &o, nil
}

// FindActiveOrderByAppointment tìm đơn còn hiệu lực của 1 lịch hẹn.
// Không có thì trả (nil, nil) để usecase phân biệt "không có" với lỗi DB.
func (r *PostgresOrderRepository) FindActiveOrderByAppointment(ctx context.Context, orgID, appointmentID string) (*domain.Order, error) {
	var o domain.Order
	if err := r.qx.GetContext(ctx, &o, findActiveOrderByAppointmentQuery, orgID, appointmentID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("lỗi khi tìm đơn theo lịch hẹn: %w", err)
	}
	return &o, nil
}

// GetOrderItems lấy dòng đơn kèm NV thực hiện (join gom sẵn qua listOrderItemsQuery,
// cột staff là JSON text, item chưa gán NV thì Staff = []).
func (r *PostgresOrderRepository) GetOrderItems(ctx context.Context, orgID, orderID string) ([]*domain.OrderItem, error) {
	var rows []orderItemRow
	if err := r.qx.SelectContext(ctx, &rows, listOrderItemsQuery, orgID, orderID); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn dòng đơn hàng: %w", err)
	}

	items := make([]*domain.OrderItem, 0, len(rows))
	for _, row := range rows {
		staff := []*domain.OrderItemStaffInfo{}
		if row.StaffJSON != "" {
			if err := json.Unmarshal([]byte(row.StaffJSON), &staff); err != nil {
				return nil, fmt.Errorf("lỗi khi đọc nhân viên dòng đơn: %w", err)
			}
		}
		items = append(items, &domain.OrderItem{
			ID: row.ID, OrganizationID: row.OrganizationID, OrderID: row.OrderID,
			ItemType: row.ItemType, ServiceID: row.ServiceID, ProductID: row.ProductID,
			StaffID: row.StaffID, Quantity: row.Quantity, Unit: row.Unit, UnitPrice: row.UnitPrice,
			LineTotal: row.LineTotal, Staff: staff,
		})
	}
	return items, nil
}

// GetOrderMaterials lấy vật tư tiêu hao của đơn.
// NOTE: không scope organization_id ở đây — caller phải check đơn cha thuộc
// đúng salon trước (usecase làm việc này qua GetOrderByID).
func (r *PostgresOrderRepository) GetOrderMaterials(ctx context.Context, orderID string) ([]*domain.OrderItemMaterial, error) {
	// Lọc salon ở tầng usecase qua đơn cha, ở đây chỉ cần đúng đơn.
	materials := make([]*domain.OrderItemMaterial, 0)
	if err := r.qx.SelectContext(ctx, &materials, `
		SELECT m.id, m.order_item_id, m.product_id, m.quantity, m.unit_cost_at_time, COALESCE(m.unit, '') AS unit
		FROM order_item_materials m
		JOIN order_items i ON i.id = m.order_item_id
		WHERE i.order_id = $1
	`, orderID); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn vật tư đơn hàng: %w", err)
	}
	return materials, nil
}

// GetOrderPayments lấy thanh toán của đơn, cũ nhất trước.
func (r *PostgresOrderRepository) GetOrderPayments(ctx context.Context, orgID, orderID string) ([]*domain.Payment, error) {
	payments := make([]*domain.Payment, 0)
	if err := r.qx.SelectContext(ctx, &payments, listOrderPaymentsQuery, orgID, orderID); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn thanh toán: %w", err)
	}
	return payments, nil
}

// ---------- 3. Gán lại sub-resource (NV thực hiện, vật tư tiêu hao) ----------

// OrderItemExistsInOrg kiểm tra dòng đơn thuộc đúng salon (chống lẫn tenant).
func (r *PostgresOrderRepository) OrderItemExistsInOrg(ctx context.Context, orgID, orderItemID string) (bool, error) {
	var exists bool
	if err := r.qx.GetContext(ctx, &exists, orderItemExistsInOrgQuery, orgID, orderItemID); err != nil {
		return false, fmt.Errorf("lỗi khi kiểm tra dòng đơn hàng: %w", err)
	}
	return exists, nil
}

// MapItemOrders tra đơn chứa từng dòng đơn (1 query cho nhiều item).
// Trả map itemID -> orderID; item lạ/khác salon vắng mặt (caller tự 404).
func (r *PostgresOrderRepository) MapItemOrders(ctx context.Context, orgID string, itemIDs []string) (map[string]string, error) {
	var pairs []struct {
		ItemID  string `db:"id"`
		OrderID string `db:"order_id"`
	}
	if err := r.qx.SelectContext(ctx, &pairs, mapItemOrdersQuery, orgID, itemIDs); err != nil {
		return nil, fmt.Errorf("lỗi khi tra đơn của dòng hàng: %w", err)
	}
	mapping := make(map[string]string, len(pairs))
	for _, p := range pairs {
		mapping[p.ItemID] = p.OrderID
	}
	return mapping, nil
}

// ReplaceStaffOrderItems thay toàn bộ NV của 1 dòng đơn trong 1 tx
// (xóa cũ + chèn mới) để gọi lại nhiều lần không trùng UNIQUE.
// Danh sách rỗng = gỡ hết NV của dòng (kèm null staff_id legacy).
func (r *PostgresOrderRepository) ReplaceStaffOrderItems(ctx context.Context, orgID, orderItemID string, staffItems []*domain.StaffOrderItem) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, deleteStaffOrderItemsQuery, orderItemID); err != nil {
		return fmt.Errorf("lỗi khi xóa nhân viên cũ của dòng đơn: %w", err)
	}
	if len(staffItems) == 0 {
		if _, err := tx.Exec(ctx, clearOrderItemStaffQuery, orgID, orderItemID); err != nil {
			return fmt.Errorf("lỗi khi gỡ nhân viên của dòng đơn: %w", err)
		}
	}
	if len(staffItems) > 0 {
		var args []any
		var placeholders []string
		for _, si := range staffItems {
			placeholders = append(placeholders, fmt.Sprintf(
				"($%d, $%d, $%d, $%d, $%d, $%d, $%d)",
				len(args)+1, len(args)+2, len(args)+3, len(args)+4, len(args)+5, len(args)+6, len(args)+7,
			))
			args = append(args, si.ID, si.OrganizationID, orderItemID, si.StaffID, si.Type, si.SharePct, si.CommissionAmount)
		}
		if _, err := tx.Exec(ctx, bulkInsertStaffOrderItemsQuery+strings.Join(placeholders, ", "), args...); err != nil {
			return fmt.Errorf("lỗi khi thêm nhân viên cho dòng đơn: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit gán nhân viên: %w", err)
	}
	return nil
}

// ReplaceOrderMaterials thay toàn bộ vật tư của các đơn trong 1 tx
// (xóa theo scope org + orderIDs rồi chèn mới).
// NOTE: chỉ ghi log tiêu hao, KHÔNG động kho (kho trừ/nhả ở Create/Serve/Cancel).
func (r *PostgresOrderRepository) ReplaceOrderMaterials(ctx context.Context, orgID string, orderIDs []string, materials []*domain.OrderItemMaterial) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Khóa các đơn theo thứ tự cố định (chống deadlock) rồi check lại trạng thái
	// trong tx: chặn race complete xen giữa lúc usecase kiểm tra và lúc commit.
	ids := append([]string(nil), orderIDs...)
	sort.Strings(ids)
	for _, oid := range ids {
		var status string
		if err := tx.QueryRow(ctx, lockOrderRowQuery, orgID, oid).Scan(&status); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fmt.Errorf("đơn hàng %s: %w", oid, domain.ErrOrderNotFound)
			}
			return fmt.Errorf("lỗi khi khóa đơn hàng: %w", err)
		}
		switch status {
		case domain.StatusPending, domain.StatusConfirm, domain.StatusDelivery:
		default:
			return fmt.Errorf("đơn hàng %s: %w", oid, domain.ErrOrderNotEditable)
		}
	}

	// Đọc snapshot cũ trước khi xóa để tính delta giữ chỗ.
	oldTotals := map[string]float64{}
	rows, err := tx.Query(ctx, oldMaterialTotalsQuery, orgID, ids)
	if err != nil {
		return fmt.Errorf("lỗi khi đọc vật tư cũ: %w", err)
	}
	for rows.Next() {
		var pid string
		var qty float64
		if err := rows.Scan(&pid, &qty); err != nil {
			rows.Close()
			return fmt.Errorf("lỗi khi đọc vật tư cũ: %w", err)
		}
		oldTotals[pid] = qty
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return fmt.Errorf("lỗi trong quá trình đọc vật tư cũ: %w", err)
	}

	if _, err := tx.Exec(ctx, deleteOrderMaterialsByOrderQuery, orgID, ids); err != nil {
		return fmt.Errorf("lỗi khi xóa vật tư cũ của đơn: %w", err)
	}
	if err := bulkInsertOrderItemMaterials(ctx, tx, materials); err != nil {
		return fmt.Errorf("lỗi khi thêm vật tư cho đơn: %w", err)
	}

	// Chỉnh giữ chỗ theo delta (new - old): tăng thì giữ thêm, giảm thì nhả.
	newTotals := deductionQtyByProduct(materialDeductions(materials))
	deltas := make(map[string]float64, len(newTotals)+len(oldTotals))
	for pid, qty := range newTotals {
		deltas[pid] = qty
	}
	for pid, qty := range oldTotals {
		deltas[pid] -= qty
	}
	if err := adjustReservations(ctx, tx, orgID, deltas); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit vật tư: %w", err)
	}
	return nil
}

// materialDeductions gom số lượng vật tư mới theo từng sản phẩm.
func materialDeductions(materials []*domain.OrderItemMaterial) []domain.StockDeduction {
	out := make([]domain.StockDeduction, 0, len(materials))
	for _, m := range materials {
		out = append(out, domain.StockDeduction{ProductID: m.ProductID, Quantity: m.Quantity})
	}
	return out
}

// ApplyItemQtyUpdate đổi SL 1 dòng đơn + vật tư theo + delta giữ chỗ + tổng mới
// trong 1 tx: khóa đơn + check lại trạng thái (chỉ pending/confirm, chống race
// chốt đơn xen giữa lúc usecase kiểm tra và lúc commit).
func (r *PostgresOrderRepository) ApplyItemQtyUpdate(ctx context.Context, orgID, orderID string, item *domain.OrderItem, materialQtys map[string]float64, deltas []domain.StockDeduction, newSubtotal, newTotal float64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var status string
	if err := tx.QueryRow(ctx, lockOrderRowQuery, orgID, orderID).Scan(&status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotFound)
		}
		return fmt.Errorf("lỗi khi khóa đơn hàng: %w", err)
	}
	switch status {
	case domain.StatusPending, domain.StatusConfirm:
	default:
		return fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotEditable)
	}

	var unitVal any
	if item.Unit != nil {
		unitVal = nullableUnit(*item.Unit)
	}
	tag, err := tx.Exec(ctx, updateOrderItemQtyQuery, orgID, item.ID, item.Quantity, unitVal, item.LineTotal)
	if err != nil {
		return fmt.Errorf("lỗi khi đổi số lượng dòng hàng: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("dòng hàng %s: %w", item.ID, domain.ErrOrderNotFound)
	}

	// Thứ tự id cố định để các tx đồng thời không deadlock nhau.
	matIDs := make([]string, 0, len(materialQtys))
	for id := range materialQtys {
		matIDs = append(matIDs, id)
	}
	sort.Strings(matIDs)
	for _, id := range matIDs {
		if _, err := tx.Exec(ctx, updateOrderMaterialQtyQuery, id, item.ID, materialQtys[id]); err != nil {
			return fmt.Errorf("lỗi khi đổi số lượng vật tư: %w", err)
		}
	}

	if err := adjustReservations(ctx, tx, orgID, deductionQtyByProduct(deltas)); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, updateOrderTotalsQuery, orgID, orderID, newSubtotal, newTotal); err != nil {
		return fmt.Errorf("lỗi khi chốt tổng mới của đơn: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit đổi số lượng: %w", err)
	}
	return nil
}

// ApplyDeleteItem xóa 1 dòng đơn + vật tư của dòng + nhả giữ chỗ + chốt tổng
// mới trong 1 tx (khóa đơn + check lại pending/confirm). Link NV tự cascade
// theo FK nên không cần xóa tay.
func (r *PostgresOrderRepository) ApplyDeleteItem(ctx context.Context, orgID, orderID, itemID string, releases []domain.StockDeduction, newSubtotal, newTotal float64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var status string
	if err := tx.QueryRow(ctx, lockOrderRowQuery, orgID, orderID).Scan(&status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotFound)
		}
		return fmt.Errorf("lỗi khi khóa đơn hàng: %w", err)
	}
	switch status {
	case domain.StatusPending, domain.StatusConfirm:
	default:
		return fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotEditable)
	}

	// Vật tư FK không cascade nên xóa trước, rồi mới xóa dòng.
	if _, err := tx.Exec(ctx, deleteOrderItemMaterialsQuery, itemID); err != nil {
		return fmt.Errorf("lỗi khi xóa vật tư của dòng hàng: %w", err)
	}
	tag, err := tx.Exec(ctx, deleteOrderItemQuery, orgID, itemID)
	if err != nil {
		return fmt.Errorf("lỗi khi xóa dòng hàng: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("dòng hàng %s: %w", itemID, domain.ErrOrderNotFound)
	}

	if err := adjustReservations(ctx, tx, orgID, deductionQtyByProduct(releases)); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, updateOrderTotalsQuery, orgID, orderID, newSubtotal, newTotal); err != nil {
		return fmt.Errorf("lỗi khi chốt tổng mới của đơn: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit xóa dòng hàng: %w", err)
	}
	return nil
}

// ---------- 4. Hủy/hoàn + phục vụ (trạng thái + kho trong 1 tx) ----------

// ApplyCancel chuyển trạng thái đơn + hoàn kho (restores) + nhả giữ chỗ (releases)
// + vô hiệu phiếu bán hàng + sổ trả trong 1 transaction.
// - Hủy đơn chưa chốt: restores rỗng, chỉ nhả giữ chỗ.
// - Hoàn đơn đã chốt: restores đầy đủ, phiếu bán hàng sang cancelled.
func (r *PostgresOrderRepository) ApplyCancel(ctx context.Context, orgID, orderID, newStatus string, restores []domain.StockDeduction, releases []domain.StockDeduction) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, updateOrderStatusQuery, orgID, orderID, newStatus)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật trạng thái đơn: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotFound)
	}

	for _, rs := range restores {
		if _, err := tx.Exec(ctx, restoreStockQuery, rs.ProductID, orgID, rs.Quantity); err != nil {
			return fmt.Errorf("lỗi khi hoàn kho: %w", err)
		}
		if _, err := tx.Exec(ctx, insertInventoryLedgerQuery,
			utils.NewID(), orgID, rs.ProductID, "return", rs.Quantity, "order", orderID, nil,
		); err != nil {
			return fmt.Errorf("lỗi khi ghi sổ trả hàng: %w", err)
		}
	}

	for _, rel := range releases {
		if _, err := tx.Exec(ctx, releaseReserveQuery, rel.ProductID, orgID, rel.Quantity); err != nil {
			return fmt.Errorf("lỗi khi nhả giữ chỗ kho: %w", err)
		}
	}

	if _, err := tx.Exec(ctx, voidSaleSlipQuery, orgID, orderID); err != nil {
		return fmt.Errorf("lỗi khi vô hiệu phiếu bán hàng: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit transaction: %w", err)
	}
	return nil
}

// CompleteOrderWithSlip chốt đơn (pending/confirm/delivery -> completed):
// trừ kho thật + nhả giữ chỗ + ghi sổ sale + sinh phiếu bán hàng, tất cả 1 tx.
// appointmentID khác nil/rỗng thì lịch hẹn của đơn cũng chuyển completed
// trong cùng tx. Trả về mã phiếu vừa sinh.
// Guard: khóa row đơn + chỉ chốt đơn chưa hoàn tất (chống chốt 2 lần);
// tồn không đủ ở bất kỳ SP nào thì rollback toàn bộ (ErrInsufficientStock).
func (r *PostgresOrderRepository) CompleteOrderWithSlip(ctx context.Context, orgID, orderID string, appointmentID *string, lines []domain.SaleSlipLine, fundID string, confirmation *domain.PaymentCompletion) (domain.SaleSlipResult, error) {
	var empty domain.SaleSlipResult
	if confirmation == nil {
		return empty, fmt.Errorf("thiếu thông tin xác nhận thanh toán")
	}

	// 1. Nếu có sản phẩm (bán lẻ/nguyên liệu), tính toán và validate danh sách
	var items []*invdomain.DocumentItemInput
	var total float64
	qtyByProduct := map[string]float64{}
	var pids []string

	if len(lines) > 0 {
		items = make([]*invdomain.DocumentItemInput, 0, len(lines))
		for _, l := range lines {
			if l.Quantity <= 0 {
				return empty, fmt.Errorf("số lượng sản phẩm %s phải lớn hơn 0", l.ProductID)
			}
			if l.UnitPrice < 0 {
				return empty, fmt.Errorf("đơn giá sản phẩm %s không được âm", l.ProductID)
			}
			total += l.Quantity * l.UnitPrice
			items = append(items, &invdomain.DocumentItemInput{
				ProductID: l.ProductID,
				Quantity:  l.Quantity,
				UnitPrice: l.UnitPrice,
			})
			qtyByProduct[l.ProductID] += l.Quantity
		}

		pids = make([]string, 0, len(qtyByProduct))
		for pid := range qtyByProduct {
			pids = append(pids, pid)
		}
		sort.Strings(pids)
	}

	// 2. Bắt đầu DB Transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return empty, fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Khóa dòng đơn để serialize các lệnh serve đồng thời.
	var status string
	if err := tx.QueryRow(ctx, lockOrderRowQuery, orgID, orderID).Scan(&status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return empty, fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotFound)
		}
		return empty, fmt.Errorf("lỗi khi khóa đơn hàng: %w", err)
	}
	if status != domain.StatusPending && status != domain.StatusConfirm && status != domain.StatusDelivery {
		return empty, fmt.Errorf("đơn hàng %s chưa sẵn sàng chốt: %w", orderID, domain.ErrOrderNotReady)
	}

	// Cập nhật payment + giảm giá/total đơn trong cùng tx với việc chốt đơn.
	// Khóa dòng payment để 2 request confirm đồng thời không ghi đè nhau.
	var orderSubtotal, orderDiscount, orderTotal float64
	if err := tx.QueryRow(ctx, orderAmountsQuery, orgID, orderID).
		Scan(&orderSubtotal, &orderDiscount, &orderTotal); err != nil {
		return empty, fmt.Errorf("lỗi khi đọc tổng tiền đơn hàng: %w", err)
	}

	var paymentStatus string
	if err := tx.QueryRow(ctx, lockPaymentRowQuery, orgID, orderID, confirmation.PaymentID).
		Scan(&paymentStatus); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return empty, fmt.Errorf("payment %s: %w", confirmation.PaymentID, domain.ErrPaymentNotFound)
		}
		return empty, fmt.Errorf("lỗi khi khóa payment: %w", err)
	}
	if paymentStatus != domain.PaymentStatusPending {
		return empty, fmt.Errorf("payment %s: %w", confirmation.PaymentID, domain.ErrPaymentNotPending)
	}

	var totalPaid float64
	if err := tx.QueryRow(ctx, totalPaidByOrderQuery, orgID, orderID).Scan(&totalPaid); err != nil {
		return empty, fmt.Errorf("lỗi khi tính tổng đã thu: %w", err)
	}
	remaining := orderTotal - totalPaid
	if remaining < 0 {
		remaining = 0
	}
	if confirmation.DiscountAmount < 0 || confirmation.DiscountAmount > remaining {
		return empty, fmt.Errorf("giảm giá %.2f vượt số còn thiếu %.2f: %w",
			confirmation.DiscountAmount, remaining, domain.ErrDiscountExceedsRemaining)
	}
	newDiscount := orderDiscount + confirmation.DiscountAmount
	newTotal := orderSubtotal - newDiscount
	if newTotal < 0 {
		newTotal = 0
	}
	amount := remaining - confirmation.DiscountAmount
	if amount < 0 {
		amount = 0
	}

	if _, err := tx.Exec(ctx, updateOrderDiscountQuery, orgID, orderID, newDiscount, newTotal); err != nil {
		return empty, fmt.Errorf("lỗi khi cập nhật giảm giá đơn hàng: %w", err)
	}
	tag, err := tx.Exec(ctx, confirmPaymentQuery, orgID, orderID, confirmation.PaymentID,
		confirmation.Method, nullableStr(confirmation.Provider), nullableStr(confirmation.ProviderTxnID), amount)
	if err != nil {
		return empty, fmt.Errorf("lỗi khi xác nhận thanh toán: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return empty, fmt.Errorf("payment %s: %w", confirmation.PaymentID, domain.ErrPaymentNotPending)
	}

	// Chuyển đơn hàng sang status 'completed'
	tag, err = tx.Exec(ctx, flipToCompletedQuery, orgID, orderID)
	if err != nil {
		return empty, fmt.Errorf("lỗi khi chốt đơn hàng: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return empty, fmt.Errorf("đơn hàng %s chưa sẵn sàng chốt: %w", orderID, domain.ErrOrderNotReady)
	}

	// Hoàn thành lịch hẹn nếu đơn có gắn lịch
	if appointmentID != nil {
		if id := strings.TrimSpace(*appointmentID); id != "" {
			if _, err := tx.Exec(ctx, completeAppointmentQuery, orgID, id); err != nil {
				return empty, fmt.Errorf("lỗi khi cập nhật lịch hẹn hoàn thành: %w", err)
			}
		}
	}

	var orderCode string
	if err := tx.QueryRow(ctx, `SELECT code, total_amount FROM orders WHERE organization_id = $1 AND id = $2`, orgID, orderID).Scan(&orderCode, &orderTotal); err != nil {
		return empty, fmt.Errorf("lỗi khi đọc đơn hàng: %w", err)
	}

	var docID string
	var docCode string

	// 3. CHỈ XUẤT KHO KHI CÓ SẢN PHẨM (len(lines) > 0)
	if len(lines) > 0 {
		docID = utils.NewID()

		// Trừ kho từng sản phẩm
		for _, pid := range pids {
			qty := qtyByProduct[pid]
			tag, err := tx.Exec(ctx, completeDeductStockQuery, pid, orgID, qty)
			if err != nil {
				return empty, fmt.Errorf("lỗi khi trừ kho sản phẩm %s: %w", pid, err)
			}
			if tag.RowsAffected() == 0 {
				return empty, fmt.Errorf("sản phẩm %s: %w", pid, domain.ErrInsufficientStock)
			}
			if _, err := tx.Exec(ctx, insertInventoryLedgerQuery,
				utils.NewID(), orgID, pid, "sale", -qty, "order", orderID, nil,
			); err != nil {
				return empty, fmt.Errorf("lỗi khi ghi sổ bán hàng: %w", err)
			}
		}

		// Sinh header phiếu xuất kho bán hàng
		for attempts := 0; ; attempts++ {
			docCode = slipCodeForOrder(orderCode, attempts)
			_, err = tx.Exec(ctx, createInventoryDocumentQuery,
				docID,                            // $1  - id
				orgID,                            // $2  - organization_id
				nil,                              // $3  - supplier_id
				orderID,                          // $4  - order_id
				docCode,                          // $5  - document_code
				"sale",                           // $6  - type
				total,                            // $7  - total_amount
				"Xuất kho bán hàng - "+orderCode, // $8  - reason
				nil,                              // $9  - note
				nil,                              // $10 - created_by
				false,                            // $11 - payment_tracked
				nil,                              // $12 - due_date
				total,                            // $13 - gross_amount
				0,                                // $14 - discount_amount
				0,                                // $15 - vat_rate
				0,                                // $16 - vat_amount
				0,                                // $17 - shipping_fee
				0,                                // $18 - paid_amount
				nil,                              // $19 - invoice_code
			)
			if err == nil {
				break
			}
			if !isUniqueViolation(err) || attempts >= 2 {
				return empty, fmt.Errorf("lỗi khi tạo phiếu bán hàng: %w", err)
			}
		}

		// Lưu chi tiết các item xuất kho
		products, err := fetchProductSnapshots(ctx, tx, orgID, pids)
		if err != nil {
			return empty, err
		}
		if err := insertDocumentItemsCopy(ctx, tx, docID, items, products); err != nil {
			return empty, err
		}
	}

	// 4. LUÔN GHI PHIẾU THU TIỀN (Nếu orderTotal > 0)
	// Áp dụng cho cả đơn chỉ có dịch vụ lẫn đơn có bán sản phẩm
	if orderTotal > 0 {
		if err := insertOrderIncomeVoucherTx(ctx, tx, orgID, orderID, orderCode, orderTotal, fundID); err != nil {
			return empty, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return empty, fmt.Errorf("lỗi khi commit transaction: %w", err)
	}

	return domain.SaleSlipResult{DocumentID: docID, DocumentCode: docCode}, nil
}

// ---------- 5. Thanh toán ----------

// InitPayment tạo (hoặc trả lại) payment pending duy nhất của đơn.
// Khóa dòng đơn để serialize 2 request init đồng thời.
func (r *PostgresOrderRepository) InitPayment(ctx context.Context, orgID, orderID string, amount float64) (*domain.Payment, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var status string
	if err := tx.QueryRow(ctx, lockOrderRowQuery, orgID, orderID).Scan(&status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotFound)
		}
		return nil, fmt.Errorf("lỗi khi khóa đơn hàng: %w", err)
	}
	if status != domain.StatusPending && status != domain.StatusConfirm && status != domain.StatusDelivery {
		return nil, fmt.Errorf("đơn hàng %s chưa sẵn sàng thanh toán: %w", orderID, domain.ErrOrderNotReady)
	}

	var payment domain.Payment
	err = tx.QueryRow(ctx, findPendingPaymentByOrderQuery, orgID, orderID).Scan(
		&payment.ID, &payment.OrganizationID, &payment.OrderID, &payment.Method,
		&payment.Provider, &payment.ProviderTxnID, &payment.Amount, &payment.Status,
		&payment.PaidAt, &payment.CreatedAt,
	)
	if err == nil {
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("lỗi khi commit transaction: %w", err)
		}
		return &payment, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("lỗi khi tìm payment đang chờ: %w", err)
	}

	err = tx.QueryRow(ctx, findLatestFailedPaymentByOrderQuery, orgID, orderID).Scan(
		&payment.ID, &payment.OrganizationID, &payment.OrderID, &payment.Method,
		&payment.Provider, &payment.ProviderTxnID, &payment.Amount, &payment.Status,
		&payment.PaidAt, &payment.CreatedAt,
	)
	if err == nil {
		tag, execErr := tx.Exec(ctx, resetPaymentToPendingQuery, orgID, orderID, payment.ID, amount)
		if execErr != nil {
			return nil, fmt.Errorf("lỗi khi khởi tạo lại payment: %w", execErr)
		}
		if tag.RowsAffected() == 0 {
			return nil, fmt.Errorf("payment %s: %w", payment.ID, domain.ErrPaymentNotPending)
		}
		payment.Method = domain.PaymentMethodCash
		payment.Provider = nil
		payment.ProviderTxnID = nil
		payment.Amount = amount
		payment.Status = domain.PaymentStatusPending
		payment.PaidAt = nil
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("lỗi khi commit transaction: %w", err)
		}
		return &payment, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("lỗi khi tìm payment thất bại: %w", err)
	}

	payment = domain.Payment{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		OrderID:        orderID,
		Method:         domain.PaymentMethodCash,
		Amount:         amount,
		Status:         domain.PaymentStatusPending,
	}
	if _, err := tx.Exec(ctx, createPaymentQuery,
		payment.ID, payment.OrganizationID, payment.OrderID, payment.Method,
		nil, nil, payment.Amount, payment.Status, nil,
	); err != nil {
		return nil, fmt.Errorf("lỗi khi tạo payment chờ: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("lỗi khi commit transaction: %w", err)
	}
	return &payment, nil
}

// GetPaymentByID tìm payment thuộc đúng đơn/tổ chức.
func (r *PostgresOrderRepository) GetPaymentByID(ctx context.Context, orgID, orderID, paymentID string) (*domain.Payment, error) {
	var payment domain.Payment
	if err := r.qx.GetContext(ctx, &payment, getPaymentByIDQuery, orgID, orderID, paymentID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("payment %s: %w", paymentID, domain.ErrPaymentNotFound)
		}
		return nil, fmt.Errorf("lỗi khi lấy payment: %w", err)
	}
	return &payment, nil
}

// GetSaleSlipByOrder trả phiếu bán hàng đã sinh cho đơn (rỗng nếu chưa có).
func (r *PostgresOrderRepository) GetSaleSlipByOrder(ctx context.Context, orgID, orderID string) (domain.SaleSlipResult, error) {
	var result domain.SaleSlipResult
	if err := r.qx.GetContext(ctx, &result, getSaleSlipByOrderQuery, orgID, orderID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.SaleSlipResult{}, nil
		}
		return domain.SaleSlipResult{}, fmt.Errorf("lỗi khi lấy phiếu bán hàng: %w", err)
	}
	return result, nil
}

// GetTotalPaidByOrder cộng tổng đã thu succeeded của đơn (quyết định flip paid).
func (r *PostgresOrderRepository) GetTotalPaidByOrder(ctx context.Context, orgID, orderID string) (float64, error) {
	var total float64
	if err := r.qx.GetContext(ctx, &total, totalPaidByOrderQuery, orgID, orderID); err != nil {
		return 0, fmt.Errorf("lỗi khi tính tổng đã thu: %w", err)
	}
	return total, nil
}

// UpdateOrderStatus đổi trạng thái đơn; không chạm dòng nào (sai id/khác salon)
// thì trả ErrOrderNotFound.
func (r *PostgresOrderRepository) UpdateOrderStatus(ctx context.Context, orgID, orderID, status string) error {
	tag, err := r.db.Exec(ctx, updateOrderStatusQuery, orgID, orderID, status)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật trạng thái đơn: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotFound)
	}
	return nil
}

// UpdateOrderCustomer gán/đổi khách hàng của đơn; không chạm dòng nào
// (sai id/khác salon) thì trả ErrOrderNotFound.
func (r *PostgresOrderRepository) UpdateOrderCustomer(ctx context.Context, orgID, orderID string, customerID *string) error {
	tag, err := r.db.Exec(ctx, updateOrderCustomerQuery, orgID, orderID, nullableStr(customerID))
	if err != nil {
		return fmt.Errorf("lỗi khi gán khách hàng cho đơn: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("đơn hàng %s: %w", orderID, domain.ErrOrderNotFound)
	}
	return nil
}

// ---------- 6. Danh mục bán hàng POS (giá/định mức nằm ở product/service repo) ----------

// GetPosItemsByOrgID lấy danh mục bán hàng POS (union sản phẩm retail/both +
// dịch vụ active), phân trang cursor (type, name, id), tìm theo tên/SKU, lọc danh mục.
// Limit do usecase clamp 1..100, query ghép từ listItemPos + search + filter + paginate.
func (r *PostgresOrderRepository) GetPosItemsByOrgID(ctx context.Context, orgID string, limit int, name, itemType string, id string, search string, categoryFilter string) ([]*domain.PosItemResponse, error) {
	formattedSearch := ""
	if strings.TrimSpace(search) != "" {
		formattedSearch = "%" + strings.TrimSpace(search) + "%"
	}
	query := listItemPosQuery + searchItemPosQuery + filterItemPosQuery + paginateItemPosQuery

	args := []any{
		orgID,           // $1
		"retail",        // $2
		"both",          // $3
		formattedSearch, // $4
		categoryFilter,  // $5
		itemType,        // $6 (cursor type)
		name,            // $7 (cursor name)
		id,              // $8 (cursor id)
		limit,           // $9
	}

	var items []*domain.PosItemResponse

	if err := r.qx.SelectContext(ctx, &items, query, args...); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách sản phẩm POS: %w", err)
	}

	return items, nil
}
