package organization

import (
	"context"

	domain "github.com/daidat02/server/internal/domain/organization"
	"github.com/stretchr/testify/mock"
)

type MockOrganizationRepository struct {
	mock.Mock
}

func (m *MockOrganizationRepository) CreateOrganization(ctx context.Context, org *domain.Organization, owner *domain.OwnerAccount) (*domain.OrganizationResponse, error) {
	args := m.Called(ctx, org, owner)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.OrganizationResponse), args.Error(1)
}

func (m *MockOrganizationRepository) DisableDemo(ctx context.Context, orgID string) (*domain.OrganizationResponse, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.OrganizationResponse), args.Error(1)
}
