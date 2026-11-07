package supplier

import (
	"context"
	"log"

	domain "github.com/daidat02/server/internal/domain/supplier"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/pagination"
	"github.com/daidat02/server/pkg/utils"
)

type SupplierUsecase struct {
	repo domain.SupplierRepository
}

func NewSupplierUsecase(repo domain.SupplierRepository) *SupplierUsecase {
	return &SupplierUsecase{repo: repo}
}

func toResponse(supplier *domain.Supplier) *domain.SupplierResponse {
	return &domain.SupplierResponse{
		ID:             supplier.ID,
		OrganizationID: supplier.OrganizationID,
		Name:           supplier.Name,
		Phone:          supplier.Phone,
		Address:        supplier.Address,
		Note:           supplier.Note,
		CreatedAt:      supplier.CreatedAt,
	}
}

func (u *SupplierUsecase) CreateSupplier(ctx context.Context, req *domain.CreateSupplierRequest) (*domain.SupplierResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if req == nil {
		return nil, apperror.New(400, "Thiếu thông tin nhà cung cấp", nil)
	}

	supplier := &domain.Supplier{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		Name:           req.Name,
		Phone:          req.Phone,
		Address:        req.Address,
		Note:           req.Note,
	}
	if err := supplier.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	if err := u.repo.CreateSupplier(ctx, supplier); err != nil {
		log.Println("Error creating supplier:", err)
		return nil, apperror.New(500, "Lỗi khi tạo nhà cung cấp", err)
	}
	return toResponse(supplier), nil
}

func (u *SupplierUsecase) GetSuppliersByOrgID(ctx context.Context, search string, page, pageSize int) (*pagination.Result[*domain.SupplierResponse], error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	params := pagination.Normalize(page, pageSize)
	suppliers, err := u.repo.GetSuppliersByOrgID(ctx, orgID, search, params.PageSize, params.Offset())
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách nhà cung cấp", err)
	}

	responses := make([]*domain.SupplierResponse, 0, len(suppliers))
	for _, supplier := range suppliers {
		responses = append(responses, toResponse(supplier))
	}

	total, err := u.repo.CountSuppliersByOrgID(ctx, orgID, search)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm nhà cung cấp", err)
	}

	return pagination.NewResult(responses, params, total), nil
}
