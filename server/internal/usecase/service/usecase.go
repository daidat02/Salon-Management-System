package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	domain "github.com/daidat02/server/internal/domain/service"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/pagination"
	"github.com/daidat02/server/pkg/utils"
	"github.com/google/uuid"
)

type ServiceUsecase struct {
	repo domain.ServiceRepository
}

func NewServiceUsecase(repo domain.ServiceRepository) *ServiceUsecase {
	return &ServiceUsecase{
		repo: repo,
	}
}

func toResponse(s *domain.Service) *domain.ServiceResponse {
	return &domain.ServiceResponse{
		ID:               s.ID,
		OrganizationID:   s.OrganizationID,
		CategoryID:       s.CategoryID,
		CategoryName:     s.CategoryName,
		Name:             s.Name,
		Description:      s.Description,
		DurationMinutes:  s.DurationMinutes,
		BufferMinutes:    s.BufferMinutes,
		Price:            s.Price,
		IsActive:         s.IsActive,
		SoldThisMonth:    s.SoldThisMonth,
		RevenueThisMonth: s.RevenueThisMonth,
		CreatedAt:        s.CreatedAt,
		UpdatedAt:        s.UpdatedAt,
	}
}

func (u *ServiceUsecase) CreateService(ctx context.Context, service *domain.Service, materials []*domain.ServiceMaterialInput) (*domain.ServiceResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	if err := service.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}
	if err := u.checkCategoryInOrg(ctx, orgID, service.CategoryID); err != nil {
		return nil, err
	}
	if err := u.validateMaterials(ctx, orgID, materials); err != nil {
		return nil, err
	}
	service.ID = utils.NewID()
	service.OrganizationID = orgID

	if err := u.repo.CreateService(ctx, service, materials); err != nil {
		log.Println("Error creating service:", err)
		return nil, apperror.New(500, "Lỗi khi tạo dịch vụ", err)
	}

	return toResponse(service), nil
}

// validateMaterials kiểm tra từng material ở tầng usecase (không phụ thuộc
// mỗi binding validator của handler): đủ product_id, quantity > 0,
// mọi product đều thuộc đúng organization, unit (nếu gửi) phải là unit
// lớn hoặc net_unit của sản phẩm; rỗng thì mặc định unit lớn.
func (u *ServiceUsecase) validateMaterials(ctx context.Context, orgID string, materials []*domain.ServiceMaterialInput) error {
	seen := make(map[string]struct{}, len(materials))
	var productIDs []string
	for i, m := range materials {
		if m == nil || strings.TrimSpace(m.ProductID) == "" {
			return apperror.New(400, fmt.Sprintf("Thiếu product_id ở nguyên vật liệu thứ %d", i+1), nil)
		}
		if m.Quantity <= 0 {
			return apperror.New(400, "Số lượng nguyên vật liệu phải lớn hơn 0", nil)
		}
		if _, ok := seen[m.ProductID]; !ok {
			seen[m.ProductID] = struct{}{}
			productIDs = append(productIDs, m.ProductID)
		}
	}
	if len(productIDs) == 0 {
		return nil
	}

	missing, err := u.repo.ProductsExistInOrg(ctx, orgID, productIDs)
	if err != nil {
		return apperror.New(500, "Lỗi khi kiểm tra sản phẩm", err)
	}
	if len(missing) > 0 {
		return apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", strings.Join(missing, ", ")), nil)
	}

	units, err := u.repo.GetProductUnits(ctx, orgID, productIDs)
	if err != nil {
		return apperror.New(500, "Lỗi khi lấy đơn vị sản phẩm", err)
	}
	for i, m := range materials {
		pu, ok := units[m.ProductID]
		if !ok {
			return apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", m.ProductID), nil)
		}
		u := ""
		if m.Unit != nil {
			u = strings.TrimSpace(*m.Unit)
		}
		if u == "" {
			u = pu.Unit
		} else {
			nu := ""
			if pu.NetUnit != nil {
				nu = strings.TrimSpace(*pu.NetUnit)
			}
			if u != pu.Unit && (nu == "" || u != nu) {
				return apperror.New(400, fmt.Sprintf("Nguyên vật liệu thứ %d: đơn vị %q không hợp lệ (chỉ nhận %q%s)", i+1, u, pu.Unit, netHint(nu)), nil)
			}
		}
		m.Unit = &u
	}
	return nil
}

