package customer

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	appointmentDomain "github.com/daidat02/server/internal/domain/appointment"
	domain "github.com/daidat02/server/internal/domain/customer"
	orderDomain "github.com/daidat02/server/internal/domain/order"
	"github.com/daidat02/server/pkg/apperror"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func withOrgCtx(orgID string) context.Context {
	return context.WithValue(context.Background(), middlewares.OrgIdKey, orgID)
}

func validCustomer() *domain.Customer {
	birth := time.Date(1995, 5, 20, 0, 0, 0, 0, time.UTC)
	return &domain.Customer{
		FullName:  "Nguyễn Thị C",
		Phone:     "0912345678",
		Gender:    domain.GenderFemale,
		BirthDate: &birth,
		Note:      "Khách VIP",
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

func TestCustomerUsecase_CreateCustomer(t *testing.T) {
	tests := []struct {
		name          string
		ctx           context.Context
		input         *domain.Customer
		mockReturnErr error
		callRepo      bool
		expectedError bool
		expectedCode  int
	}{
		{
			name:          "Thành công - Tạo khách hàng mới hợp lệ",
			ctx:           withOrgCtx("org-123"),
			input:         validCustomer(),
			mockReturnErr: nil,
			callRepo:      true,
			expectedError: false,
		},
		{
			name:          "Thất bại - Thiếu organization_id trong context",
			ctx:           context.Background(),
			input:         validCustomer(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (thiếu tên)",
			ctx:  withOrgCtx("org-123"),
			input: func() *domain.Customer {
				c := validCustomer()
				c.FullName = ""
				return c
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (thiếu phone)",
			ctx:  withOrgCtx("org-123"),
			input: func() *domain.Customer {
				c := validCustomer()
				c.Phone = ""
				return c
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (giới tính không hợp lệ)",
			ctx:  withOrgCtx("org-123"),
			input: func() *domain.Customer {
				c := validCustomer()
				c.Gender = "unknown"
				return c
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Trùng phone trong org (unique)",
			ctx:           withOrgCtx("org-123"),
			input:         validCustomer(),
			mockReturnErr: errors.New("duplicate key value violates unique constraint"),
			callRepo:      true,
			expectedError: true,
			expectedCode:  500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockCustomerRepository)
			if tt.callRepo {
				mockRepo.On("CreateCustomer", mock.Anything, mock.Anything).Return(tt.mockReturnErr)
			}

			uc := NewCustomerUsecase(mockRepo, new(MockHistoryStore), new(MockOrderHistoryStore))
			res, err := uc.CreateCustomer(tt.ctx, tt.input)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
				if tt.callRepo {
					mockRepo.AssertExpectations(t)
				} else {
					mockRepo.AssertNotCalled(t, "CreateCustomer", mock.Anything, mock.Anything)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, res)
				assert.NotEmpty(t, res.ID)
				assert.Equal(t, "org-123", res.OrganizationID)
				assert.Equal(t, tt.input.FullName, res.FullName)
				assert.Equal(t, tt.input.Phone, res.Phone)
				assert.Equal(t, tt.input.Gender, res.Gender)
				assert.Equal(t, tt.input.Note, res.Note)
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

func TestCustomerUsecase_GetCustomersByOrgID(t *testing.T) {
	now := time.Now()
	customerList := []*domain.Customer{
		{ID: "cus-1", OrganizationID: "org-123", FullName: "Nguyễn Thị C", Phone: "0912345678", Gender: domain.GenderFemale, TotalSpent: 1500000, TotalVisits: 5, CreatedAt: &now, UpdatedAt: &now},
		{ID: "cus-2", OrganizationID: "org-123", FullName: "Lê Văn D", Phone: "0987654321", Gender: domain.GenderMale, TotalSpent: 500000, TotalVisits: 2, CreatedAt: &now, UpdatedAt: &now},
	}

	tests := []struct {
		name          string
		ctx           context.Context
		page          int
		pageSize      int
		search        string
		mockReturn    []*domain.Customer
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
			name: "Thành công - Lấy danh sách khách hàng phân trang", ctx: withOrgCtx("org-123"),
			page: 1, pageSize: 20, search: "", mockReturn: customerList, mockTotal: 2,
			callRepo: true, callCount: true, expectedError: false, expectedLen: 2, expectedTotal: 2,
		},
		{
			name: "Thành công - Tìm kiếm theo tên", ctx: withOrgCtx("org-123"),
			page: 1, pageSize: 20, search: "Nguyễn", mockReturn: customerList[:1], mockTotal: 1,
			callRepo: true, callCount: true, expectedError: false, expectedLen: 1, expectedTotal: 1,
		},
		{
			name: "Thành công - Tìm kiếm theo phone", ctx: withOrgCtx("org-123"),
			page: 1, pageSize: 20, search: "0912", mockReturn: customerList[:1], mockTotal: 1,
			callRepo: true, callCount: true, expectedError: false, expectedLen: 1, expectedTotal: 1,
		},
		{
			name: "Thành công - Danh sách rỗng", ctx: withOrgCtx("org-123"),
			page: 1, pageSize: 20, search: "", mockReturn: []*domain.Customer{}, mockTotal: 0,
			callRepo: true, callCount: true, expectedError: false, expectedLen: 0, expectedTotal: 0,
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
			page: 1, pageSize: 20, mockReturn: customerList, mockCountErr: errors.New("db count failed"),
			callRepo: true, callCount: true, expectedError: true, expectedCode: 500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockCustomerRepository)
			if tt.callRepo {
				mockRepo.On("GetCustomersByOrgID", mock.Anything, "org-123", tt.search, mock.Anything, mock.Anything).
					Return(tt.mockReturn, tt.mockListErr)
			}
			if tt.callCount {
				mockRepo.On("CountCustomersByOrgID", mock.Anything, "org-123", tt.search).
					Return(tt.mockTotal, tt.mockCountErr)
			}

			uc := NewCustomerUsecase(mockRepo, new(MockHistoryStore), new(MockOrderHistoryStore))
			res, err := uc.GetCustomersByOrgID(tt.ctx, tt.page, tt.pageSize, tt.search)

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
				for i := range res.Data {
					assert.Equal(t, "org-123", res.Data[i].OrganizationID)
				}
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestCustomerUsecase_UpdateCustomer(t *testing.T) {
	tests := []struct {
		name          string
		ctx           context.Context
		id            string
		input         *domain.Customer
		mockReturnErr error
		callRepo      bool
		expectedError bool
		expectedCode  int
	}{
		{
			name: "Thành công - Cập nhật khách hàng", ctx: withOrgCtx("org-123"),
			id: "cus-1", input: validCustomer(), callRepo: true, expectedError: false,
		},
		{
			name: "Thất bại - Thiếu id", ctx: withOrgCtx("org-123"),
			id: "", input: validCustomer(), callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Thiếu organization_id", ctx: context.Background(),
			id: "cus-1", input: validCustomer(), callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Validate (thiếu phone)", ctx: withOrgCtx("org-123"),
			id: "cus-1",
			input: func() *domain.Customer {
				c := validCustomer()
				c.Phone = ""
				return c
			}(),
			callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Không tìm thấy khách hàng", ctx: withOrgCtx("org-123"),
			id: "cus-missing", input: validCustomer(), mockReturnErr: domain.ErrCustomerNotFound,
			callRepo: true, expectedError: true, expectedCode: 404,
		},
		{
			name: "Thất bại - Lỗi DB", ctx: withOrgCtx("org-123"),
			id: "cus-1", input: validCustomer(), mockReturnErr: errors.New("db error"),
			callRepo: true, expectedError: true, expectedCode: 500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockCustomerRepository)
			if tt.callRepo {
				mockRepo.On("UpdateCustomer", mock.Anything, mock.Anything).Return(tt.mockReturnErr)
			}

			uc := NewCustomerUsecase(mockRepo, new(MockHistoryStore), new(MockOrderHistoryStore))
			res, err := uc.UpdateCustomer(tt.ctx, tt.id, tt.input)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, res)
				assert.Equal(t, tt.id, res.ID)
				assert.Equal(t, "org-123", res.OrganizationID)
				assert.Equal(t, tt.input.FullName, res.FullName)
				assert.Equal(t, tt.input.Phone, res.Phone)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestCustomerUsecase_DeleteCustomer(t *testing.T) {
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
			name: "Thành công - Xóa mềm khách hàng", ctx: withOrgCtx("org-123"),
			id: "cus-1", callRepo: true, expectedError: false,
		},
		{
			name: "Thất bại - Thiếu id", ctx: withOrgCtx("org-123"),
			id: "", callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Thiếu organization_id", ctx: context.Background(),
			id: "cus-1", callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Không tìm thấy khách hàng", ctx: withOrgCtx("org-123"),
			id: "cus-missing", mockReturnErr: domain.ErrCustomerNotFound,
			callRepo: true, expectedError: true, expectedCode: 404,
		},
		{
			name: "Thất bại - Lỗi DB", ctx: withOrgCtx("org-123"),
			id: "cus-1", mockReturnErr: errors.New("db error"),
			callRepo: true, expectedError: true, expectedCode: 500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockCustomerRepository)
			if tt.callRepo {
				mockRepo.On("DeleteCustomer", mock.Anything, "org-123", tt.id).Return(tt.mockReturnErr)
			}

			uc := NewCustomerUsecase(mockRepo, new(MockHistoryStore), new(MockOrderHistoryStore))
			deletedID, err := uc.DeleteCustomer(tt.ctx, tt.id)

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

func TestCustomerUsecase_GetCustomerByPhoneNumber(t *testing.T) {
	now := time.Now()
	found := &domain.Customer{
		ID: "cus-1", OrganizationID: "org-123", FullName: "Nguyễn Thị C",
		Phone: "0912345678", Gender: domain.GenderFemale,
		TotalSpent: 1500000, TotalVisits: 5, CreatedAt: &now, UpdatedAt: &now,
	}

	tests := []struct {
		name          string
		ctx           context.Context
		phone         string
		mockReturn    *domain.Customer
		mockErr       error
		callRepo      bool
		expectedError bool
		expectedCode  int
	}{
		{
			name: "Thành công - Tìm thấy khách theo phone", ctx: withOrgCtx("org-123"),
			phone: "0912345678", mockReturn: found, callRepo: true, expectedError: false,
		},
		{
			name: "Thất bại - Thiếu organization_id", ctx: context.Background(),
			phone: "0912345678", callRepo: false, expectedError: true, expectedCode: 400,
		},
		{
			name: "Thất bại - Không tìm thấy khách hàng", ctx: withOrgCtx("org-123"),
			phone: "0900000000", mockErr: domain.ErrCustomerNotFound,
			callRepo: true, expectedError: true, expectedCode: 404,
		},
		{
			name: "Thất bại - Lỗi DB", ctx: withOrgCtx("org-123"),
			phone: "0912345678", mockErr: errors.New("db error"),
			callRepo: true, expectedError: true, expectedCode: 500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockCustomerRepository)
			if tt.callRepo {
				mockRepo.On("GetCustomerByPhone", mock.Anything, "org-123", tt.phone).
					Return(tt.mockReturn, tt.mockErr)
			}

			uc := NewCustomerUsecase(mockRepo, new(MockHistoryStore), new(MockOrderHistoryStore))
			res, err := uc.GetCustomerByPhoneNumber(tt.ctx, tt.phone)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, res)
				assert.Equal(t, "cus-1", res.ID)
				assert.Equal(t, "org-123", res.OrganizationID)
				assert.Equal(t, tt.phone, res.Phone)
				assert.Equal(t, found.FullName, res.FullName)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestCustomerUsecase_GetCustomerDetail(t *testing.T) {
	details := &domain.CustomerDetailsResponse{
		ID: "cus-1", OrganizationID: "org-123", FullName: "Nguyễn Thị C",
		Phone: "0912345678", TotalSpent: 1500000, TotalVisits: 5,
		SpendingByMonth: []domain.SpendByMonth{
			{Month: "2026-09", TotalSpent: 500000, TotalOrders: 1},
		},
	}

	t.Run("Thành công - Chi tiết kèm chi tiêu tháng + lịch sử hẹn", func(t *testing.T) {
		mockRepo := new(MockCustomerRepository)
		mockRepo.On("GetCustomerDetailByID", mock.Anything, "org-123", "cus-1").
			Return(details, nil)
		mockHistory := new(MockHistoryStore)
		mockHistory.On("GetAppointmentsByCustomerID", mock.Anything, "org-123", "cus-1", mock.Anything, mock.Anything).
			Return([]*appointmentDomain.AppointmentResponse{}, nil)
		mockHistory.On("CountAppointmentsByCustomerID", mock.Anything, "org-123", "cus-1").
			Return(int64(0), nil)
		mockOrders := new(MockOrderHistoryStore)
		mockOrders.On("ListHistoriesOrderByCustomerId", mock.Anything, "org-123", "cus-1", mock.Anything, mock.Anything).
			Return([]*orderDomain.Order{
				{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", TotalAmount: 300000, Status: "completed"},
			}, nil)
		mockOrders.On("CountHistoriesOrderByCustomerId", mock.Anything, "org-123", "cus-1").
			Return(int64(1), nil)

		uc := NewCustomerUsecase(mockRepo, mockHistory, mockOrders)
		res, err := uc.GetCustomerDetail(withOrgCtx("org-123"), "cus-1", 1, 10, 1, 10)

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, "cus-1", res.Customer.ID)
		assert.Len(t, res.Customer.SpendingByMonth, 1)
		assert.Equal(t, "2026-09", res.Customer.SpendingByMonth[0].Month)
		assert.Len(t, res.Orders.Data, 1)
		assert.Equal(t, "ORD-1", res.Orders.Data[0].Code)
		assert.Equal(t, int64(1), res.Orders.Total)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Thất bại - Không tìm thấy khách hàng", func(t *testing.T) {
		mockRepo := new(MockCustomerRepository)
		mockRepo.On("GetCustomerDetailByID", mock.Anything, "org-123", "cus-x").
			Return(nil, domain.ErrCustomerNotFound)

		uc := NewCustomerUsecase(mockRepo, new(MockHistoryStore), new(MockOrderHistoryStore))
		res, err := uc.GetCustomerDetail(withOrgCtx("org-123"), "cus-x", 1, 10, 1, 10)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
		mockRepo.AssertExpectations(t)
	})
}

func TestCustomerUsecase_GetCustomerStats(t *testing.T) {
	stats := &domain.CustomerStatsResponse{
		TotalCustomer: 100, TotalNewCustomer: 100,
		TotalNewCustomerLastMonth: 0, TotalOutstandingPoints: 150,
	}

	t.Run("Thành công - Thống kê tệp khách", func(t *testing.T) {
		mockRepo := new(MockCustomerRepository)
		mockRepo.On("GetCustomerStats", mock.Anything, "org-123").
			Return(stats, nil)

		uc := NewCustomerUsecase(mockRepo, new(MockHistoryStore), new(MockOrderHistoryStore))
		res, err := uc.GetCustomerStats(withOrgCtx("org-123"))

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, int64(100), res.TotalCustomer)
		assert.Equal(t, int64(150), res.TotalOutstandingPoints)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Thất bại - Thiếu organization_id", func(t *testing.T) {
		uc := NewCustomerUsecase(new(MockCustomerRepository), new(MockHistoryStore), new(MockOrderHistoryStore))
		res, err := uc.GetCustomerStats(context.Background())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Lỗi DB", func(t *testing.T) {
		mockRepo := new(MockCustomerRepository)
		mockRepo.On("GetCustomerStats", mock.Anything, "org-123").
			Return(nil, errors.New("db error"))

		uc := NewCustomerUsecase(mockRepo, new(MockHistoryStore), new(MockOrderHistoryStore))
		res, err := uc.GetCustomerStats(withOrgCtx("org-123"))

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
		mockRepo.AssertExpectations(t)
	})
}
