package postgres

import (
	"context"
	"fmt"
	"sort"
	"strings"

	orderdomain "github.com/daidat02/server/internal/domain/order"
	domain "github.com/daidat02/server/internal/domain/product"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type PostgresProductRepository struct {
	db *pgxpool.Pool
	qx *sqlx.DB
}

func NewPostgresProductRepository(db *pgxpool.Pool) *PostgresProductRepository {
	return &PostgresProductRepository{
		db: db,
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

func (r *PostgresProductRepository) CreateProduct(ctx context.Context, product *domain.Product) error {
	_, err := r.db.Exec(
		ctx,
		createProductQuery,
		product.ID,
		product.OrganizationID,
		product.CategoryID,
		product.SKU,
		product.Name,
		product.Unit,
		product.NetUnit,
		product.NetAmount,
		product.ProductType,
		product.ShowOnWeb,
		product.CostPrice,
		product.SellPrice,
		product.StockQuantity,
		product.MinStock,
		product.IsActive,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi tạo sản phẩm: %w", err)
	}

	return nil
}

func scanProductRow(scan func(dest ...any) error) (*domain.Product, error) {
	var p domain.Product
	var unit *string

	if err := scan(
		&p.ID,
		&p.OrganizationID,
		&p.CategoryID,
		&p.SKU,
		&p.Name,
		&unit,
		&p.NetUnit,
		&p.NetAmount,
		&p.ProductType,
		&p.ShowOnWeb,
		&p.CostPrice,
		&p.SellPrice,
		&p.StockQuantity,
		&p.MinStock,
		&p.IsActive,
		&p.CreatedAt,
		&p.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if unit != nil {
		p.Unit = *unit
	}

	return &p, nil
}

func (r *PostgresProductRepository) GetProductsByOrgID(
	ctx context.Context,
	orgID string,
	search string,
	status string,
	sort string,
	limit, offset int,
) ([]*domain.Product, error) {

	// 1. Nối toàn bộ các khối hằng số lại với nhau theo đúng thứ tự $1, $2, $3, $4
	query := listProductsByOrgIDQuery +
		searchProductsFilter +
		filterProductsStatus +
		sortProductsFilter

	// 2. Chuẩn bị mảng tham số cố định 4 vị trí đầu tiên ($1, $2, $3, $4)
	// - $1: orgID
	// - $2: search (nếu rỗng thì truyền "", SQL nhận diện qua ($2 = '' OR ...))
	// - $3: status (nếu rỗng thì truyền "", SQL nhận diện qua ($3 = '' OR ...))
	// - $4: sort   (truyền thẳng chuỗi sort vào, CASE WHEN sẽ tự so khớp)

	formattedSearch := ""
	if strings.TrimSpace(search) != "" {
		formattedSearch = "%" + strings.TrimSpace(search) + "%"
	}

	args := []any{
		orgID,           // $1
		formattedSearch, // $2
		status,          // $3
		sort,            // $4
	}

	// 3. Tự động cộng thêm phần Phân trang ở cuối dựa trên số lượng args hiện tại ($5, $6)
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	// 4. Thực thi câu lệnh
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách sản phẩm: %w", err)
	}
	defer rows.Close()

	products := make([]*domain.Product, 0)

	for rows.Next() {
		p, err := scanProductRow(rows.Scan)
		if err != nil {
			return nil, fmt.Errorf("lỗi khi đọc dữ liệu dòng sản phẩm: %w", err)
		}
		products = append(products, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lỗi trong quá trình duyệt danh sách: %w", err)
	}

	return products, nil
}

func (r *PostgresProductRepository) CountProductsByOrgID(ctx context.Context, orgID string, search string, status string) (int64, error) {
	formattedSearch := ""
	if strings.TrimSpace(search) != "" {
		formattedSearch = "%" + strings.TrimSpace(search) + "%"
	}
	args := []any{orgID, formattedSearch, status}
	query := countProductsByOrgIDQuery + searchProductsFilter + filterProductsStatus

	var total int64
	if err := r.db.QueryRow(ctx, query, args...).Scan(&total); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm danh sách sản phẩm: %w", err)
	}
	return total, nil
}

func (r *PostgresProductRepository) UpdateProduct(ctx context.Context, product *domain.Product) error {
	tag, err := r.db.Exec(
		ctx,
		updateProductQuery,
		product.ID,
		product.OrganizationID,
		product.CategoryID,
		product.SKU,
		product.Name,
		product.Unit,
		product.ProductType,
		product.ShowOnWeb,
		product.CostPrice,
		product.SellPrice,
		product.StockQuantity,
		product.MinStock,
		product.IsActive,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật sản phẩm: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("cập nhật sản phẩm %s: %w", product.ID, domain.ErrProductNotFound)
	}

	return nil
}

func (r *PostgresProductRepository) DeleteProduct(ctx context.Context, orgID, id string) error {
	tag, err := r.db.Exec(
		ctx,
		deleteProductQuery,
		id,
		orgID,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi xóa sản phẩm: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("xóa sản phẩm %s: %w", id, domain.ErrProductNotFound)
	}

	return nil
}

// ---------- Giữ chỗ / tồn kho (đúng chủ bảng products) ----------

// deductionQtyByProduct gom số lượng trừ theo từng sản phẩm.
func deductionQtyByProduct(deductions []orderdomain.StockDeduction) map[string]float64 {
	qty := map[string]float64{}
	for _, d := range deductions {
		qty[d.ProductID] += d.Quantity
	}
	return qty
}

// adjustReservations cộng/trừ giữ chỗ kho theo delta từng sản phẩm trong tx có sẵn.
//   - delta > 0: giữ thêm, tồn khả dụng không đủ thì trả ErrInsufficientStock.
//   - delta < 0: nhả giữ chỗ (kẹp >= 0, không bao giờ lỗi thiếu).
//   - delta = 0: bỏ qua.
//
// Thứ tự product cố định để các tx đồng thời không deadlock nhau.
func adjustReservations(ctx context.Context, tx pgx.Tx, orgID string, deltas map[string]float64) error {
	pids := make([]string, 0, len(deltas))
	for pid := range deltas {
		pids = append(pids, pid)
	}
	sort.Strings(pids)
	for _, pid := range pids {
		d := deltas[pid]
		if d == 0 {
			continue
		}
		if d > 0 {
			tag, err := tx.Exec(ctx, reserveStockQuery, pid, orgID, d)
			if err != nil {
				return fmt.Errorf("lỗi khi giữ chỗ kho: %w", err)
			}
			if tag.RowsAffected() == 0 {
				return fmt.Errorf("sản phẩm %s: %w", pid, orderdomain.ErrInsufficientStock)
			}
			continue
		}
		if _, err := tx.Exec(ctx, releaseReserveQuery, pid, orgID, -d); err != nil {
			return fmt.Errorf("lỗi khi nhả giữ chỗ kho: %w", err)
		}
	}
	return nil
}

// ---------- Giá tại thời điểm bán (đúng chủ bảng products) ----------

// GetProductPricing lấy giá bán + giá vốn hiện tại của các sản phẩm
// (server tự quyết giá, không tin client).
func (r *PostgresProductRepository) GetProductPricing(ctx context.Context, orgID string, productIDs []string) (map[string]orderdomain.ProductPricing, error) {
	rows, err := r.db.Query(ctx, productPricingQuery, orgID, productIDs)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi lấy giá sản phẩm: %w", err)
	}
	defer rows.Close()

	pricing := make(map[string]orderdomain.ProductPricing, len(productIDs))
	for rows.Next() {
		var id string
		var p orderdomain.ProductPricing
		if err := rows.Scan(&id, &p.SellPrice, &p.CostPrice); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc giá sản phẩm: %w", err)
		}
		pricing[id] = p
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lỗi trong quá trình đọc giá: %w", err)
	}
	return pricing, nil
}

// GetProductUnits lấy đơn vị + hệ số quy đổi của các sản phẩm
// (server tự quy số lượng/giá về đơn vị nhỏ nhất).
func (r *PostgresProductRepository) GetProductUnits(ctx context.Context, orgID string, productIDs []string) (map[string]orderdomain.ProductUnit, error) {
	rows, err := r.db.Query(ctx, productUnitsQuery, orgID, productIDs)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi lấy đơn vị sản phẩm: %w", err)
	}
	defer rows.Close()

	units := make(map[string]orderdomain.ProductUnit, len(productIDs))
	for rows.Next() {
		var id string
		var u orderdomain.ProductUnit
		if err := rows.Scan(&id, &u.Unit, &u.NetUnit, &u.NetAmount); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc đơn vị sản phẩm: %w", err)
		}
		units[id] = u
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lỗi trong quá trình đọc đơn vị: %w", err)
	}
	return units, nil
}

