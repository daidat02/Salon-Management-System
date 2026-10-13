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
	StaffID        *string  `db:"staff_id"`
	Quantity       float64  `db:"quantity"`
	UnitPrice      float64  `db:"unit_price"`
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
			it.Quantity, it.UnitPrice,it.Unit, it.LineTotal,
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
			StaffID: row.StaffID, Quantity: row.Quantity, UnitPrice: row.UnitPrice,
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
func (r *PostgresOrderRepository) ReplaceStaffOrderItems(ctx context.Context, orderItemID string, staffItems []*domain.StaffOrderItem) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, deleteStaffOrderItemsQuery, orderItemID); err != nil {
		return fmt.Errorf("lỗi khi xóa nhân viên cũ của dòng đơn: %w", err)
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
// Trả về mã phiếu vừa sinh.
// Guard: khóa row đơn + chỉ chốt đơn chưa hoàn tất (chống chốt 2 lần);
// tồn không đủ ở bất kỳ SP nào thì rollback toàn bộ (ErrInsufficientStock).
func (r *PostgresOrderRepository) CompleteOrderWithSlip(ctx context.Context, orgID, orderID string, lines []domain.SaleSlipLine) (domain.SaleSlipResult, error) {
	var empty domain.SaleSlipResult
	if len(lines) == 0 {
		return empty, fmt.Errorf("phiếu bán hàng phải có ít nhất 1 dòng hàng")
	}
	items := make([]*invdomain.DocumentItemInput, 0, len(lines))
	var total float64
	for _, l := range lines {
		if l.Quantity <= 0 {
			return empty, fmt.Errorf("số lượng sản phẩm %s phải lớn hơn 0", l.ProductID)
		}
		if l.UnitPrice < 0 {
			return empty, fmt.Errorf("đơn giá sản phẩm %s không được âm", l.ProductID)
		}
		// Cộng tổng theo từng dòng (không gom rồi nhân 1 giá để khỏi lệch
		// header khi cùng SP xuất hiện nhiều dòng với đơn giá khác nhau).
		total += l.Quantity * l.UnitPrice
		items = append(items, &invdomain.DocumentItemInput{
			ProductID: l.ProductID,
			Quantity:  l.Quantity,
			UnitPrice: l.UnitPrice,
		})
	}

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

	tag, err := tx.Exec(ctx, flipToCompletedQuery, orgID, orderID)
	if err != nil {
		return empty, fmt.Errorf("lỗi khi chốt đơn hàng: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return empty, fmt.Errorf("đơn hàng %s chưa sẵn sàng chốt: %w", orderID, domain.ErrOrderNotReady)
	}

	// Gom số lượng theo sản phẩm, trừ theo thứ tự cố định chống deadlock.
	// (Tổng tiền đã cộng theo từng dòng ở trên.)
	qtyByProduct := map[string]float64{}
	for _, l := range lines {
		if l.Quantity <= 0 {
			return empty, fmt.Errorf("số lượng sản phẩm %s phải lớn hơn 0", l.ProductID)
		}
		qtyByProduct[l.ProductID] += l.Quantity
	}
	pids := make([]string, 0, len(qtyByProduct))
	for pid := range qtyByProduct {
		pids = append(pids, pid)
	}
	sort.Strings(pids)

	var orderCode string
	if err := tx.QueryRow(ctx, `SELECT code FROM orders WHERE organization_id = $1 AND id = $2`, orgID, orderID).Scan(&orderCode); err != nil {
		return empty, fmt.Errorf("lỗi khi đọc mã đơn hàng: %w", err)
	}

	docID := utils.NewID()
	var docCode string
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

	// Sinh header phiếu bán hàng, retry khi trùng mã.
	for attempts := 0; ; attempts++ {
		docCode = slipCodeForOrder(orderCode, attempts)
		_, err = tx.Exec(ctx, createInventoryDocumentQuery,
			docID, orgID, nil, orderID, docCode, "sale", total, nil, nil, nil,
		)
		if err == nil {
			break
		}
		if !isUniqueViolation(err) || attempts >= 2 {
			return empty, fmt.Errorf("lỗi khi tạo phiếu bán hàng: %w", err)
		}
	}

	products, err := fetchProductSnapshots(ctx, tx, orgID, pids)
	if err != nil {
		return empty, err
	}
	if err := insertDocumentItemsCopy(ctx, tx, docID, items, products); err != nil {
		return empty, err
	}

	if err := tx.Commit(ctx); err != nil {
		return empty, fmt.Errorf("lỗi khi commit transaction: %w", err)
	}
	return domain.SaleSlipResult{DocumentID: docID, DocumentCode: docCode}, nil
}

// ---------- 5. Thanh toán ----------

// FindPaymentByProviderTxn tìm thanh toán theo cặp cổng/mã giao dịch (idempotency).
// Không thấy trả về (nil, nil).
func (r *PostgresOrderRepository) FindPaymentByProviderTxn(ctx context.Context, provider, txnID string) (*domain.Payment, error) {
	var p domain.Payment
	if err := r.qx.GetContext(ctx, &p, findPaymentByProviderTxnQuery, provider, txnID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("lỗi khi tìm thanh toán: %w", err)
	}
	return &p, nil
}

// CreatePayment ghi 1 thanh toán succeeded (không tự đổi trạng thái đơn —
// usecase cộng dồn GetTotalPaidByOrder rồi flip sang paid khi đủ).
func (r *PostgresOrderRepository) CreatePayment(ctx context.Context, payment *domain.Payment) error {
	_, err := r.db.Exec(ctx, createPaymentQuery,
		payment.ID, payment.OrganizationID, payment.OrderID, payment.Method,
		nullableStr(payment.Provider), nullableStr(payment.ProviderTxnID),
		payment.Amount, payment.Status, payment.PaidAt,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi tạo thanh toán: %w", err)
	}
	return nil
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
