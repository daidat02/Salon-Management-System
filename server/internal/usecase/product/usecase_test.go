package product

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	domain "github.com/daidat02/server/internal/domain/product"
	"github.com/daidat02/server/pkg/apperror"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func withOrgCtx(orgID string) context.Context {
	return context.WithValue(context.Background(), middlewares.OrgIdKey, orgID)
}

func validProduct() *domain.Product {
	catID := "cat-1"
	return &domain.Product{
		CategoryID:    &catID,
		SKU:           "DG-BUOI-500",
		Name:          "Dầu gội bưởi 500ml",
		Unit:          "chai",
		ProductType:   domain.ProductTypeRetail,
		ShowOnWeb:     true,
		CostPrice:     80000,
		SellPrice:     150000,
		StockQuantity: 50,
		MinStock:      5,
		IsActive:      true,
	}
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

func TestProductUsecase_CreateProduct(t *testing.T) {
	tests := []struct {
		name          string
		ctx           context.Context
		input         *domain.Product
		mockReturnErr error
		callRepo      bool
		expectedError bool
		expectedCode  int
	}{
		{
			name: "Thành công - Tạo sản phẩm bán lẻ", ctx: withOrgCtx("org-123"),
			input: validProduct(), callRepo: true, expectedError: false,
		},
		{
			name: "Thành công - Bỏ trống type thì mặc định retail", ctx: withOrgCtx("org-123"),
			input: func() *domain.Product {
				p := validProduct()
				p.ProductType = ""
				return p
			}(),
			callRepo: true, expectedError: false,
		},
		{
			name: "Thất bại - Thiếu organization_id", ctx: context.Background(),
			input: validProduct(), callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Validate (thiếu SKU)", ctx: withOrgCtx("org-123"),
			input: func() *domain.Product {
				p := validProduct()
				p.SKU = ""
				return p
			}(),
			callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Validate (thiếu tên)", ctx: withOrgCtx("org-123"),
			input: func() *domain.Product {
				p := validProduct()
				p.Name = ""
				return p
			}(),
			callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Validate (type không hợp lệ)", ctx: withOrgCtx("org-123"),
			input: func() *domain.Product {
				p := validProduct()
				p.ProductType = "unknown"
				return p
			}(),
			callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Validate (giá bán âm)", ctx: withOrgCtx("org-123"),
			input: func() *domain.Product {
				p := validProduct()
				p.SellPrice = -1000
				return p
			}(),
			callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Trùng SKU trong org (unique)", ctx: withOrgCtx("org-123"),
			input: validProduct(), mockReturnErr: errors.New("duplicate key value violates unique constraint"),
			callRepo: true, expectedError: true, expectedCode: 500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockProductRepository)
			if tt.callRepo {
				mockRepo.On("CreateProduct", mock.Anything, mock.Anything).Return(tt.mockReturnErr)
			}

			uc := NewProductUsecase(mockRepo)
			res, err := uc.CreateProduct(tt.ctx, tt.input)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, res)
				assert.NotEmpty(t, res.ID)
				assert.Equal(t, "org-123", res.OrganizationID)
				assert.Equal(t, tt.input.SKU, res.SKU)
				assert.Equal(t, tt.input.Name, res.Name)
				assert.Equal(t, domain.ProductTypeRetail, res.ProductType)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestProductUsecase_GetProductsByOrgID(t *testing.T) {
	categoryName := "Chăm sóc tóc"
	productList := []*domain.Product{
		{ID: "prod-1", OrganizationID: "org-123", SKU: "DG-BUOI-500", Name: "Dầu gội bưởi", CategoryName: &categoryName, RevenueThisMonth: 1500000, ProductType: domain.ProductTypeRetail, SellPrice: 150000, IsActive: true},
		{ID: "prod-2", OrganizationID: "org-123", SKU: "THUOC-DEN", Name: "Thuốc nhuộm đen", ProductType: domain.ProductTypeMaterial, SellPrice: 0, IsActive: true},
	}

	tests := []struct {
		name          string
		ctx           context.Context
		categoryID    string
		page          int
		pageSize      int
		mockReturn    []*domain.Product
		mockTotal     int64
		mockListErr   error
		mockCountErr  error
		callRepo      bool
		callCount     bool
		expectedError bool
		expectedCode  int
		expectedLen   int
		expectedTotal int64
	}{
		{
			name: "Thành công - Lấy danh sách phân trang", ctx: withOrgCtx("org-123"),
			page: 1, pageSize: 20, mockReturn: productList, mockTotal: 2,
			callRepo: true, callCount: true, expectedError: false, expectedLen: 2, expectedTotal: 2,
		},
		{
			name: "Thành công - Lọc theo danh mục", ctx: withOrgCtx("org-123"),
			categoryID: "550e8400-e29b-41d4-a716-446655440000",
			page:       1, pageSize: 20, mockReturn: productList, mockTotal: 2,
			callRepo: true, callCount: true, expectedError: false, expectedLen: 2, expectedTotal: 2,
		},
		{
			name: "Thành công - Danh sách rỗng", ctx: withOrgCtx("org-123"),
			page: 1, pageSize: 20, mockReturn: []*domain.Product{}, mockTotal: 0,
			callRepo: true, callCount: true, expectedError: false, expectedLen: 0, expectedTotal: 0,
		},
		{
			name: "Thất bại - category_id không hợp lệ", ctx: withOrgCtx("org-123"),
			categoryID: "not-a-uuid",
			page:       1, pageSize: 20, callRepo: false, callCount: false,
			expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Thiếu organization_id", ctx: context.Background(),
			page: 1, pageSize: 20, callRepo: false, callCount: false,
			expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Lỗi DB khi lấy danh sách", ctx: withOrgCtx("org-123"),
			page: 1, pageSize: 20, mockListErr: errors.New("db connection refused"),
			callRepo: true, callCount: false, expectedError: true, expectedCode: 500,
		},
		{
			name: "Thất bại - Lỗi DB khi đếm", ctx: withOrgCtx("org-123"),
			page: 1, pageSize: 20, mockReturn: productList, mockCountErr: errors.New("db count failed"),
			callRepo: true, callCount: true, expectedError: true, expectedCode: 500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockProductRepository)
			if tt.callRepo {
				mockRepo.On("GetProductsByOrgID", mock.Anything, "org-123", mock.Anything, mock.Anything, tt.categoryID, mock.Anything, mock.Anything, mock.Anything).
					Return(tt.mockReturn, tt.mockListErr)
			}
			if tt.callCount {
				mockRepo.On("CountProductsByOrgID", mock.Anything, "org-123", mock.Anything, mock.Anything, tt.categoryID).
					Return(tt.mockTotal, tt.mockCountErr)
			}

			uc := NewProductUsecase(mockRepo)
			res, err := uc.GetProductsByOrgID(tt.ctx, "", "", tt.categoryID, "created_at_desc", tt.page, tt.pageSize)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, res)
				assert.NotNil(t, res.Data)
				assert.Len(t, res.Data, tt.expectedLen)
				assert.Equal(t, tt.expectedTotal, res.Total)
				if tt.expectedLen > 0 {
					assert.Equal(t, &categoryName, res.Data[0].CategoryName)
					assert.Equal(t, float64(1500000), res.Data[0].RevenueThisMonth)
				}
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestProductUsecase_GetProductByID(t *testing.T) {
	categoryName := "Dầu gội"
	netUnit := "ml"
	netAmount := 500.0
	now := time.Now().UTC()
	currentMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	previousMonth := currentMonth.AddDate(0, -1, 0)

	product := &domain.Product{
		ID:               "prod-1",
		OrganizationID:   "org-123",
		CategoryName:     &categoryName,
		SKU:              "DG-BUOI-500",
		Name:             "Dầu gội bưởi",
		Unit:             "chai",
		NetUnit:          &netUnit,
		NetAmount:        &netAmount,
		ProductType:      domain.ProductTypeRetail,
		CostPrice:        80000,
		SellPrice:        150000,
		StockQuantity:    25000,
		MinStock:         2500,
		IsActive:         true,
		RevenueThisMonth: 0,
	}
	sales := []domain.ProductMonthlySales{
		{MonthStart: currentMonth, Quantity: 12, Revenue: 1800000},
		{MonthStart: previousMonth, Quantity: 8, Revenue: 1200000},
	}

	tests := []struct {
		name          string
		ctx           context.Context
		id            string
		product       *domain.Product
		sales         []domain.ProductMonthlySales
		productErr    error
		salesErr      error
		callProduct   bool
		callSales     bool
		expectedError bool
		expectedCode  int
	}{
		{
			name: "Thành công - Lấy chi tiết sản phẩm", ctx: withOrgCtx("org-123"), id: "prod-1",
			product: product, sales: sales, callProduct: true, callSales: true,
		},
		{
			name: "Thất bại - Thiếu id", ctx: withOrgCtx("org-123"), id: "",
			expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Thiếu organization_id", ctx: context.Background(), id: "prod-1",
			expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Không tìm thấy sản phẩm", ctx: withOrgCtx("org-123"), id: "prod-1",
			productErr: domain.ErrProductNotFound, callProduct: true,
			expectedError: true, expectedCode: 404,
		},
		{
			name: "Thất bại - Lỗi DB khi lấy sản phẩm", ctx: withOrgCtx("org-123"), id: "prod-1",
			productErr: errors.New("db error"), callProduct: true,
			expectedError: true, expectedCode: 500,
		},
		{
			name: "Thất bại - Lỗi DB khi lấy doanh số", ctx: withOrgCtx("org-123"), id: "prod-1",
			product: product, salesErr: errors.New("db error"), callProduct: true, callSales: true,
			expectedError: true, expectedCode: 500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockProductRepository)
			if tt.callProduct {
				mockRepo.On("GetProductByID", mock.Anything, "org-123", tt.id).
					Return(tt.product, tt.productErr)
			}
			if tt.callSales {
				mockRepo.On("GetProductSalesLastMonths", mock.Anything, "org-123", tt.id, 6).
					Return(tt.sales, tt.salesErr)
			}

			uc := NewProductUsecase(mockRepo)
			res, err := uc.GetProductByID(tt.ctx, tt.id)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, res)
				assert.Equal(t, "prod-1", res.ID)
				assert.Equal(t, &categoryName, res.CategoryName)
				assert.Equal(t, float64(50), res.StockQuantity)
				assert.Equal(t, float64(5), res.MinStock)
				assert.Equal(t, float64(12), res.SoldThisMonth)
				assert.Equal(t, float64(1800000), res.RevenueThisMonth)
				assert.Len(t, res.RevenueLast6Months, 6)
				assert.Equal(t, float64(1800000), res.RevenueLast6Months[5].Revenue)
				assert.Equal(t, float64(1200000), res.RevenueLast6Months[4].Revenue)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestProductUsecase_UpdateProduct(t *testing.T) {
	tests := []struct {
		name          string
		ctx           context.Context
		id            string
		input         *domain.Product
		mockReturnErr error
		callRepo      bool
		expectedError bool
		expectedCode  int
	}{
		{
			name: "Thành công - Cập nhật sản phẩm", ctx: withOrgCtx("org-123"),
			id: "prod-1", input: validProduct(), callRepo: true, expectedError: false,
		},
		{
			name: "Thất bại - Thiếu id", ctx: withOrgCtx("org-123"),
			id: "", input: validProduct(), callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Thiếu organization_id", ctx: context.Background(),
			id: "prod-1", input: validProduct(), callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Validate (tồn kho âm)", ctx: withOrgCtx("org-123"),
			id: "prod-1",
			input: func() *domain.Product {
				p := validProduct()
				p.StockQuantity = -5
				return p
			}(),
			callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Không tìm thấy sản phẩm", ctx: withOrgCtx("org-123"),
			id: "prod-missing", input: validProduct(), mockReturnErr: domain.ErrProductNotFound,
			callRepo: true, expectedError: true, expectedCode: 404,
		},
		{
			name: "Thất bại - Lỗi DB", ctx: withOrgCtx("org-123"),
			id: "prod-1", input: validProduct(), mockReturnErr: errors.New("db error"),
			callRepo: true, expectedError: true, expectedCode: 500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockProductRepository)
			if tt.callRepo {
				mockRepo.On("UpdateProduct", mock.Anything, mock.Anything).Return(tt.mockReturnErr)
			}

			uc := NewProductUsecase(mockRepo)
			res, err := uc.UpdateProduct(tt.ctx, tt.id, tt.input)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, res)
				assert.Equal(t, tt.id, res.ID)
				assert.Equal(t, "org-123", res.OrganizationID)
				assert.Equal(t, tt.input.SKU, res.SKU)
				assert.Equal(t, tt.input.Name, res.Name)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestProductUsecase_DeleteProduct(t *testing.T) {
	tests := []struct {
		name          string
		ctx           context.Context
		id            string
		mockReturnErr error
		callRepo      bool
		expectedError bool
		expectedCode  int
	}{
		{
			name: "Thành công - Xóa sản phẩm", ctx: withOrgCtx("org-123"),
			id: "prod-1", callRepo: true, expectedError: false,
		},
		{
			name: "Thất bại - Thiếu id", ctx: withOrgCtx("org-123"),
			id: "", callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Thiếu organization_id", ctx: context.Background(),
			id: "prod-1", callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Không tìm thấy sản phẩm", ctx: withOrgCtx("org-123"),
			id: "prod-missing", mockReturnErr: domain.ErrProductNotFound,
			callRepo: true, expectedError: true, expectedCode: 404,
		},
		{
			name: "Thất bại - Lỗi DB", ctx: withOrgCtx("org-123"),
			id: "prod-1", mockReturnErr: errors.New("db error"),
			callRepo: true, expectedError: true, expectedCode: 500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockProductRepository)
			if tt.callRepo {
				mockRepo.On("DeleteProduct", mock.Anything, "org-123", tt.id).Return(tt.mockReturnErr)
			}

			uc := NewProductUsecase(mockRepo)
			deletedID, err := uc.DeleteProduct(tt.ctx, tt.id)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Empty(t, deletedID)
				assertFlatAppError(t, err, tt.expectedCode)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.id, deletedID)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestProductUsecase_GetProductStats(t *testing.T) {
	stats := &domain.ProductStatsResponse{
		TotalProducts: 40, OnSaleProducts: 38,
		LowStockProducts: 2, RetailRevenueMonth: 1500000,
	}

	t.Run("Thành công - Thống kê sản phẩm", func(t *testing.T) {
		mockRepo := new(MockProductRepository)
		mockRepo.On("GetProductStats", mock.Anything, "org-123").
			Return(stats, nil)

		uc := NewProductUsecase(mockRepo)
		res, err := uc.GetProductStats(withOrgCtx("org-123"))

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, int64(40), res.TotalProducts)
		assert.Equal(t, int64(2), res.LowStockProducts)
		assert.Equal(t, float64(1500000), res.RetailRevenueMonth)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Thất bại - Thiếu organization_id", func(t *testing.T) {
		uc := NewProductUsecase(new(MockProductRepository))
		res, err := uc.GetProductStats(context.Background())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Lỗi DB", func(t *testing.T) {
		mockRepo := new(MockProductRepository)
		mockRepo.On("GetProductStats", mock.Anything, "org-123").
			Return(nil, errors.New("db error"))

		uc := NewProductUsecase(mockRepo)
		res, err := uc.GetProductStats(withOrgCtx("org-123"))

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
		mockRepo.AssertExpectations(t)
	})
}
