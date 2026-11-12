package organization

import (
	"context"
	"errors"
	"testing"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	domain "github.com/daidat02/server/internal/domain/organization"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func withOrgCtx(orgID string) context.Context {
	return context.WithValue(context.Background(), middlewares.OrgIdKey, orgID)
}

func validCreateOrganizationRequest() *domain.CreateOrganizationRequest {
	return &domain.CreateOrganizationRequest{
		Name:          "Salon Demo",
		Slug:          "salon-demo",
		OwnerPhone:    "0909000001",
		OwnerPassword: "secret123",
	}
}

func assertAppErrorCode(t *testing.T, err error, expected int) {
	t.Helper()
	var appErr *apperror.AppError
	assert.True(t, errors.As(err, &appErr))
	if appErr != nil {
		assert.Equal(t, expected, appErr.StatusCode)
	}
}

func TestOrganizationUsecase_CreateOrganizationSetsDemo(t *testing.T) {
	repo := new(MockOrganizationRepository)
	uc := NewOrganizationUseCase(repo)

	repo.On("CreateOrganization", mock.Anything, mock.MatchedBy(func(org *domain.Organization) bool {
		return org.IsDemo && org.Name == "Salon Demo" && org.Slug == "salon-demo"
	}), mock.Anything).Return(&domain.OrganizationResponse{ID: "org-1", IsDemo: true}, nil).Once()

	result, err := uc.CreateOrganization(context.Background(), validCreateOrganizationRequest())

	assert.NoError(t, err)
	assert.True(t, result.IsDemo)
	repo.AssertExpectations(t)
}

func TestOrganizationUsecase_UpdateDemoStatus(t *testing.T) {
	tests := []struct {
		name        string
		ctx         context.Context
		isDemo      bool
		repoResult  *domain.OrganizationResponse
		repoErr     error
		expectRepo  bool
		expectedErr int
	}{
		{
			name:        "từ chối bật lại dữ liệu mẫu",
			ctx:         withOrgCtx("org-1"),
			isDemo:      true,
			expectedErr: 400,
		},
		{
			name:        "thiếu organization trong context",
			ctx:         context.Background(),
			isDemo:      false,
			expectedErr: 400,
		},
		{
			name:        "không tìm thấy tổ chức",
			ctx:         withOrgCtx("org-1"),
			isDemo:      false,
			repoErr:     domain.ErrOrganizationNotFound,
			expectRepo:  true,
			expectedErr: 404,
		},
		{
			name:       "tắt dữ liệu mẫu thành công",
			ctx:        withOrgCtx("org-1"),
			isDemo:     false,
			repoResult: &domain.OrganizationResponse{ID: "org-1", IsDemo: false},
			expectRepo: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := new(MockOrganizationRepository)
			uc := NewOrganizationUseCase(repo)
			if tt.expectRepo {
				repo.On("DisableDemo", mock.Anything, "org-1").Return(tt.repoResult, tt.repoErr).Once()
			}

			result, err := uc.UpdateDemoStatus(tt.ctx, tt.isDemo)

			if tt.expectedErr != 0 {
				assertAppErrorCode(t, err, tt.expectedErr)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.False(t, result.IsDemo)
			}
			repo.AssertExpectations(t)
		})
	}
}
