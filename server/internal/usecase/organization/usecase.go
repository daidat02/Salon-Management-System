package organization

import (
	"context"
	"errors"
	"log"
	"strings"

	domain "github.com/daidat02/server/internal/domain/organization"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/utils"
)

type OrganizationUseCase struct {
	repo domain.OrganizationRepository
}

func NewOrganizationUseCase(repo domain.OrganizationRepository) *OrganizationUseCase {
	return &OrganizationUseCase{repo: repo}
}

// CreateOrganization tạo tổ chức và settings mặc định đi kèm.
func (u *OrganizationUseCase) CreateOrganization(ctx context.Context, req *domain.CreateOrganizationRequest) (*domain.OrganizationResponse, error) {
	org := &domain.Organization{
		ID:       utils.NewID(),
		Name:     strings.TrimSpace(req.Name),
		Slug:     strings.TrimSpace(req.Slug),
		Phone:    strings.TrimSpace(req.Phone),
		Address:  strings.TrimSpace(req.Address),
		Timezone: strings.TrimSpace(req.Timezone),
		Email:    strings.TrimSpace(req.Email),
		Website:  strings.TrimSpace(req.Website),
		TaxCode:  strings.TrimSpace(req.TaxCode),
		Slogan:   strings.TrimSpace(req.Slogan),
		LogoURL:  strings.TrimSpace(req.LogoURL),
	}

	if err := org.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	ownerPhone := strings.TrimSpace(req.OwnerPhone)
	if ownerPhone == "" {
		return nil, apperror.New(400, "Số điện thoại chủ salon không được để trống", nil)
	}
	if req.OwnerPassword == "" {
		return nil, apperror.New(400, "Mật khẩu chủ salon không được để trống", nil)
	}

	ownerFullName := strings.TrimSpace(req.OwnerFullName)
	if ownerFullName == "" {
		ownerFullName = org.Name
	}

	hashPassword, err := utils.HashPassword(req.OwnerPassword)
	if err != nil {
		log.Println("Error hashing owner password:", err)
		return nil, apperror.New(500, "Lỗi khi băm mật khẩu", err)
	}

	owner := &domain.OwnerAccount{
		ID:           utils.NewID(),
		Phone:        ownerPhone,
		PasswordHash: hashPassword,
		FullName:     ownerFullName,
	}

	result, err := u.repo.CreateOrganization(ctx, org, owner)
	if err != nil {
		if errors.Is(err, domain.ErrSlugExists) {
			return nil, apperror.New(409, "Slug đã tồn tại", err)
		}
		log.Println("Error creating organization:", err)
		return nil, apperror.New(500, "Lỗi khi tạo tổ chức", err)
	}

	return result, nil
}