// ReplaceServiceMaterials thay toàn bộ định mức vật tư của dịch vụ trong 1
// transaction. Mảng rỗng xóa hết định mức; chỉ ảnh hưởng các đơn tạo sau này
// vì đơn cũ đã giữ snapshot vật tư riêng.
func (u *ServiceUsecase) ReplaceServiceMaterials(ctx context.Context, serviceID string, materials []*domain.ServiceMaterialInput) ([]*domain.ServiceMaterial, error) {
	serviceID = strings.TrimSpace(serviceID)
	if serviceID == "" {
		return nil, apperror.New(400, "Thiếu id dịch vụ", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	seen := make(map[string]struct{}, len(materials))
	for i, m := range materials {
		if m == nil {
			continue
		}
		productID := strings.TrimSpace(m.ProductID)
		if productID == "" {
			continue
		}
		if _, ok := seen[productID]; ok {
			return nil, apperror.New(400, fmt.Sprintf("Nguyên vật liệu thứ %d: product_id bị trùng", i+1), nil)
		}
		seen[productID] = struct{}{}
	}

	if err := u.validateMaterials(ctx, orgID, materials); err != nil {
		return nil, err
	}

	if err := u.repo.ReplaceServiceMaterials(ctx, orgID, serviceID, materials); err != nil {
		log.Println("Error replacing service materials:", err)
		if errors.Is(err, domain.ErrServiceNotFound) {
			return nil, apperror.New(404, "Không tìm thấy dịch vụ", err)
		}
		return nil, apperror.New(500, "Lỗi khi cập nhật định mức nguyên vật liệu", err)
	}

	_, result, err := u.repo.GetServiceDetails(ctx, orgID, serviceID)
	if err != nil {
		if errors.Is(err, domain.ErrServiceNotFound) {
			return nil, apperror.New(404, "Không tìm thấy dịch vụ", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy định mức nguyên vật liệu", err)
	}
	if result == nil {
		result = []*domain.ServiceMaterial{}
	}
	return result, nil
}

// netHint gợi ý net_unit trong message lỗi.
func netHint(nu string) string {
	if nu == "" {
		return ""
	}
	return " hoặc " + nu
}

// checkCategoryInOrg đảm bảo category (nếu có) thuộc đúng organization.
func (u *ServiceUsecase) checkCategoryInOrg(ctx context.Context, orgID string, categoryID *string) error {
	if categoryID == nil || strings.TrimSpace(*categoryID) == "" {
		return nil
	}

	exists, err := u.repo.CategoryExistsInOrg(ctx, orgID, *categoryID)
	if err != nil {
		return apperror.New(500, "Lỗi khi kiểm tra danh mục", err)
	}
	if !exists {
		return apperror.New(404, "Không tìm thấy danh mục trong tổ chức", nil)
	}
	return nil
}

func (u *ServiceUsecase) GetServicesByOrgID(ctx context.Context, search string, status string, categoryID string, sort string, page, pageSize int) (*pagination.Result[*domain.ServiceResponse], error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	categoryID = strings.TrimSpace(categoryID)
	if categoryID != "" {
		if _, err := uuid.Parse(categoryID); err != nil {
			return nil, apperror.New(400, "category_id không hợp lệ", err)
		}
	}

	params := pagination.Normalize(page, pageSize)

	services, err := u.repo.GetServicesByOrgID(ctx, orgID, search, status, categoryID, sort, params.PageSize, params.Offset())
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách dịch vụ", err)
	}

	servicesResponse := []*domain.ServiceResponse{}
	for _, service := range services {
		servicesResponse = append(servicesResponse, toResponse(service))
	}

	total, err := u.repo.CountServicesByOrgID(ctx, orgID, search, status, categoryID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm danh sách dịch vụ", err)
	}

	return pagination.NewResult(servicesResponse, params, total), nil
}

// GetServiceStats thống kê tổng quan dịch vụ của salon.
func (u *ServiceUsecase) GetServiceStats(ctx context.Context) (*domain.ServiceStatsResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	stats, err := u.repo.GetServiceStats(ctx, orgID)
	if err != nil {
		log.Println("Error getting service stats:", err)
		return nil, apperror.New(500, "Lỗi khi lấy thống kê dịch vụ", err)
	}
	return stats, nil
}

const serviceRevenueMonths = 6

// buildServiceRevenueLastMonths điền đủ các tháng còn thiếu và trả về doanh
// số/doanh thu tháng hiện tại.
func buildServiceRevenueLastMonths(sales []domain.ServiceMonthlySales, months int) ([]domain.ServiceMonthlyRevenueResponse, float64, float64) {
	byMonth := make(map[string]domain.ServiceMonthlySales, len(sales))
	for _, s := range sales {
		byMonth[s.MonthStart.UTC().Format("2006-01")] = s
	}

	now := time.Now().UTC()
	currentMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	result := make([]domain.ServiceMonthlyRevenueResponse, 0, months)
	var soldThisMonth, revenueThisMonth float64

	for i := months - 1; i >= 0; i-- {
		month := currentMonth.AddDate(0, -i, 0)
		sale := byMonth[month.Format("2006-01")]
		result = append(result, domain.ServiceMonthlyRevenueResponse{
			Month:   fmt.Sprintf("T%d", int(month.Month())),
			Revenue: sale.Revenue,
		})
		if i == 0 {
			soldThisMonth = sale.Quantity
			revenueThisMonth = sale.Revenue
		}
	}

	return result, soldThisMonth, revenueThisMonth
}

func (u *ServiceUsecase) UpdateService(ctx context.Context, id string, service *domain.Service) (*domain.ServiceResponse, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id dịch vụ", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	if err := service.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}
	if err := u.checkCategoryInOrg(ctx, orgID, service.CategoryID); err != nil {
		return nil, err
	}
	service.ID = id
	service.OrganizationID = orgID

	if err := u.repo.UpdateService(ctx, service); err != nil {
		log.Println("Error updating service:", err)
		if errors.Is(err, domain.ErrServiceNotFound) {
			return nil, apperror.New(404, "Không tìm thấy dịch vụ", err)
		}
		return nil, apperror.New(500, "Lỗi khi cập nhật dịch vụ", err)
	}

	return toResponse(service), nil
}

func (u *ServiceUsecase) DeleteService(ctx context.Context, id string) (string, error) {
	if strings.TrimSpace(id) == "" {
		return "", apperror.New(400, "Thiếu id dịch vụ", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return "", err
	}

	if err := u.repo.DeleteService(ctx, orgID, id); err != nil {
		log.Println("Error deleting service:", err)
		if errors.Is(err, domain.ErrServiceNotFound) {
			return "", apperror.New(404, "Không tìm thấy dịch vụ", err)
		}
		return "", apperror.New(500, "Lỗi khi xóa dịch vụ", err)
	}

	return id, nil
}

func (u *ServiceUsecase) GetServiceDetails(ctx context.Context, serviceID string) (*domain.ServiceDetailResponse, []*domain.ServiceMaterial, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, nil, err
	}

	service, materials, err := u.repo.GetServiceDetails(ctx, orgID, serviceID)
	if err != nil {
		if errors.Is(err, domain.ErrServiceNotFound) {
			return nil, nil, apperror.New(404, "Không tìm thấy dịch vụ", err)
		}
		return nil, nil, apperror.New(500, "Lỗi khi lấy thông tin dịch vụ và nguyên vật liệu", err)
	}

	sales, err := u.repo.GetServiceSalesLastMonths(ctx, orgID, serviceID, serviceRevenueMonths)
	if err != nil {
		return nil, nil, apperror.New(500, "Lỗi khi lấy doanh số dịch vụ", err)
	}
	bookingStats, err := u.repo.GetServiceBookingStats(ctx, orgID, serviceID)
	if err != nil {
		return nil, nil, apperror.New(500, "Lỗi khi lấy thống kê lịch hẹn dịch vụ", err)
	}

	detail := &domain.ServiceDetailResponse{
		ServiceResponse:       *service,
		BookingsThisMonth:     bookingStats.BookingsThisMonth,
		CompletedThisMonth:    bookingStats.CompletedThisMonth,
		MaterialCostThisMonth: bookingStats.MaterialCostThisMonth,
	}
	detail.RevenueLast6Months, detail.SoldThisMonth, detail.RevenueThisMonth = buildServiceRevenueLastMonths(sales, serviceRevenueMonths)
	return detail, materials, nil
}
