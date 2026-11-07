package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"

	orderdomain "github.com/daidat02/server/internal/domain/order"
	domain "github.com/daidat02/server/internal/domain/service"
	"github.com/daidat02/server/pkg/utils"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresServiceRepository struct {
	db *pgxpool.Pool
}

func NewPostgresServiceRepository(db *pgxpool.Pool) *PostgresServiceRepository {
	return &PostgresServiceRepository{
		db: db,
	}
}

func (r *PostgresServiceRepository) bulkUpsertServiceMaterials(ctx context.Context, tx pgx.Tx, orgID, serviceID string, materials []*domain.ServiceMaterialInput) error {
	if len(materials) == 0 {
		return nil
	}
	query := bulkInsertServiceMaterialsQuery
	var args []interface{}
	var placeholders []string
	for _, m := range materials {
		ID := utils.NewID()
		placeholders = append(placeholders, fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d)", len(args)+1, len(args)+2, len(args)+3, len(args)+4, len(args)+5, len(args)+6))
		args = append(args, ID, orgID, serviceID, m.ProductID, m.Quantity, unitOrDefault(m.Unit))
	}

	query += strings.Join(placeholders, ", ")
	query += ` ON CONFLICT (organization_id, service_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity, unit = EXCLUDED.unit, updated_at = now()`
	_, err := tx.Exec(ctx, query, args...)
	return err
}

// unitOrDefault chuẩn hoá unit định mức: rỗng -> "" (DB nullable, repo gọi đã mặc định).
func unitOrDefault(u *string) any {
	if u == nil {
		return nil
	}
	if v := strings.TrimSpace(*u); v != "" {
		return v
	}
	return nil
}
func (r *PostgresServiceRepository) CreateService(ctx context.Context, service *domain.Service, materials []*domain.ServiceMaterialInput) error {

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(
		ctx,
		createServiceQuery,
		service.ID,
		service.OrganizationID,
		service.CategoryID,
		service.Name,
		service.Description,
		service.DurationMinutes,
		service.BufferMinutes,
		service.Price,
		service.IsActive,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi tạo dịch vụ: %w", err)
	}

	if len(materials) > 0 {
		err = r.bulkUpsertServiceMaterials(ctx, tx, service.OrganizationID, service.ID, materials)
		if err != nil {
			return fmt.Errorf("lỗi khi thêm nguyên vật liệu cho dịch vụ: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit transaction: %w", err)
	}
	return nil
}

func scanServiceRow(scan func(dest ...any) error) (*domain.Service, error) {
	var s domain.Service
	var description *string

	if err := scan(
		&s.ID,
		&s.OrganizationID,
		&s.CategoryID,
		&s.CategoryName,
		&s.Name,
		&description,
		&s.DurationMinutes,
		&s.BufferMinutes,
		&s.Price,
		&s.IsActive,
		&s.SoldThisMonth,
		&s.RevenueThisMonth,
		&s.CreatedAt,
		&s.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if description != nil {
		s.Description = *description
	}

	return &s, nil
}

func (r *PostgresServiceRepository) GetServicesByOrgID(ctx context.Context, orgID string, search string, status string, categoryID string, sort string, limit, offset int) ([]*domain.Service, error) {
	query := listServicesByOrgIDQuery + searchServicesFilter + filterServicesStatus + filterServicesCategory + sortServicesFilter

	formattedSearch := ""
	if strings.TrimSpace(search) != "" {
		formattedSearch = "%" + strings.TrimSpace(search) + "%"
	}

	args := []any{
		orgID,           // $1
		formattedSearch, // $2
		status,          // $3
		categoryID,      // $4
		sort,            // $5
	}

	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách dịch vụ: %w", err)
	}
	defer rows.Close()

	services := make([]*domain.Service, 0)

	for rows.Next() {
		s, err := scanServiceRow(rows.Scan)
		if err != nil {
			return nil, fmt.Errorf("lỗi khi đọc dữ liệu dòng dịch vụ: %w", err)
		}
		services = append(services, s)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lỗi trong quá trình duyệt danh sách: %w", err)
	}

	return services, nil
}

func (r *PostgresServiceRepository) CountServicesByOrgID(ctx context.Context, orgID string, search string, status string, categoryID string) (int64, error) {
	formattedSearch := ""
	if strings.TrimSpace(search) != "" {
		formattedSearch = "%" + strings.TrimSpace(search) + "%"
	}
	args := []any{orgID, formattedSearch, status, categoryID}
	query := countServicesByOrgIDQuery + searchServicesFilter + filterServicesStatus + filterServicesCategory

	var total int64
	if err := r.db.QueryRow(ctx, query, args...).Scan(&total); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm danh sách dịch vụ: %w", err)
	}
	return total, nil
}