// ProductsExistInOrg trả về productIDs không thuộc org (rỗng = tất cả hợp lệ).
func (r *PostgresProductRepository) ProductsExistInOrg(ctx context.Context, orgID string, productIDs []string) ([]string, error) {
	rows, err := r.db.Query(ctx, productExistInOrgQuery, orgID, productIDs)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi kiểm tra sản phẩm: %w", err)
	}
	defer rows.Close()

	found := make(map[string]struct{}, len(productIDs))
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc dữ liệu sản phẩm: %w", err)
		}
		found[id] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lỗi trong quá trình kiểm tra sản phẩm: %w", err)
	}

	var missing []string
	for _, id := range productIDs {
		if _, ok := found[id]; !ok {
			missing = append(missing, id)
		}
	}
	return missing, nil
}

// GetProductStats thống kê tổng quan sản phẩm/kho của salon
// (tổng SP, đang bán, sắp hết hàng, doanh thu bán lẻ tháng này).
func (r *PostgresProductRepository) GetProductStats(ctx context.Context, orgID string) (*domain.ProductStatsResponse, error) {
	var stats domain.ProductStatsResponse
	if err := r.qx.GetContext(ctx, &stats, getProductStatsQuery, orgID); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy thống kê sản phẩm: %w", err)
	}
	return &stats, nil
}
