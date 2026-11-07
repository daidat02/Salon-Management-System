package supplier

import (
	"context"
	"errors"
	"testing"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	domain "github.com/daidat02/server/internal/domain/supplier"
	"github.com/daidat02/server/pkg/apperror"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func withOrgCtx(orgID string) context.Context {
	return context.WithValue(context.Background(), middlewares.OrgIdKey, orgID)
}

func assertFlatAppError(t *testing.T, err error, expectedCode int) {
	t.Helper()
	var appErr *apperror.AppError
	assert.True(t, errors.As(err, &appErr), "Lỗi phải là *apperror.AppError")
	if appErr != nil {
		assert.Equal(t, expectedCode, appErr.StatusCode, "Sai StatusCode")
		var inner *apperror.AppError
		assert.False(t, errors.As(appErr.Err, &inner), "Lỗi bị lồng 2 lớp AppError")
	}
}

func TestSupplierUsecase_CreateSupplier(t *testing.T) {
	t.Run("Thành công - trim và lưu NCC", func(t *testing.T) {
		repo := new(MockSupplierRepository)
		var got *domain.Supplier
		repo.On("CreateSupplier", mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				got = args.Get(1).(*domain.Supplier)
			}).Return(nil)

		uc := NewSupplierUsecase(repo)
		phone := " 0901234567 "
		res, err := uc.CreateSupplier(withOrgCtx("org-123"), &domain.CreateSupplierRequest{
			Name:  "  NCC Ánh Dương  ",
			Phone: &phone,
		})

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, "NCC Ánh Dương", got.Name)
		assert.Equal(t, "0901234567", *got.Phone)
		assert.Equal(t, "org-123", got.OrganizationID)
		assert.NotEmpty(t, got.ID)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - thiếu organization_id", func(t *testing.T) {
		repo := new(MockSupplierRepository)
		uc := NewSupplierUsecase(repo)
		res, err := uc.CreateSupplier(context.Background(), &domain.CreateSupplierRequest{Name: "NCC"})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		repo.AssertNotCalled(t, "CreateSupplier", mock.Anything, mock.Anything)
	})

	t.Run("Thất bại - tên rỗng", func(t *testing.T) {
		repo := new(MockSupplierRepository)
		uc := NewSupplierUsecase(repo)
		res, err := uc.CreateSupplier(withOrgCtx("org-123"), &domain.CreateSupplierRequest{Name: "   "})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		repo.AssertNotCalled(t, "CreateSupplier", mock.Anything, mock.Anything)
	})

	t.Run("Thất bại - lỗi repo", func(t *testing.T) {
		repo := new(MockSupplierRepository)
		repo.On("CreateSupplier", mock.Anything, mock.Anything).Return(errors.New("db failed"))
		uc := NewSupplierUsecase(repo)
		res, err := uc.CreateSupplier(withOrgCtx("org-123"), &domain.CreateSupplierRequest{Name: "NCC"})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
	})
}

func TestSupplierUsecase_GetSuppliersByOrgID(t *testing.T) {
	t.Run("Thành công - có phân trang", func(t *testing.T) {
		repo := new(MockSupplierRepository)
		repo.On("GetSuppliersByOrgID", mock.Anything, "org-123", "loreal", mock.Anything, mock.Anything).
			Return([]*domain.Supplier{
				{ID: "sup-1", OrganizationID: "org-123", Name: "L'Oréal"},
			}, nil)
		repo.On("CountSuppliersByOrgID", mock.Anything, "org-123", "loreal").Return(int64(1), nil)

		uc := NewSupplierUsecase(repo)
		res, err := uc.GetSuppliersByOrgID(withOrgCtx("org-123"), "loreal", 1, 20)

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Len(t, res.Data, 1)
		assert.Equal(t, int64(1), res.Total)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - thiếu organization_id", func(t *testing.T) {
		uc := NewSupplierUsecase(new(MockSupplierRepository))
		res, err := uc.GetSuppliersByOrgID(context.Background(), "", 1, 20)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})
}