func (r *PostgresServiceRepository) GetServiceStats(ctx context.Context, orgID string) (*domain.ServiceStatsResponse, error) {
	var stats domain.ServiceStatsResponse
	if err := r.db.QueryRow(ctx, getServiceStatsQuery, orgID).Scan(
		&stats.TotalServices,
		&stats.ActiveServices,
		&stats.InactiveServices,
		&stats.ServiceRevenueMonth,
	); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy thống kê dịch vụ: %w", err)
	}
	return &stats, nil
}

func (r *PostgresServiceRepository) GetServiceSalesLastMonths(ctx context.Context, orgID, serviceID string, months int) ([]domain.ServiceMonthlySales, error) {
	rows, err := r.db.Query(ctx, serviceSalesLastMonthsQuery, orgID, serviceID, months)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn doanh số dịch vụ: %w", err)
	}
	defer rows.Close()

	sales := make([]domain.ServiceMonthlySales, 0, months)
	for rows.Next() {
		var item domain.ServiceMonthlySales
		if err := rows.Scan(&item.MonthStart, &item.Quantity, &item.Revenue); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc doanh số dịch vụ: %w", err)
		}
		sales = append(sales, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lỗi trong quá trình duyệt doanh số dịch vụ: %w", err)
	}
	return sales, nil
}

func (r *PostgresServiceRepository) GetServiceBookingStats(ctx context.Context, orgID, serviceID string) (*domain.ServiceBookingStats, error) {
	var stats domain.ServiceBookingStats
	if err := r.db.QueryRow(ctx, getServiceBookingStatsQuery, orgID, serviceID).Scan(
		&stats.BookingsThisMonth,
		&stats.CompletedThisMonth,
		&stats.MaterialCostThisMonth,
	); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy thống kê lịch hẹn dịch vụ: %w", err)
	}
	return &stats, nil
}

func (r *PostgresServiceRepository) CategoryExistsInOrg(ctx context.Context, orgID, categoryID string) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, categoryExistsInOrgQuery, categoryID, orgID).Scan(&exists); err != nil {
		return false, fmt.Errorf("lỗi khi kiểm tra danh mục: %w", err)
	}
	return exists, nil
}

// GetProductUnits lấy đơn vị lớn + net của sản phẩm (để validate/mặc định unit định mức).
func (r *PostgresServiceRepository) GetProductUnits(ctx context.Context, orgID string, productIDs []string) (map[string]domain.ProductUnit, error) {
	rows, err := r.db.Query(ctx, productUnitsInOrgQuery, orgID, productIDs)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi lấy đơn vị sản phẩm: %w", err)
	}
	defer rows.Close()

	units := make(map[string]domain.ProductUnit, len(productIDs))
	for rows.Next() {
		var id string
		var u domain.ProductUnit
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

// ProductsExistInOrg trả về danh sách productIDs không thuộc org (rỗng = tất cả hợp lệ).
func (r *PostgresServiceRepository) ProductsExistInOrg(ctx context.Context, orgID string, productIDs []string) ([]string, error) {
	rows, err := r.db.Query(ctx, productsExistInOrgQuery, orgID, productIDs)
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

// ServicesExistInOrg trả về danh sách serviceIDs không thuộc org (rỗng = tất cả hợp lệ).
func (r *PostgresServiceRepository) ServicesExistInOrg(ctx context.Context, orgID string, serviceIDs []string) ([]string, error) {
	rows, err := r.db.Query(ctx, servicesExistInOrgQuery, orgID, serviceIDs)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi kiểm tra dịch vụ: %w", err)
	}
	defer rows.Close()

	found := make(map[string]struct{}, len(serviceIDs))
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc dữ liệu dịch vụ: %w", err)
		}
		found[id] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lỗi trong quá trình kiểm tra dịch vụ: %w", err)
	}

	var missing []string
	for _, id := range serviceIDs {
		if _, ok := found[id]; !ok {
			missing = append(missing, id)
		}
	}
	return missing, nil
}

