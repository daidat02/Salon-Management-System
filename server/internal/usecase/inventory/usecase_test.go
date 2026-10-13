package inventory

import (
	"context"
	"errors"
	"testing"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	domain "github.com/daidat02/server/internal/domain/inventory"
	orderdomain "github.com/daidat02/server/internal/domain/order"
	"github.com/daidat02/server/pkg/apperror"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func withOrgCtx(orgID string) context.Context {
	return context.WithValue(context.Background(), middlewares.OrgIdKey, orgID)
}

func productsOK() *MockInventoryProducts {
	c := new(MockInventoryProducts)
	c.On("ProductsExistInOrg", mock.Anything, "org-123", mock.Anything).
		Return([]string{}, nil)
	return c
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

func TestInventoryUsecase_GetTransactionsByOrgID(t *testing.T) {
	txs := []*domain.InventoryTransaction{
		{ID: "tx-1", OrganizationID: "org-123", ProductID: "prod-1", Type: domain.TypeImport, Quantity: 10},
		{ID: "tx-2", OrganizationID: "org-123", ProductID: "prod-1", Type: domain.TypeExport, Quantity: -2},
	}

	t.Run("Thành công - Lịch sử phân trang", func(t *testing.T) {
		mockRepo := new(MockInventoryRepository)
		mockRepo.On("GetTransactionsByOrgID", mock.Anything, "org-123", "prod-1", mock.Anything, mock.Anything).
			Return(txs, nil)
		mockRepo.On("CountTransactionsByOrgID", mock.Anything, "org-123", "prod-1").
			Return(int64(2), nil)

		uc := NewInventoryUsecase(mockRepo, productsOK())
		res, err := uc.GetTransactionsByOrgID(withOrgCtx("org-123"), "prod-1", 1, 20)

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Len(t, res.Data, 2)
		assert.Equal(t, int64(2), res.Total)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Thất bại - Thiếu organization_id", func(t *testing.T) {
		uc := NewInventoryUsecase(new(MockInventoryRepository), productsOK())
		res, err := uc.GetTransactionsByOrgID(context.Background(), "prod-1", 1, 20)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})
}

func TestInventoryUsecase_GetLowStockProducts(t *testing.T) {
	items := []*domain.LowStockItem{
		{ProductID: "prod-1", SKU: "SKU-1", Name: "Dầu gội", StockQuantity: 2, MinStock: 5},
	}

	t.Run("Thành công - Danh sách tồn thấp", func(t *testing.T) {
		mockRepo := new(MockInventoryRepository)
		mockRepo.On("GetLowStockProducts", mock.Anything, "org-123", mock.Anything, mock.Anything).
			Return(items, nil)
		mockRepo.On("CountLowStockProducts", mock.Anything, "org-123").
			Return(int64(1), nil)

		uc := NewInventoryUsecase(mockRepo, productsOK())
		res, err := uc.GetLowStockProducts(withOrgCtx("org-123"), 1, 20)

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Len(t, res.Data, 1)
		assert.Equal(t, int64(1), res.Total)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Thất bại - Lỗi DB khi đếm", func(t *testing.T) {
		mockRepo := new(MockInventoryRepository)
		mockRepo.On("GetLowStockProducts", mock.Anything, "org-123", mock.Anything, mock.Anything).
			Return(items, nil)
		mockRepo.On("CountLowStockProducts", mock.Anything, "org-123").
			Return(int64(0), errors.New("db count failed"))

		uc := NewInventoryUsecase(mockRepo, productsOK())
		res, err := uc.GetLowStockProducts(withOrgCtx("org-123"), 1, 20)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
	})
}

func TestInventoryUsecase_GetTransactionsByProductID(t *testing.T) {
	txs := []*domain.InventoryTransactionResponse{
		{ID: "tx-1", OrganizationID: "org-123", ProductID: "prod-1", Type: domain.TypeImport, Quantity: 10, DocumentCode: strPtr("NK-001")},
		{ID: "tx-2", OrganizationID: "org-123", ProductID: "prod-1", Type: domain.TypeSale, Quantity: -1, OrderCode: strPtr("HD-001")},
	}

	t.Run("Thành công - Lịch sử theo sản phẩm kèm filter", func(t *testing.T) {
		mockRepo := new(MockInventoryRepository)
		mockRepo.On("GetInventoryTransactionsByProdID", mock.Anything, "org-123", "prod-1", mock.Anything, mock.Anything, "created_desc", "sale", "2026-09-25").
			Return(txs, nil)
		mockRepo.On("CountInventoryTransactionsByProdID", mock.Anything, "org-123", "prod-1").
			Return(int64(2), nil)

		uc := NewInventoryUsecase(mockRepo, productsOK())
		res, err := uc.GetTransactionsByProductID(withOrgCtx("org-123"), "prod-1", 1, 20, "created_desc", "sale", "2026-09-25")

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Len(t, res.Data, 2)
		assert.Equal(t, int64(2), res.Total)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Thất bại - Thiếu organization_id", func(t *testing.T) {
		uc := NewInventoryUsecase(new(MockInventoryRepository), productsOK())
		res, err := uc.GetTransactionsByProductID(context.Background(), "prod-1", 1, 20, "", "", "")

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Lỗi DB khi lấy danh sách", func(t *testing.T) {
		mockRepo := new(MockInventoryRepository)
		mockRepo.On("GetInventoryTransactionsByProdID", mock.Anything, "org-123", "prod-1", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(nil, errors.New("db query failed"))

		uc := NewInventoryUsecase(mockRepo, productsOK())
		res, err := uc.GetTransactionsByProductID(withOrgCtx("org-123"), "prod-1", 1, 20, "", "", "")

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
	})

	t.Run("Thất bại - Lỗi DB khi đếm", func(t *testing.T) {
		mockRepo := new(MockInventoryRepository)
		mockRepo.On("GetInventoryTransactionsByProdID", mock.Anything, "org-123", "prod-1", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(txs, nil)
		mockRepo.On("CountInventoryTransactionsByProdID", mock.Anything, "org-123", "prod-1").
			Return(int64(0), errors.New("db count failed"))

		uc := NewInventoryUsecase(mockRepo, productsOK())
		res, err := uc.GetTransactionsByProductID(withOrgCtx("org-123"), "prod-1", 1, 20, "", "", "")

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
	})
}

func strPtr(s string) *string { return &s }

func f64Ptr(v float64) *float64 { return &v }

func TestInventoryUsecase_CreateDocument_Units(t *testing.T) {
	netUnits := map[string]orderdomain.ProductUnit{
		"prod-1": {Unit: "chai", NetUnit: strPtr("ml"), NetAmount: f64Ptr(1000)},
	}
	netPricing := map[string]orderdomain.ProductPricing{
		"prod-1": {SellPrice: 200000, CostPrice: 120000},
	}
	productsStub := func() *MockInventoryProducts {
		p := new(MockInventoryProducts)
		p.On("ProductsExistInOrg", mock.Anything, "org-123", mock.Anything).
			Return([]string{}, nil)
		p.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).Return(netUnits, nil)
		p.On("GetProductPricing", mock.Anything, "org-123", mock.Anything).Return(netPricing, nil)
		return p
	}
	newReq := func(docType string, qty float64, unit string, price float64) *domain.CreateDocumentRequest {
		return &domain.CreateDocumentRequest{
			DocumentCode: "NK-001",
			Type:         docType,
			Items: []domain.DocumentItemInput{
				{ProductID: "prod-1", Quantity: qty, Unit: unit, UnitPrice: price},
			},
		}
	}

	t.Run("Thành công - nhập 2 chai quy về 2000ml, giá chia hệ số", func(t *testing.T) {
		repo := new(MockInventoryRepository)
		var gotItems []*domain.DocumentItemInput
		repo.On("CreateDocument", mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotItems = args.Get(2).([]*domain.DocumentItemInput)
			}).Return(nil)

		uc := NewInventoryUsecase(repo, productsStub())
		res, err := uc.CreateDocument(withOrgCtx("org-123"), newReq(domain.TypeImport, 2, "chai", 100000))

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Len(t, gotItems, 1)
		assert.Equal(t, 2000.0, gotItems[0].Quantity)
		assert.Equal(t, 100.0, gotItems[0].UnitPrice)
		assert.Equal(t, "chai", gotItems[0].Unit)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - xuất lấy giá vốn server, bỏ giá client", func(t *testing.T) {
		repo := new(MockInventoryRepository)
		var gotItems []*domain.DocumentItemInput
		repo.On("CreateDocument", mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotItems = args.Get(2).([]*domain.DocumentItemInput)
			}).Return(nil)

		uc := NewInventoryUsecase(repo, productsStub())
		res, err := uc.CreateDocument(withOrgCtx("org-123"), newReq(domain.TypeExport, 500, "ml", 999999))

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Len(t, gotItems, 1)
		assert.Equal(t, 500.0, gotItems[0].Quantity)
		assert.Equal(t, 120.0, gotItems[0].UnitPrice)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - đơn vị lạ", func(t *testing.T) {
		uc := NewInventoryUsecase(new(MockInventoryRepository), productsStub())
		res, err := uc.CreateDocument(withOrgCtx("org-123"), newReq(domain.TypeImport, 1, "thùng", 100000))

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - sản phẩm khác tổ chức", func(t *testing.T) {
		repo := new(MockInventoryRepository)
		products := new(MockInventoryProducts)
		products.On("ProductsExistInOrg", mock.Anything, "org-123", mock.Anything).
			Return([]string{"prod-1"}, nil)

		uc := NewInventoryUsecase(repo, products)
		res, err := uc.CreateDocument(withOrgCtx("org-123"), newReq(domain.TypeImport, 1, "chai", 100000))

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
	})
}
