package service

import (
	"context"
	"errors"
)

// ErrServiceNotFound dùng để usecase map đúng 404 khi UPDATE/DELETE không chạm dòng nào
// (sai id hoặc khác organization).
var ErrServiceNotFound = errors.New("service not found")

type ServiceRepository interface {
	CreateService(ctx context.Context, service *Service, materials []*ServiceMaterialInput) error
	GetServicesByOrgID(ctx context.Context, orgID string, search string, status string, categoryID string, sort string, limit, offset int) ([]*Service, error)
	CountServicesByOrgID(ctx context.Context, orgID string, search string, status string, categoryID string) (int64, error)
	GetServiceStats(ctx context.Context, orgID string) (*ServiceStatsResponse, error)
	GetServiceSalesLastMonths(ctx context.Context, orgID, serviceID string, months int) ([]ServiceMonthlySales, error)
	GetServiceBookingStats(ctx context.Context, orgID, serviceID string) (*ServiceBookingStats, error)
	UpdateService(ctx context.Context, service *Service) error
	DeleteService(ctx context.Context, orgID, id string) error
	CategoryExistsInOrg(ctx context.Context, orgID, categoryID string) (bool, error)
	ProductsExistInOrg(ctx context.Context, orgID string, productIDs []string) ([]string, error)
	ServicesExistInOrg(ctx context.Context, orgID string, serviceIDs []string) ([]string, error)
	GetServiceDetails(ctx context.Context, orgID, serviceID string) (*ServiceResponse, []*ServiceMaterial, error)
	// GetProductUnits lấy đơn vị lớn + net của sản phẩm (để validate/mặc định unit định mức).
	GetProductUnits(ctx context.Context, orgID string, productIDs []string) (map[string]ProductUnit, error)
}

// ProductUnit đơn vị của 1 sản phẩm (mirror order.ProductUnit, tránh import chéo domain).
type ProductUnit struct {
	Unit      string
	NetUnit   *string
	NetAmount *float64
}