func (r *PostgresServiceRepository) UpdateService(ctx context.Context, service *domain.Service) error {
	tag, err := r.db.Exec(
		ctx,
		updateServiceQuery,
		service.ID,
		service.OrganizationID,
		service.CategoryID,
		service.Name,
		service.Description,
		service.DurationMinutes,
		service.BufferMinutes,
		service.Price,
		service.IsActive,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật dịch vụ: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("cập nhật dịch vụ %s: %w", service.ID, domain.ErrServiceNotFound)
	}

	return nil
}

func (r *PostgresServiceRepository) DeleteService(ctx context.Context, orgID, id string) error {
	tag, err := r.db.Exec(
		ctx,
		deleteServiceQuery,
		id,
		orgID,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi xóa dịch vụ: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("xóa dịch vụ %s: %w", id, domain.ErrServiceNotFound)
	}

	return nil
}

func (r *PostgresServiceRepository) GetServiceDetails(ctx context.Context, orgID, serviceID string) (*domain.ServiceResponse, []*domain.ServiceMaterial, error) {
	service := &domain.ServiceResponse{}
	var materials []*domain.ServiceMaterial
	var materialsJSON []byte
	err := r.db.QueryRow(
		ctx,
		getServiceDetailsQuery,
		orgID,
		serviceID).Scan(
		&service.ID,
		&service.OrganizationID,
		&service.CategoryID,
		&service.CategoryName,
		&service.Name,
		&service.Description,
		&service.DurationMinutes,
		&service.BufferMinutes,
		&service.Price,
		&service.IsActive,
		&service.SoldThisMonth,
		&service.RevenueThisMonth,
		&service.CreatedAt,
		&service.UpdatedAt,
		&materialsJSON,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, fmt.Errorf("chi tiết dịch vụ %s: %w", serviceID, domain.ErrServiceNotFound)
		}
		return nil, nil, fmt.Errorf("lỗi query chi tiết dịch vụ: %w", err)
	}

	log.Printf("DEBUG: materialsJSON: %s", string(materialsJSON)) // Log the raw JSON for debugging
	if err := json.Unmarshal(materialsJSON, &materials); err != nil {
		return nil, nil, fmt.Errorf("lỗi unmarshal materials json: %w", err)
	}

	return service, materials, nil
}

// ---------- Giá + định mức tại thời điểm bán (đúng chủ bảng services/service_materials) ----------

// GetServicePrices lấy giá bán hiện tại của các dịch vụ trong 1 query
// (tránh N+1 khi đơn có nhiều dòng dịch vụ). Thiếu id nào thì map không
// có key đó, usecase map sang 404.
func (r *PostgresServiceRepository) GetServicePrices(ctx context.Context, orgID string, serviceIDs []string) (map[string]float64, error) {
	rows, err := r.db.Query(ctx, servicePricesQuery, orgID, serviceIDs)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi lấy giá dịch vụ: %w", err)
	}
	defer rows.Close()

	prices := make(map[string]float64, len(serviceIDs))
	for rows.Next() {
		var id string
		var price float64
		if err := rows.Scan(&id, &price); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc giá dịch vụ: %w", err)
		}
		prices[id] = price
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lỗi trong quá trình đọc giá dịch vụ: %w", err)
	}
	return prices, nil
}

// GetServiceMaterials lấy định mức vật tư + giá vốn hiện tại theo từng dịch vụ,
// dùng để snapshot vật tư tiêu hao lúc tạo đơn.
func (r *PostgresServiceRepository) GetServiceMaterials(ctx context.Context, orgID string, serviceIDs []string) (map[string][]orderdomain.ServiceMaterialUsage, error) {
	rows, err := r.db.Query(ctx, serviceMaterialsWithCostQuery, orgID, serviceIDs)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi lấy định mức vật tư: %w", err)
	}
	defer rows.Close()

	usages := make(map[string][]orderdomain.ServiceMaterialUsage)
	for rows.Next() {
		var serviceID string
		var u orderdomain.ServiceMaterialUsage
		if err := rows.Scan(&serviceID, &u.ProductID, &u.QuantityPerService, &u.Unit, &u.UnitCost); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc định mức vật tư: %w", err)
		}
		usages[serviceID] = append(usages[serviceID], u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lỗi trong quá trình đọc định mức: %w", err)
	}
	return usages, nil
}
