package order

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	customerdomain "github.com/daidat02/server/internal/domain/customer"
	domain "github.com/daidat02/server/internal/domain/order"
	settingDomain "github.com/daidat02/server/internal/domain/setting"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func withOrgCtx(orgID string) context.Context {
	ctx := context.WithValue(context.Background(), middlewares.OrgIdKey, orgID)
	return context.WithValue(ctx, middlewares.UserIdKey, "user-123")
}

func strP(s string) *string { return &s }

func catalogOK() *MockCatalogChecker {
	c := new(MockCatalogChecker)
	c.On("ServicesExistInOrg", mock.Anything, "org-123", mock.Anything).
		Return([]string{}, nil)
	c.On("ProductsExistInOrg", mock.Anything, "org-123", mock.Anything).
		Return([]string{}, nil)
	return c
}

func productsWithPricing() *MockProductStore {
	p := new(MockProductStore)
	p.On("GetProductPricing", mock.Anything, "org-123", mock.Anything).
		Return(map[string]domain.ProductPricing{"prod-1": {SellPrice: 150000, CostPrice: 90000}}, nil)
	p.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).
		Return(map[string]domain.ProductUnit{"prod-1": {Unit: "chai"}}, nil)
	return p
}

func settingOK() *MockSettingStore {
	s := new(MockSettingStore)
	s.On("GetPaymentMethodByID", mock.Anything, "org-123", mock.Anything).
		Return(&settingDomain.PaymentMethod{ID: "pm-1", FundID: "fund-1", Code: "cash", Name: "Tiền mặt"}, nil)
	return s
}

func stubProductStore() *MockProductStore {
	p := new(MockProductStore)
	p.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).
		Return(map[string]domain.ProductUnit{
			"prod-1": {Unit: "chai"},
			"prod-2": {Unit: "gói"},
		}, nil)
	p.On("GetProductPricing", mock.Anything, "org-123", mock.Anything).
		Return(map[string]domain.ProductPricing{
			"prod-1": {SellPrice: 150000, CostPrice: 90000},
			"prod-2": {SellPrice: 60000, CostPrice: 40000},
		}, nil)
	return p
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

func validProductOrderReq() *domain.CreateOrderRequest {
	return &domain.CreateOrderRequest{
		DiscountAmount: 0,
		Items: []domain.OrderItemInput{
			{ItemType: domain.ItemTypeProduct, ProductID: strP("prod-1"), Quantity: 2},
		},
	}
}

func TestOrderUsecase_CreateOrder(t *testing.T) {
	t.Run("Thành công - Đơn sản phẩm, giá server tính, trừ kho", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.CreateOrder(withOrgCtx("org-123"), validProductOrderReq())

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.NotEmpty(t, res.Code)
		assert.Equal(t, float64(300000), res.SubtotalAmount)
		assert.Equal(t, float64(300000), res.TotalAmount)
		assert.Equal(t, domain.StatusPending, res.Status)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Thiếu organization_id", func(t *testing.T) {
		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.CreateOrder(context.Background(), validProductOrderReq())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Đơn rỗng", func(t *testing.T) {
		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.CreateOrder(withOrgCtx("org-123"), &domain.CreateOrderRequest{})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Giảm giá vượt tổng", func(t *testing.T) {
		repo := new(MockOrderRepository)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := validProductOrderReq()
		req.DiscountAmount = 999999999
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Tồn kho không đủ", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(domain.ErrInsufficientStock)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.CreateOrder(withOrgCtx("org-123"), validProductOrderReq())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Sản phẩm khác tổ chức", func(t *testing.T) {
		catalog := new(MockCatalogChecker)
		catalog.On("ProductsExistInOrg", mock.Anything, "org-123", mock.Anything).
			Return([]string{"prod-x"}, nil)

		uc := NewOrderUsecase(new(MockOrderRepository), catalog, new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := &domain.CreateOrderRequest{
			Items: []domain.OrderItemInput{
				{ItemType: domain.ItemTypeProduct, ProductID: strP("prod-x"), Quantity: 1},
			},
		}
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
	})

	t.Run("Thành công - Snapshot vật tư quy định mức lớn về ml", func(t *testing.T) {
		repo := new(MockOrderRepository)
		var gotMats []*domain.OrderItemMaterial
		var gotDeducts []domain.StockDeduction
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotMats = args.Get(3).([]*domain.OrderItemMaterial)
				gotDeducts = args.Get(4).([]domain.StockDeduction)
			}).Return(nil)

		services := new(MockServiceStore)
		services.On("GetServicePrices", mock.Anything, "org-123", []string{"svc-1"}).Return(map[string]float64{"svc-1": 500000}, nil)
		services.On("GetServiceMaterials", mock.Anything, "org-123", []string{"svc-1"}).Return(
			map[string][]domain.ServiceMaterialUsage{
				"svc-1": {{ProductID: "prod-nhuom", QuantityPerService: 1, UnitCost: 120000, Unit: "tuýp"}},
			}, nil)

		products := new(MockProductStore)
		products.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).Return(
			map[string]domain.ProductUnit{
				"prod-nhuom": {Unit: "tuýp", NetUnit: strP("ml"), NetAmount: f64P(60)},
			}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, services, new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := &domain.CreateOrderRequest{
			Items: []domain.OrderItemInput{
				{ItemType: domain.ItemTypeService, ServiceID: strP("svc-1"), Quantity: 1},
			},
		}
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.Equal(t, float64(500000), res.SubtotalAmount)
		assert.Len(t, gotMats, 1)
		assert.Equal(t, 60.0, gotMats[0].Quantity)
		assert.Equal(t, "ml", gotMats[0].Unit)
		assert.Equal(t, 2000.0, gotMats[0].UnitCostAtTime)
		assert.Len(t, gotDeducts, 1)
		assert.Equal(t, 60.0, gotDeducts[0].Quantity)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - Định mức đã lưu ml thì giữ nguyên", func(t *testing.T) {
		repo := new(MockOrderRepository)
		var gotMats []*domain.OrderItemMaterial
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotMats = args.Get(3).([]*domain.OrderItemMaterial)
			}).Return(nil)

		services := new(MockServiceStore)
		services.On("GetServicePrices", mock.Anything, "org-123", []string{"svc-1"}).Return(map[string]float64{"svc-1": 500000}, nil)
		services.On("GetServiceMaterials", mock.Anything, "org-123", []string{"svc-1"}).Return(
			map[string][]domain.ServiceMaterialUsage{
				"svc-1": {{ProductID: "prod-nhuom", QuantityPerService: 60, UnitCost: 120000, Unit: "ml"}},
			}, nil)

		products := new(MockProductStore)
		products.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).Return(
			map[string]domain.ProductUnit{
				"prod-nhuom": {Unit: "tuýp", NetUnit: strP("ml"), NetAmount: f64P(60)},
			}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, services, new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := &domain.CreateOrderRequest{
			Items: []domain.OrderItemInput{
				{ItemType: domain.ItemTypeService, ServiceID: strP("svc-1"), Quantity: 1},
			},
		}
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.Equal(t, float64(500000), res.SubtotalAmount)
		assert.Len(t, gotMats, 1)
		assert.Equal(t, 60.0, gotMats[0].Quantity)
		assert.Equal(t, "ml", gotMats[0].Unit)
		assert.Equal(t, 2000.0, gotMats[0].UnitCostAtTime)
		repo.AssertExpectations(t)
	})
}

func TestOrderUsecase_CreateOrder_FromAppointment(t *testing.T) {
	newAppointmentUC := func(repo *MockOrderRepository, appts *MockAppointmentStore) *OrderUsecase {
		return NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), appts, new(MockStaffStore), new(MockSettingStore))
	}
	appointmentReq := func() *domain.CreateOrderRequest {
		req := validProductOrderReq()
		req.AppointmentID = strP("appt-1")
		return req
	}

	t.Run("Thành công - Tạo đơn và đưa lịch sang in_progress", func(t *testing.T) {
		repo := new(MockOrderRepository)
		appts := new(MockAppointmentStore)
		appts.On("AppointmentExistsInOrg", mock.Anything, "org-123", "appt-1").Return(true, nil).Once()
		appts.On("GetAppointmentStatus", mock.Anything, "org-123", "appt-1").Return("pending", nil).Once()
		repo.On("FindActiveOrderByAppointment", mock.Anything, "org-123", "appt-1").Return(nil, nil).Once()
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil).Once()
		appts.On("UpdateAppointmentStatus", mock.Anything, "org-123", "appt-1", "in_progress", "").Return(nil).Once()

		res, err := newAppointmentUC(repo, appts).CreateOrder(withOrgCtx("org-123"), appointmentReq())

		assert.NoError(t, err)
		assert.NotNil(t, res)
		appts.AssertExpectations(t)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - Lịch đã in_progress thì không cập nhật lại", func(t *testing.T) {
		repo := new(MockOrderRepository)
		appts := new(MockAppointmentStore)
		appts.On("AppointmentExistsInOrg", mock.Anything, "org-123", "appt-1").Return(true, nil).Once()
		appts.On("GetAppointmentStatus", mock.Anything, "org-123", "appt-1").Return("in_progress", nil).Once()
		repo.On("FindActiveOrderByAppointment", mock.Anything, "org-123", "appt-1").Return(nil, nil).Once()
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil).Once()

		res, err := newAppointmentUC(repo, appts).CreateOrder(withOrgCtx("org-123"), appointmentReq())

		assert.NoError(t, err)
		assert.NotNil(t, res)
		appts.AssertNotCalled(t, "UpdateAppointmentStatus", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Thất bại - Lịch completed/cancelled/no_show", func(t *testing.T) {
		for _, status := range []string{"completed", "cancelled", "no_show"} {
			t.Run(status, func(t *testing.T) {
				repo := new(MockOrderRepository)
				appts := new(MockAppointmentStore)
				appts.On("AppointmentExistsInOrg", mock.Anything, "org-123", "appt-1").Return(true, nil).Once()
				appts.On("GetAppointmentStatus", mock.Anything, "org-123", "appt-1").Return(status, nil).Once()

				res, err := newAppointmentUC(repo, appts).CreateOrder(withOrgCtx("org-123"), appointmentReq())

				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, 400)
				repo.AssertNotCalled(t, "CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
			})
		}
	})

	t.Run("Thất bại - Lịch đã có đơn còn hiệu lực", func(t *testing.T) {
		repo := new(MockOrderRepository)
		appts := new(MockAppointmentStore)
		appts.On("AppointmentExistsInOrg", mock.Anything, "org-123", "appt-1").Return(true, nil).Once()
		appts.On("GetAppointmentStatus", mock.Anything, "org-123", "appt-1").Return("confirmed", nil).Once()
		repo.On("FindActiveOrderByAppointment", mock.Anything, "org-123", "appt-1").
			Return(&domain.Order{ID: "ord-old", Code: "ORD-OLD", Status: domain.StatusPending}, nil).Once()

		res, err := newAppointmentUC(repo, appts).CreateOrder(withOrgCtx("org-123"), appointmentReq())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		assert.Contains(t, err.Error(), "ORD-OLD")
		repo.AssertNotCalled(t, "CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Thành công - Lỗi cập nhật trạng thái lịch chỉ log, đơn vẫn tạo", func(t *testing.T) {
		repo := new(MockOrderRepository)
		appts := new(MockAppointmentStore)
		appts.On("AppointmentExistsInOrg", mock.Anything, "org-123", "appt-1").Return(true, nil).Once()
		appts.On("GetAppointmentStatus", mock.Anything, "org-123", "appt-1").Return("checked_in", nil).Once()
		repo.On("FindActiveOrderByAppointment", mock.Anything, "org-123", "appt-1").Return(nil, nil).Once()
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil).Once()
		appts.On("UpdateAppointmentStatus", mock.Anything, "org-123", "appt-1", "in_progress", "").
			Return(errors.New("db error")).Once()

		res, err := newAppointmentUC(repo, appts).CreateOrder(withOrgCtx("org-123"), appointmentReq())

		assert.NoError(t, err)
		assert.NotNil(t, res)
	})

	t.Run("Thất bại - Race: partial unique index báo trùng", func(t *testing.T) {
		repo := new(MockOrderRepository)
		appts := new(MockAppointmentStore)
		appts.On("AppointmentExistsInOrg", mock.Anything, "org-123", "appt-1").Return(true, nil).Once()
		appts.On("GetAppointmentStatus", mock.Anything, "org-123", "appt-1").Return("pending", nil).Once()
		repo.On("FindActiveOrderByAppointment", mock.Anything, "org-123", "appt-1").Return(nil, nil).Once()
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(&pgconn.PgError{Code: "23505", ConstraintName: "uq_orders_appointment_active"}).Once()

		res, err := newAppointmentUC(repo, appts).CreateOrder(withOrgCtx("org-123"), appointmentReq())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})
}

func TestOrderUsecase_UpdateOrderCustomer(t *testing.T) {
	editableOrder := &domain.Order{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending, TotalAmount: 300000}
	lockedOrder := &domain.Order{ID: "ord-2", OrganizationID: "org-123", Code: "ORD-2", Status: domain.StatusCompleted, TotalAmount: 300000}

	newUC := func(repo *MockOrderRepository, customers *MockCustomerStore) *OrderUsecase {
		return NewOrderUsecase(repo, catalogOK(), new(MockProductStore), new(MockServiceStore), customers, new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
	}

	t.Run("Thành công - Gán khách có sẵn", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(editableOrder, nil)
		repo.On("UpdateOrderCustomer", mock.Anything, "org-123", "ord-1", mock.Anything).Return(nil)
		customers := new(MockCustomerStore)
		customers.On("CustomerExistsInOrg", mock.Anything, "org-123", "cust-1").Return(true, nil)

		res, err := newUC(repo, customers).UpdateOrderCustomer(withOrgCtx("org-123"), "ord-1",
			&domain.UpdateOrderCustomerRequest{CustomerID: strP("cust-1")})

		assert.NoError(t, err)
		assert.Equal(t, "cust-1", *res.CustomerID)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - Khách mới chưa có thì tạo", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(editableOrder, nil)
		repo.On("UpdateOrderCustomer", mock.Anything, "org-123", "ord-1", mock.Anything).Return(nil)
		customers := new(MockCustomerStore)
		customers.On("FindCustomerByPhone", mock.Anything, "org-123", "0901111111").Return(nil, nil)
		customers.On("CreateCustomer", mock.Anything, mock.Anything).Return(nil)

		res, err := newUC(repo, customers).UpdateOrderCustomer(withOrgCtx("org-123"), "ord-1",
			&domain.UpdateOrderCustomerRequest{NewCustomer: &domain.NewCustomerInput{FullName: "Khách Mới", Phone: "0901111111"}})

		assert.NoError(t, err)
		assert.NotNil(t, res.CustomerID)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Đơn đã khóa", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-2").Return(lockedOrder, nil)

		res, err := newUC(repo, new(MockCustomerStore)).UpdateOrderCustomer(withOrgCtx("org-123"), "ord-2",
			&domain.UpdateOrderCustomerRequest{CustomerID: strP("cust-1")})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Khách không thuộc tổ chức", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(editableOrder, nil)
		customers := new(MockCustomerStore)
		customers.On("CustomerExistsInOrg", mock.Anything, "org-123", "cust-x").Return(false, nil)

		res, err := newUC(repo, customers).UpdateOrderCustomer(withOrgCtx("org-123"), "ord-1",
			&domain.UpdateOrderCustomerRequest{CustomerID: strP("cust-x")})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
	})
}

func TestOrderUsecase_CancelRefund(t *testing.T) {
	pendingOrder := &domain.Order{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending, TotalAmount: 300000}
	confirmOrder := &domain.Order{ID: "ord-2", OrganizationID: "org-123", Code: "ORD-2", Status: domain.StatusConfirm, TotalAmount: 300000}
	completedOrder := &domain.Order{ID: "ord-4", OrganizationID: "org-123", Code: "ORD-4", Status: domain.StatusCompleted, TotalAmount: 300000}

	t.Run("Thành công - Hủy đơn chờ xử lý chỉ nhả giữ chỗ", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").
			Return([]*domain.OrderItem{
				{ID: "it-1", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeProduct, ProductID: strP("prod-1"), Quantity: 2, UnitPrice: 150000, LineTotal: 300000},
			}, nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").
			Return([]*domain.OrderItemMaterial{}, nil)
		repo.On("ApplyCancel", mock.Anything, "org-123", "ord-1", domain.StatusCancelled, mock.Anything, mock.Anything).
			Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.CancelOrder(withOrgCtx("org-123"), "ord-1")

		assert.NoError(t, err)
		assert.Equal(t, domain.StatusCancelled, res.Status)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - Hủy đơn đã xác nhận", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-2").Return(confirmOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-2").
			Return([]*domain.OrderItem{}, nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-2").
			Return([]*domain.OrderItemMaterial{}, nil)
		repo.On("ApplyCancel", mock.Anything, "org-123", "ord-2", domain.StatusCancelled, mock.Anything, mock.Anything).
			Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.CancelOrder(withOrgCtx("org-123"), "ord-2")

		assert.NoError(t, err)
		assert.Equal(t, domain.StatusCancelled, res.Status)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Hủy đơn đã chốt", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-4").Return(completedOrder, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.CancelOrder(withOrgCtx("org-123"), "ord-4")

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Hoàn đơn chưa chốt", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-2").Return(confirmOrder, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.RefundOrder(withOrgCtx("org-123"), "ord-2")

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thành công - Hoàn đơn đã chốt", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-4").Return(completedOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-4").
			Return([]*domain.OrderItem{}, nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-4").
			Return([]*domain.OrderItemMaterial{}, nil)
		repo.On("ApplyCancel", mock.Anything, "org-123", "ord-4", domain.StatusRefunded, mock.Anything, mock.Anything).
			Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.RefundOrder(withOrgCtx("org-123"), "ord-4")

		assert.NoError(t, err)
		assert.Equal(t, domain.StatusRefunded, res.Status)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Không tìm thấy đơn", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "missing").
			Return(nil, domain.ErrOrderNotFound)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.CancelOrder(withOrgCtx("org-123"), "missing")

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
	})
}

func TestOrderUsecase_CreatePayment(t *testing.T) {
	pendingOrder := &domain.Order{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending, TotalAmount: 300000}

	t.Run("Thành công - Thu đủ tiền mặt, đơn tự chốt completed", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("CreatePayment", mock.Anything, mock.Anything).Return(nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(float64(300000), nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").
			Return([]*domain.OrderItem{
				{ID: "it-1", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeProduct, ProductID: strP("prod-1"), Quantity: 2, UnitPrice: 150000, LineTotal: 300000},
			}, nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").
			Return([]*domain.OrderItemMaterial{}, nil)
		repo.On("CompleteOrderWithSlip", mock.Anything, "org-123", "ord-1", mock.Anything, mock.Anything, mock.Anything).
			Return(domain.SaleSlipResult{DocumentID: "doc-1", DocumentCode: "XK-ORD-1"}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), settingOK())
		res, err := uc.CreatePayment(withOrgCtx("org-123"), "ord-1", &domain.CreatePaymentRequest{
			Method: domain.PaymentMethodCash, Amount: 300000,
		})

		assert.NoError(t, err)
		assert.NotNil(t, res)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - Thu thiếu thì giữ nguyên trạng thái, chưa chốt", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("CreatePayment", mock.Anything, mock.Anything).Return(nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(float64(100000), nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), settingOK())
		res, err := uc.CreatePayment(withOrgCtx("org-123"), "ord-1", &domain.CreatePaymentRequest{
			Method: domain.PaymentMethodCash, Amount: 100000,
		})

		assert.NoError(t, err)
		assert.NotNil(t, res)
		repo.AssertNotCalled(t, "CompleteOrderWithSlip", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - Trùng mã giao dịch trả bản ghi cũ", func(t *testing.T) {
		existing := &domain.Payment{ID: "pay-old", OrganizationID: "org-123", OrderID: "ord-1",
			Method: domain.PaymentMethodGateway, Provider: strP("vnpay"), ProviderTxnID: strP("txn-1"),
			Amount: 300000, Status: domain.PaymentStatusSucceeded}
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("FindPaymentByProviderTxn", mock.Anything, "vnpay", "txn-1").Return(existing, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), settingOK())
		res, err := uc.CreatePayment(withOrgCtx("org-123"), "ord-1", &domain.CreatePaymentRequest{
			Method: domain.PaymentMethodGateway, Provider: strP("vnpay"), ProviderTxnID: strP("txn-1"), Amount: 300000,
		})

		assert.NoError(t, err)
		assert.Equal(t, "pay-old", res.ID)
		repo.AssertNotCalled(t, "CreatePayment", mock.Anything, mock.Anything)
	})

	t.Run("Thất bại - Thanh toán đơn đã hủy", func(t *testing.T) {
		cancelled := &domain.Order{ID: "ord-3", OrganizationID: "org-123", Status: domain.StatusCancelled}
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-3").Return(cancelled, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), settingOK())
		res, err := uc.CreatePayment(withOrgCtx("org-123"), "ord-3", &domain.CreatePaymentRequest{
			Method: domain.PaymentMethodCash, Amount: 100000,
		})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})
}

func TestOrderUsecase_GetOrders(t *testing.T) {
	orders := []*domain.Order{
		{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending},
	}

	t.Run("Thành công - Danh sách phân trang", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrdersByOrgID", mock.Anything, "org-123", "", mock.Anything, mock.Anything).
			Return(orders, nil)
		repo.On("CountOrdersByOrgID", mock.Anything, "org-123", "").
			Return(int64(1), nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetOrdersByOrgID(withOrgCtx("org-123"), 1, 20, "")

		assert.NoError(t, err)
		assert.Len(t, res.Data, 1)
		assert.Equal(t, int64(1), res.Total)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Lỗi DB khi đếm", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrdersByOrgID", mock.Anything, "org-123", "", mock.Anything, mock.Anything).
			Return(orders, nil)
		repo.On("CountOrdersByOrgID", mock.Anything, "org-123", "").
			Return(int64(0), errors.New("db count failed"))

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetOrdersByOrgID(withOrgCtx("org-123"), 1, 20, "")

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
	})
}

func TestOrderUsecase_GetPosItemsByOrgID(t *testing.T) {
	stock := 50.0
	items := []*domain.PosItemResponse{
		{ID: "prod-1", OrganizationID: "org-123", Type: "product", Name: "Dầu gội", Price: 150000, StockQuantity: &stock, IsActive: true},
		{ID: "svc-1", OrganizationID: "org-123", Type: "service", Name: "Cắt tóc", Price: 200000, StockQuantity: nil, IsActive: true},
	}

	t.Run("Thành công - Trả danh sách gồm product và service", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetPosItemsByOrgID", mock.Anything, "org-123", 20, "", "", "", "", "").
			Return(items, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetPosItemsByOrgID(withOrgCtx("org-123"), 20, "", "", "", "", "")

		assert.NoError(t, err)
		assert.Len(t, res, 2)
		assert.Equal(t, "product", res[0].Type)
		assert.NotNil(t, res[0].StockQuantity)
		assert.Nil(t, res[1].StockQuantity)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - limit ngoài khoảng được clamp", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetPosItemsByOrgID", mock.Anything, "org-123", 20, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(items, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetPosItemsByOrgID(withOrgCtx("org-123"), 0, "", "", "", "", "")

		assert.NoError(t, err)
		assert.Len(t, res, 2)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - limit vượt trần được clamp", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetPosItemsByOrgID", mock.Anything, "org-123", 100, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(items, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetPosItemsByOrgID(withOrgCtx("org-123"), 999, "", "", "", "", "")

		assert.NoError(t, err)
		assert.Len(t, res, 2)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Thiếu organization_id", func(t *testing.T) {
		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetPosItemsByOrgID(context.Background(), 20, "", "", "", "", "")

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Lỗi DB", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetPosItemsByOrgID", mock.Anything, "org-123", 20, "", "", "", "", "").
			Return(nil, errors.New("db query failed"))

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetPosItemsByOrgID(withOrgCtx("org-123"), 20, "", "", "", "", "")

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
	})
}

func f64P(v float64) *float64 { return &v }

func validStaffInputs() []*domain.StaffOrderItemInput {
	return []*domain.StaffOrderItemInput{
		{StaffID: "staff-1", Type: strP(domain.StaffTypePercent), SharePct: f64P(70), CommissionAmount: f64P(140000)},
		{StaffID: "staff-2", Type: strP(domain.StaffTypeProfit), SharePct: f64P(30), CommissionAmount: f64P(30000)},
	}
}

func TestOrderUsecase_ReplaceStaffOrderItems(t *testing.T) {
	svcLine := func() []*domain.OrderItem {
		return []*domain.OrderItem{
			{ID: "item-1", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeService, ServiceID: strP("svc-1"), Quantity: 1, UnitPrice: 500000, LineTotal: 500000},
		}
	}

	t.Run("Thành công - server tự tính, bỏ qua số client gửi", func(t *testing.T) {
		repo := new(MockOrderRepository)
		staff := new(MockStaffStore)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1"}).
			Return(map[string]string{"item-1": "ord-1"}, nil)
		staff.On("StaffsExistInOrg", mock.Anything, "org-123", []string{"staff-1", "staff-2"}).
			Return([]string{}, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(svcLine(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").
			Return([]*domain.OrderItemMaterial{}, nil)
		repo.On("ReplaceStaffOrderItems", mock.Anything, "org-123", "item-1", mock.Anything).Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), staff, new(MockSettingStore))
		res, err := uc.ReplaceStaffOrderItems(withOrgCtx("org-123"), "item-1", validStaffInputs())

		assert.NoError(t, err)
		assert.Len(t, res, 2)
		assert.Equal(t, "staff-1", res[0].StaffID)
		assert.Equal(t, "percent", res[0].Type)
		assert.Equal(t, 70.0, res[0].SharePct)
		// 500000 × 70% = 350000 (bỏ qua 140000 client gửi).
		assert.Equal(t, 350000.0, res[0].CommissionAmount)
		assert.Equal(t, "profit", res[1].Type)
		// margin cả đơn = 1 (không vật tư): 500000 × 1 × 30% = 150000 (bỏ qua 30000).
		assert.Equal(t, 150000.0, res[1].CommissionAmount)
		assert.NotEmpty(t, res[0].ID)
		repo.AssertExpectations(t)
		staff.AssertExpectations(t)
	})

	t.Run("Thành công - fixed-only thì bỏ qua tổng share", func(t *testing.T) {
		repo := new(MockOrderRepository)
		staff := new(MockStaffStore)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1"}).
			Return(map[string]string{"item-1": "ord-1"}, nil)
		staff.On("StaffsExistInOrg", mock.Anything, "org-123", []string{"staff-1"}).
			Return([]string{}, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(svcLine(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").
			Return([]*domain.OrderItemMaterial{}, nil)
		repo.On("ReplaceStaffOrderItems", mock.Anything, "org-123", "item-1", mock.Anything).Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), staff, new(MockSettingStore))
		inputs := []*domain.StaffOrderItemInput{
			{StaffID: "staff-1", Type: strP(domain.StaffTypeFixed), SharePct: f64P(0), CommissionAmount: f64P(50000)},
		}
		res, err := uc.ReplaceStaffOrderItems(withOrgCtx("org-123"), "item-1", inputs)

		assert.NoError(t, err)
		assert.Len(t, res, 1)
		assert.Equal(t, "fixed", res[0].Type)
		assert.Equal(t, 50000.0, res[0].CommissionAmount)
		repo.AssertExpectations(t)
		staff.AssertExpectations(t)
	})

	t.Run("Thất bại - type không hợp lệ", func(t *testing.T) {
		inputs := validStaffInputs()
		inputs[0].Type = strP("boss")

		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceStaffOrderItems(withOrgCtx("org-123"), "item-1", inputs)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Thiếu organization_id", func(t *testing.T) {
		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceStaffOrderItems(context.Background(), "item-1", validStaffInputs())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thành công - Danh sách rỗng = gỡ hết NV của dòng", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1"}).
			Return(map[string]string{"item-1": "ord-1"}, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return([]*domain.OrderItem{
			{ID: "item-1", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeService, ServiceID: strP("svc-1"), Quantity: 1, UnitPrice: 500000, LineTotal: 500000},
		}, nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").
			Return([]*domain.OrderItemMaterial{}, nil)
		repo.On("ReplaceStaffOrderItems", mock.Anything, "org-123", "item-1", mock.Anything).Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceStaffOrderItems(withOrgCtx("org-123"), "item-1", nil)

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Empty(t, res)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Tổng share khác 100", func(t *testing.T) {
		inputs := validStaffInputs()
		inputs[1].SharePct = f64P(20)

		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceStaffOrderItems(withOrgCtx("org-123"), "item-1", inputs)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Trùng nhân viên", func(t *testing.T) {
		inputs := validStaffInputs()
		inputs[1].StaffID = "staff-1"

		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceStaffOrderItems(withOrgCtx("org-123"), "item-1", inputs)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Hoa hồng âm", func(t *testing.T) {
		inputs := validStaffInputs()
		inputs[0].CommissionAmount = f64P(-1000)

		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceStaffOrderItems(withOrgCtx("org-123"), "item-1", inputs)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Dòng đơn khác tổ chức", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-x"}).
			Return(map[string]string{}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceStaffOrderItems(withOrgCtx("org-123"), "item-x", validStaffInputs())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - NV không thuộc tổ chức", func(t *testing.T) {
		repo := new(MockOrderRepository)
		staff := new(MockStaffStore)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1"}).
			Return(map[string]string{"item-1": "ord-1"}, nil)
		staff.On("StaffsExistInOrg", mock.Anything, "org-123", []string{"staff-1", "staff-2"}).
			Return([]string{"staff-2"}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), staff, new(MockSettingStore))
		res, err := uc.ReplaceStaffOrderItems(withOrgCtx("org-123"), "item-1", validStaffInputs())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
		staff.AssertExpectations(t)
	})

	t.Run("Thành công - profit dòng SP tính trên giá vốn dòng", func(t *testing.T) {
		repo := new(MockOrderRepository)
		staff := new(MockStaffStore)
		products := new(MockProductStore)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1"}).
			Return(map[string]string{"item-1": "ord-1"}, nil)
		staff.On("StaffsExistInOrg", mock.Anything, "org-123", []string{"staff-1"}).
			Return([]string{}, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return([]*domain.OrderItem{
			{ID: "item-1", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeProduct, ProductID: strP("prod-net"), Quantity: 2, Unit: strP("chai"), UnitPrice: 200000, LineTotal: 400000},
		}, nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").
			Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductPricing", mock.Anything, "org-123", []string{"prod-net"}).Return(
			map[string]domain.ProductPricing{"prod-net": {SellPrice: 200000, CostPrice: 120000}}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(
			map[string]domain.ProductUnit{"prod-net": {Unit: "chai", NetUnit: strP("ml"), NetAmount: f64P(1000)}}, nil)
		repo.On("ReplaceStaffOrderItems", mock.Anything, "org-123", "item-1", mock.Anything).Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), staff, new(MockSettingStore))
		inputs := []*domain.StaffOrderItemInput{
			{StaffID: "staff-1", Type: strP(domain.StaffTypeProfit), SharePct: f64P(100)},
		}
		res, err := uc.ReplaceStaffOrderItems(withOrgCtx("org-123"), "item-1", inputs)

		assert.NoError(t, err)
		assert.Len(t, res, 1)
		// margin dòng = (400000 − 2×120000)/400000 = 0.4 → 400000 × 0.4 = 160000.
		assert.Equal(t, 160000.0, res[0].CommissionAmount)
		repo.AssertExpectations(t)
	})
}

func TestComputeCommission(t *testing.T) {
	assert.Equal(t, 350000.0, computeCommission(domain.StaffTypePercent, 70, 500000, 0, 0, 999))
	assert.Equal(t, 150000.0, computeCommission(domain.StaffTypeProfit, 30, 500000, 500000, 0, 0))
	assert.Equal(t, 50000.0, computeCommission(domain.StaffTypeFixed, 0, 500000, 0, 0, 50000))
	// Làm tròn nguyên đồng.
	assert.Equal(t, 333.0, computeCommission(domain.StaffTypePercent, 33.3, 1000, 0, 0, 0))
	// Margin âm (lỗ) kẹp về 0.
	assert.Equal(t, 0.0, computeCommission(domain.StaffTypeProfit, 100, 100000, 100000, 150000, 0))
	// Mẫu số 0 thì margin 0.
	assert.Equal(t, 0.0, computeCommission(domain.StaffTypeProfit, 100, 100000, 0, 0, 0))
}

func TestOrderUsecase_GetOrderDetail_Commissions(t *testing.T) {
	repo := new(MockOrderRepository)
	order := &domain.Order{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending, SubtotalAmount: 500000, TotalAmount: 500000}
	repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(order, nil)
	repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return([]*domain.OrderItem{
		{
			ID: "it-1", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeService,
			ServiceID: strP("svc-1"), Quantity: 1, UnitPrice: 500000, LineTotal: 500000,
			Staff: []*domain.OrderItemStaffInfo{
				{ID: "s-1", StaffID: strP("staff-1"), FullName: strP("An"), Type: domain.StaffTypePercent, SharePct: 100, CommissionAmount: 500000},
			},
		},
	}, nil)
	repo.On("GetOrderMaterials", mock.Anything, "ord-1").
		Return([]*domain.OrderItemMaterial{}, nil)
	repo.On("GetOrderPayments", mock.Anything, "org-123", "ord-1").
		Return([]*domain.Payment{}, nil)

	uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
	res, err := uc.GetOrderDetail(withOrgCtx("org-123"), "ord-1")

	assert.NoError(t, err)
	assert.Len(t, res.Commissions, 1)
	assert.Equal(t, "staff-1", res.Commissions[0].StaffID)
	assert.Equal(t, "An", res.Commissions[0].FullName)
	assert.Equal(t, "percent", res.Commissions[0].Type)
	assert.Equal(t, 500000.0, res.Commissions[0].Amount)
	assert.Equal(t, "it-1", res.Commissions[0].OrderItemID)
	repo.AssertExpectations(t)
}

func TestOrderUsecase_CreateOrder_CustomerStore(t *testing.T) {
	t.Run("Thành công - customer_id check qua CustomerStore đúng repo", func(t *testing.T) {
		repo := new(MockOrderRepository)
		customers := new(MockCustomerStore)
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(nil)
		customers.On("CustomerExistsInOrg", mock.Anything, "org-123", "cus-1").Return(true, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), customers, new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := validProductOrderReq()
		req.CustomerID = strP("cus-1")
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.NotNil(t, res.CustomerID)
		assert.Equal(t, "cus-1", *res.CustomerID)
		customers.AssertExpectations(t)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Khách khác tổ chức qua CustomerStore", func(t *testing.T) {
		repo := new(MockOrderRepository)
		customers := new(MockCustomerStore)
		customers.On("CustomerExistsInOrg", mock.Anything, "org-123", "cus-x").Return(false, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), customers, new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := validProductOrderReq()
		req.CustomerID = strP("cus-x")
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
		customers.AssertExpectations(t)
	})

	t.Run("Thất bại - Lịch hẹn khác tổ chức qua AppointmentStore", func(t *testing.T) {
		repo := new(MockOrderRepository)
		appointments := new(MockAppointmentStore)
		appointments.On("AppointmentExistsInOrg", mock.Anything, "org-123", "appt-x").Return(false, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), appointments, new(MockStaffStore), new(MockSettingStore))
		req := validProductOrderReq()
		req.AppointmentID = strP("appt-x")
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
		appointments.AssertExpectations(t)
	})

	t.Run("Thành công - new_customer tạo mới qua CustomerStore", func(t *testing.T) {
		repo := new(MockOrderRepository)
		customers := new(MockCustomerStore)
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(nil)
		customers.On("FindCustomerByPhone", mock.Anything, "org-123", "0912345678").
			Return(nil, nil)
		customers.On("CreateCustomer", mock.Anything, mock.Anything).Return(nil)
		customers.On("CustomerExistsInOrg", mock.Anything, "org-123", mock.Anything).Return(true, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), customers, new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := validProductOrderReq()
		req.NewCustomer = &domain.NewCustomerInput{FullName: "Khách Mới", Phone: "0912345678"}
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.NotNil(t, res.CustomerID)
		assert.False(t, res.CustomerReused)
		assert.Equal(t, "Khách Mới", *res.CustomerName)
		customers.AssertExpectations(t)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - new_customer dùng luôn khách cũ", func(t *testing.T) {
		repo := new(MockOrderRepository)
		customers := new(MockCustomerStore)
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(nil)
		customers.On("FindCustomerByPhone", mock.Anything, "org-123", "0912345678").
			Return(&customerdomain.Customer{ID: "cus-old", FullName: "Khách Cũ"}, nil)
		customers.On("CustomerExistsInOrg", mock.Anything, "org-123", "cus-old").Return(true, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), customers, new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := validProductOrderReq()
		req.NewCustomer = &domain.NewCustomerInput{FullName: "Khách Mới", Phone: "0912345678"}
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.True(t, res.CustomerReused)
		assert.Equal(t, "cus-old", *res.CustomerID)
		customers.AssertExpectations(t)
		customers.AssertNotCalled(t, "CreateCustomer", mock.Anything, mock.Anything)
	})
}

func TestOrderUsecase_ReplaceOrderMaterials(t *testing.T) {
	validInputs := func() []*domain.OrderMaterialInput {
		return []*domain.OrderMaterialInput{
			{OrderItemID: "item-1", ProductID: "prod-1", Quantity: 2},
			{OrderItemID: "item-2", ProductID: "prod-2", Quantity: 0.5},
		}
	}
	setupOK := func() (*MockOrderRepository, *MockCatalogChecker, *MockProductStore) {
		repo := new(MockOrderRepository)
		catalog := catalogOK()
		products := new(MockProductStore)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1", "item-2"}).
			Return(map[string]string{"item-1": "ord-1", "item-2": "ord-1"}, nil)
		catalog.On("ProductsExistInOrg", mock.Anything, "org-123", []string{"prod-1", "prod-2"}).
			Return([]string{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-1", "prod-2"}).
			Return(map[string]domain.ProductUnit{
				"prod-1": {Unit: "chai"},
				"prod-2": {Unit: "gói"},
			}, nil)
		products.On("GetProductPricing", mock.Anything, "org-123", []string{"prod-1", "prod-2"}).
			Return(map[string]domain.ProductPricing{
				"prod-1": {SellPrice: 150000, CostPrice: 90000},
				"prod-2": {SellPrice: 60000, CostPrice: 40000},
			}, nil)
		repo.On("ReplaceOrderMaterials", mock.Anything, "org-123", mock.Anything, mock.Anything).Return(nil)
		return repo, catalog, products
	}

	t.Run("Thành công - thay toàn bộ vật tư", func(t *testing.T) {
		repo, catalog, products := setupOK()
		uc := NewOrderUsecase(repo, catalog, products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceOrderMaterials(withOrgCtx("org-123"), validInputs())

		assert.NoError(t, err)
		assert.Len(t, res, 2)
		assert.Equal(t, "item-1", res[0].OrderItemID)
		assert.Equal(t, "prod-1", res[0].ProductID)
		assert.Equal(t, 2.0, res[0].Quantity)
		assert.Equal(t, 90000.0, res[0].UnitCostAtTime)
		assert.NotEmpty(t, res[0].ID)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - mảng rỗng thì không làm gì", func(t *testing.T) {
		repo := new(MockOrderRepository)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceOrderMaterials(withOrgCtx("org-123"), []*domain.OrderMaterialInput{})

		assert.NoError(t, err)
		assert.Empty(t, res)
		repo.AssertNotCalled(t, "ReplaceOrderMaterials", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Thất bại - Thiếu organization_id", func(t *testing.T) {
		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceOrderMaterials(context.Background(), validInputs())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Dòng vật tư thiếu order_item_id", func(t *testing.T) {
		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		inputs := []*domain.OrderMaterialInput{
			{ProductID: "prod-1", Quantity: 1},
		}
		res, err := uc.ReplaceOrderMaterials(withOrgCtx("org-123"), inputs)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Dòng đơn lạ/khác salon", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-x"}).
			Return(map[string]string{}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		inputs := []*domain.OrderMaterialInput{
			{OrderItemID: "item-x", ProductID: "prod-1", Quantity: 1},
		}
		res, err := uc.ReplaceOrderMaterials(withOrgCtx("org-123"), inputs)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Sản phẩm không thuộc tổ chức", func(t *testing.T) {
		repo := new(MockOrderRepository)
		catalog := new(MockCatalogChecker)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1", "item-2"}).
			Return(map[string]string{"item-1": "ord-1", "item-2": "ord-1"}, nil)
		catalog.On("ProductsExistInOrg", mock.Anything, "org-123", mock.Anything).
			Return([]string{"prod-2"}, nil)
		products := new(MockProductStore)
		products.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).
			Return(map[string]domain.ProductUnit{
				"prod-1": {Unit: "chai"},
				"prod-2": {Unit: "gói"},
			}, nil)
		products.On("GetProductPricing", mock.Anything, "org-123", mock.Anything).
			Return(map[string]domain.ProductPricing{
				"prod-1": {SellPrice: 150000, CostPrice: 90000},
				"prod-2": {SellPrice: 60000, CostPrice: 40000},
			}, nil)

		uc := NewOrderUsecase(repo, catalog, products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceOrderMaterials(withOrgCtx("org-123"), validInputs())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Đơn đã khóa sửa (đã serve)", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1", "item-2"}).
			Return(map[string]string{"item-1": "ord-1", "item-2": "ord-1"}, nil)
		catalog := catalogOK()
		catalog.On("ProductsExistInOrg", mock.Anything, "org-123", []string{"prod-1", "prod-2"}).
			Return([]string{}, nil)
		repo.On("ReplaceOrderMaterials", mock.Anything, "org-123", mock.Anything, mock.Anything).
			Return(fmt.Errorf("đơn hàng ord-1: %w", domain.ErrOrderNotEditable))
		products := stubProductStore()

		uc := NewOrderUsecase(repo, catalog, products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceOrderMaterials(withOrgCtx("org-123"), validInputs())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Giữ chỗ vượt tồn khả dụng", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1", "item-2"}).
			Return(map[string]string{"item-1": "ord-1", "item-2": "ord-1"}, nil)
		catalog := catalogOK()
		catalog.On("ProductsExistInOrg", mock.Anything, "org-123", []string{"prod-1", "prod-2"}).
			Return([]string{}, nil)
		repo.On("ReplaceOrderMaterials", mock.Anything, "org-123", mock.Anything, mock.Anything).
			Return(fmt.Errorf("sản phẩm prod-1: %w", domain.ErrInsufficientStock))
		products := stubProductStore()

		uc := NewOrderUsecase(repo, catalog, products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.ReplaceOrderMaterials(withOrgCtx("org-123"), validInputs())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - Số lượng không hợp lệ", func(t *testing.T) {
		repo := new(MockOrderRepository)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		inputs := []*domain.OrderMaterialInput{
			{OrderItemID: "item-1", ProductID: "prod-1", Quantity: 0},
		}
		res, err := uc.ReplaceOrderMaterials(withOrgCtx("org-123"), inputs)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
		repo.AssertNotCalled(t, "MapItemOrders", mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Thành công - vật tư nhiều đơn trong 1 lần gọi", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1", "item-9"}).
			Return(map[string]string{"item-1": "ord-1", "item-9": "ord-2"}, nil)
		catalog := catalogOK()
		catalog.On("ProductsExistInOrg", mock.Anything, "org-123", []string{"prod-1", "prod-9"}).
			Return([]string{}, nil)
		products := new(MockProductStore)
		products.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).
			Return(map[string]domain.ProductUnit{
				"prod-1": {Unit: "chai"},
				"prod-9": {Unit: "tuýp"},
			}, nil)
		products.On("GetProductPricing", mock.Anything, "org-123", mock.Anything).
			Return(map[string]domain.ProductPricing{
				"prod-1": {SellPrice: 150000, CostPrice: 90000},
				"prod-9": {SellPrice: 80000, CostPrice: 50000},
			}, nil)
		repo.On("ReplaceOrderMaterials", mock.Anything, "org-123", mock.Anything, mock.Anything).Return(nil)

		uc := NewOrderUsecase(repo, catalog, products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		inputs := []*domain.OrderMaterialInput{
			{OrderItemID: "item-1", ProductID: "prod-1", Quantity: 2},
			{OrderItemID: "item-9", ProductID: "prod-9", Quantity: 1},
		}
		res, err := uc.ReplaceOrderMaterials(withOrgCtx("org-123"), inputs)

		assert.NoError(t, err)
		assert.Len(t, res, 2)
		repo.AssertExpectations(t)
	})
}

func TestOrderUsecase_CreateOrder_Units(t *testing.T) {
	netUnits := map[string]domain.ProductUnit{
		"prod-net": {Unit: "chai", NetUnit: strP("ml"), NetAmount: f64P(1000)},
	}
	netPricing := map[string]domain.ProductPricing{
		"prod-net": {SellPrice: 200000, CostPrice: 120000},
	}

	t.Run("Thành công - gửi chai thì lưu đơn vị lớn, giữ chỗ ml", func(t *testing.T) {
		repo := new(MockOrderRepository)
		var gotItems []*domain.OrderItem
		var gotDeducts []domain.StockDeduction
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotItems = args.Get(2).([]*domain.OrderItem)
				gotDeducts = args.Get(4).([]domain.StockDeduction)
			}).Return(nil)
		products := new(MockProductStore)
		products.On("GetProductPricing", mock.Anything, "org-123", mock.Anything).Return(netPricing, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).Return(netUnits, nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := &domain.CreateOrderRequest{
			Items: []domain.OrderItemInput{
				{ItemType: domain.ItemTypeProduct, ProductID: strP("prod-net"), Quantity: 2, Unit: strP("chai")},
			},
		}
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, float64(400000), res.SubtotalAmount)
		assert.Equal(t, float64(400000), res.TotalAmount)
		// Dòng đơn lưu đơn vị lớn, giữ chỗ kho tính base.
		assert.Len(t, gotItems, 1)
		assert.Equal(t, float64(2), gotItems[0].Quantity)
		assert.Equal(t, "chai", *gotItems[0].Unit)
		assert.Equal(t, float64(400000), gotItems[0].LineTotal)
		assert.Len(t, gotDeducts, 1)
		assert.Equal(t, float64(2000), gotDeducts[0].Quantity)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - gửi ml thì quy về chai lúc lưu, giữ chỗ ml", func(t *testing.T) {
		repo := new(MockOrderRepository)
		var gotItems []*domain.OrderItem
		var gotDeducts []domain.StockDeduction
		repo.On("CreateOrder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotItems = args.Get(2).([]*domain.OrderItem)
				gotDeducts = args.Get(4).([]domain.StockDeduction)
			}).Return(nil)
		products := new(MockProductStore)
		products.On("GetProductPricing", mock.Anything, "org-123", mock.Anything).Return(netPricing, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).Return(netUnits, nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := &domain.CreateOrderRequest{
			Items: []domain.OrderItemInput{
				{ItemType: domain.ItemTypeProduct, ProductID: strP("prod-net"), Quantity: 500, Unit: strP("ml")},
			},
		}
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, float64(100000), res.SubtotalAmount)
		// 500ml quy về 0.5 chai lúc lưu, giữ chỗ 500ml.
		assert.Len(t, gotItems, 1)
		assert.Equal(t, float64(0.5), gotItems[0].Quantity)
		assert.Equal(t, "chai", *gotItems[0].Unit)
		assert.Equal(t, float64(100000), gotItems[0].LineTotal)
		assert.Len(t, gotDeducts, 1)
		assert.Equal(t, float64(500), gotDeducts[0].Quantity)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - đơn vị lạ", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		products.On("GetProductPricing", mock.Anything, "org-123", mock.Anything).Return(netPricing, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).Return(netUnits, nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		req := &domain.CreateOrderRequest{
			Items: []domain.OrderItemInput{
				{ItemType: domain.ItemTypeProduct, ProductID: strP("prod-net"), Quantity: 1, Unit: strP("thùng")},
			},
		}
		res, err := uc.CreateOrder(withOrgCtx("org-123"), req)

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thành công - vật tư gửi ml, server quy đổi + tự tính giá vốn", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		products.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).
			Return(map[string]domain.ProductUnit{
				"prod-net": {Unit: "chai", NetUnit: strP("ml"), NetAmount: f64P(1000)},
			}, nil)
		products.On("GetProductPricing", mock.Anything, "org-123", mock.Anything).Return(netPricing, nil)
		repo.On("MapItemOrders", mock.Anything, "org-123", []string{"item-1"}).
			Return(map[string]string{"item-1": "ord-1"}, nil)
		catalog := catalogOK()
		catalog.On("ProductsExistInOrg", mock.Anything, "org-123", []string{"prod-net"}).
			Return([]string{}, nil)
		repo.On("ReplaceOrderMaterials", mock.Anything, "org-123", mock.Anything, mock.Anything).Return(nil)

		uc := NewOrderUsecase(repo, catalog, products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		inputs := []*domain.OrderMaterialInput{
			{OrderItemID: "item-1", ProductID: "prod-net", Quantity: 1500, Unit: strP("ml")},
		}
		res, err := uc.ReplaceOrderMaterials(withOrgCtx("org-123"), inputs)

		assert.NoError(t, err)
		assert.Len(t, res, 1)
		assert.Equal(t, 1500.0, res[0].Quantity)
		assert.Equal(t, 120.0, res[0].UnitCostAtTime)
		assert.Equal(t, "ml", res[0].Unit)
		repo.AssertExpectations(t)
	})
}

func TestOrderUsecase_UpdateOrderItemQty(t *testing.T) {
	pendingOrder := &domain.Order{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending, SubtotalAmount: 400000, DiscountAmount: 0, TotalAmount: 400000}
	deliveryOrder := &domain.Order{ID: "ord-9", OrganizationID: "org-123", Code: "ORD-9", Status: domain.StatusDelivery, SubtotalAmount: 400000, TotalAmount: 400000}
	netUnits := map[string]domain.ProductUnit{
		"prod-net": {Unit: "chai", NetUnit: strP("ml"), NetAmount: f64P(1000)},
	}
	productLine := func() []*domain.OrderItem {
		return []*domain.OrderItem{
			{ID: "it-1", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeProduct, ProductID: strP("prod-net"), Quantity: 2, Unit: strP("chai"), UnitPrice: 200000, LineTotal: 400000},
		}
	}

	t.Run("Thành công - SP đổi 1000ml về 1 chai, delta nhả đúng", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(productLine(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(netUnits, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		var gotItem *domain.OrderItem
		var gotDeltas []domain.StockDeduction
		var gotSubtotal, gotTotal float64
		repo.On("ApplyItemQtyUpdate", mock.Anything, "org-123", "ord-1", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotItem = args.Get(3).(*domain.OrderItem)
				gotDeltas = args.Get(5).([]domain.StockDeduction)
				gotSubtotal = args.Get(6).(float64)
				gotTotal = args.Get(7).(float64)
			}).Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.UpdateOrderItemQty(withOrgCtx("org-123"), "ord-1", "it-1", &domain.UpdateOrderItemQtyRequest{Quantity: 1000, Unit: strP("ml")})

		assert.NoError(t, err)
		assert.Equal(t, float64(1), res.Quantity)
		assert.Equal(t, "chai", *res.Unit)
		assert.Equal(t, float64(200000), res.LineTotal)
		assert.Equal(t, float64(1), gotItem.Quantity)
		assert.Len(t, gotDeltas, 1)
		assert.Equal(t, "prod-net", gotDeltas[0].ProductID)
		assert.Equal(t, float64(-1000), gotDeltas[0].Quantity)
		assert.Equal(t, float64(200000), gotSubtotal)
		assert.Equal(t, float64(200000), gotTotal)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - service tăng SL gấp đôi, vật tư scale theo", func(t *testing.T) {
		repo := new(MockOrderRepository)
		svcOrder := &domain.Order{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending, SubtotalAmount: 500000, TotalAmount: 500000}
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(svcOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return([]*domain.OrderItem{
			{ID: "it-9", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeService, ServiceID: strP("svc-1"), Quantity: 1, UnitPrice: 500000, LineTotal: 500000},
		}, nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{
			{ID: "m-1", OrderItemID: "it-9", ProductID: "prod-nhuom", Quantity: 60, UnitCostAtTime: 2000, Unit: "ml"},
		}, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		var gotMats map[string]float64
		var gotDeltas []domain.StockDeduction
		repo.On("ApplyItemQtyUpdate", mock.Anything, "org-123", "ord-1", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotMats = args.Get(4).(map[string]float64)
				gotDeltas = args.Get(5).([]domain.StockDeduction)
			}).Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.UpdateOrderItemQty(withOrgCtx("org-123"), "ord-1", "it-9", &domain.UpdateOrderItemQtyRequest{Quantity: 2})

		assert.NoError(t, err)
		assert.Equal(t, float64(2), res.Quantity)
		assert.Equal(t, float64(1000000), res.LineTotal)
		assert.Equal(t, map[string]float64{"m-1": 120}, gotMats)
		assert.Len(t, gotDeltas, 1)
		assert.Equal(t, float64(60), gotDeltas[0].Quantity)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - đơn delivery không được sửa", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-9").Return(deliveryOrder, nil)

		uc := NewOrderUsecase(repo, catalogOK(), new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.UpdateOrderItemQty(withOrgCtx("org-123"), "ord-9", "it-1", &domain.UpdateOrderItemQtyRequest{Quantity: 1})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - dòng không thuộc đơn", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return([]*domain.OrderItem{}, nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.UpdateOrderItemQty(withOrgCtx("org-123"), "ord-1", "missing", &domain.UpdateOrderItemQtyRequest{Quantity: 1})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
	})

	t.Run("Thất bại - số lượng không dương", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)

		uc := NewOrderUsecase(repo, catalogOK(), new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.UpdateOrderItemQty(withOrgCtx("org-123"), "ord-1", "it-1", &domain.UpdateOrderItemQtyRequest{Quantity: 0})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - đơn vị lạ", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(productLine(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(netUnits, nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.UpdateOrderItemQty(withOrgCtx("org-123"), "ord-1", "it-1", &domain.UpdateOrderItemQtyRequest{Quantity: 1, Unit: strP("thùng")})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - giảm giá vượt tổng mới", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		discOrder := &domain.Order{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending, SubtotalAmount: 400000, DiscountAmount: 350000, TotalAmount: 50000}
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(discOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(productLine(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(netUnits, nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.UpdateOrderItemQty(withOrgCtx("org-123"), "ord-1", "it-1", &domain.UpdateOrderItemQtyRequest{Quantity: 1, Unit: strP("chai")})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - đã thu vượt tổng mới", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(productLine(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(netUnits, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(500000.0, nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.UpdateOrderItemQty(withOrgCtx("org-123"), "ord-1", "it-1", &domain.UpdateOrderItemQtyRequest{Quantity: 1, Unit: strP("chai")})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - tồn kho không đủ cho số mới", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(productLine(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(netUnits, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		repo.On("ApplyItemQtyUpdate", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(domain.ErrInsufficientStock)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.UpdateOrderItemQty(withOrgCtx("org-123"), "ord-1", "it-1", &domain.UpdateOrderItemQtyRequest{Quantity: 5, Unit: strP("chai")})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - đơn bị khóa trong tx (race chốt đơn)", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(productLine(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(netUnits, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		repo.On("ApplyItemQtyUpdate", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(domain.ErrOrderNotEditable)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.UpdateOrderItemQty(withOrgCtx("org-123"), "ord-1", "it-1", &domain.UpdateOrderItemQtyRequest{Quantity: 5, Unit: strP("chai")})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})
}

func TestOrderUsecase_AddOrderItems(t *testing.T) {
	pendingOrder := &domain.Order{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending, SubtotalAmount: 300000, DiscountAmount: 0, TotalAmount: 300000}
	deliveryOrder := &domain.Order{ID: "ord-9", OrganizationID: "org-123", Code: "ORD-9", Status: domain.StatusDelivery, SubtotalAmount: 300000, TotalAmount: 300000}

	t.Run("Thành công - thêm dòng SP, tổng cộng dồn", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		var gotLines []*domain.OrderItem
		var gotDeducts []domain.StockDeduction
		var gotSubtotal, gotTotal float64
		repo.On("AddOrderItems", mock.Anything, "org-123", "ord-1", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotLines = args.Get(3).([]*domain.OrderItem)
				gotDeducts = args.Get(5).([]domain.StockDeduction)
				gotSubtotal = args.Get(6).(float64)
				gotTotal = args.Get(7).(float64)
			}).Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.AddOrderItems(withOrgCtx("org-123"), "ord-1", []domain.OrderItemInput{
			{ItemType: domain.ItemTypeProduct, ProductID: strP("prod-1"), Quantity: 1},
		})

		assert.NoError(t, err)
		assert.Equal(t, float64(450000), res.SubtotalAmount)
		assert.Equal(t, float64(450000), res.TotalAmount)
		assert.Len(t, gotLines, 1)
		assert.Equal(t, float64(1), gotLines[0].Quantity)
		assert.Equal(t, float64(150000), gotLines[0].LineTotal)
		assert.Len(t, gotDeducts, 1)
		assert.Equal(t, float64(1), gotDeducts[0].Quantity)
		assert.Equal(t, float64(450000), gotSubtotal)
		assert.Equal(t, float64(450000), gotTotal)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - thêm dòng service kèm snapshot vật tư", func(t *testing.T) {
		repo := new(MockOrderRepository)
		services := new(MockServiceStore)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		services.On("GetServiceMaterials", mock.Anything, "org-123", []string{"svc-1"}).Return(
			map[string][]domain.ServiceMaterialUsage{
				"svc-1": {{ProductID: "prod-nhuom", QuantityPerService: 1, UnitCost: 120000, Unit: "tuýp"}},
			}, nil)
		services.On("GetServicePrices", mock.Anything, "org-123", []string{"svc-1"}).Return(map[string]float64{"svc-1": 500000}, nil)
		products := new(MockProductStore)
		products.On("GetProductUnits", mock.Anything, "org-123", mock.Anything).Return(
			map[string]domain.ProductUnit{
				"prod-nhuom": {Unit: "tuýp", NetUnit: strP("ml"), NetAmount: f64P(60)},
			}, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		var gotMats []*domain.OrderItemMaterial
		repo.On("AddOrderItems", mock.Anything, "org-123", "ord-1", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotMats = args.Get(4).([]*domain.OrderItemMaterial)
			}).Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, services, new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.AddOrderItems(withOrgCtx("org-123"), "ord-1", []domain.OrderItemInput{
			{ItemType: domain.ItemTypeService, ServiceID: strP("svc-1"), Quantity: 1},
		})

		assert.NoError(t, err)
		assert.Equal(t, float64(800000), res.SubtotalAmount)
		assert.Len(t, gotMats, 1)
		assert.Equal(t, float64(60), gotMats[0].Quantity)
		assert.Equal(t, "ml", gotMats[0].Unit)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - danh sách rỗng", func(t *testing.T) {
		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.AddOrderItems(withOrgCtx("org-123"), "ord-1", []domain.OrderItemInput{})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - đơn delivery không được thêm", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-9").Return(deliveryOrder, nil)

		uc := NewOrderUsecase(repo, catalogOK(), new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.AddOrderItems(withOrgCtx("org-123"), "ord-9", []domain.OrderItemInput{
			{ItemType: domain.ItemTypeProduct, ProductID: strP("prod-1"), Quantity: 1},
		})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - tồn kho không đủ", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		repo.On("AddOrderItems", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(domain.ErrInsufficientStock)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.AddOrderItems(withOrgCtx("org-123"), "ord-1", []domain.OrderItemInput{
			{ItemType: domain.ItemTypeProduct, ProductID: strP("prod-1"), Quantity: 99},
		})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - đơn bị khóa trong tx (race chốt đơn)", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		repo.On("AddOrderItems", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(domain.ErrOrderNotEditable)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.AddOrderItems(withOrgCtx("org-123"), "ord-1", []domain.OrderItemInput{
			{ItemType: domain.ItemTypeProduct, ProductID: strP("prod-1"), Quantity: 1},
		})

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})
}

func TestOrderUsecase_DeleteOrderItem(t *testing.T) {
	pendingOrder := &domain.Order{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending, SubtotalAmount: 700000, DiscountAmount: 0, TotalAmount: 700000}
	deliveryOrder := &domain.Order{ID: "ord-9", OrganizationID: "org-123", Code: "ORD-9", Status: domain.StatusDelivery, SubtotalAmount: 700000, TotalAmount: 700000}
	twoLines := func() []*domain.OrderItem {
		return []*domain.OrderItem{
			{ID: "it-1", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeProduct, ProductID: strP("prod-net"), Quantity: 2, Unit: strP("chai"), UnitPrice: 200000, LineTotal: 400000},
			{ID: "it-2", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeService, ServiceID: strP("svc-1"), Quantity: 1, UnitPrice: 300000, LineTotal: 300000},
		}
	}
	netUnits := map[string]domain.ProductUnit{
		"prod-net": {Unit: "chai", NetUnit: strP("ml"), NetAmount: f64P(1000)},
	}

	t.Run("Thành công - xóa dòng SP, nhả đúng base", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(twoLines(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(netUnits, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		var gotReleases []domain.StockDeduction
		var gotSubtotal, gotTotal float64
		repo.On("ApplyDeleteItem", mock.Anything, "org-123", "ord-1", "it-1", mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotReleases = args.Get(4).([]domain.StockDeduction)
				gotSubtotal = args.Get(5).(float64)
				gotTotal = args.Get(6).(float64)
			}).Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.DeleteOrderItem(withOrgCtx("org-123"), "ord-1", "it-1")

		assert.NoError(t, err)
		assert.Equal(t, "it-1", res)
		assert.Len(t, gotReleases, 1)
		assert.Equal(t, "prod-net", gotReleases[0].ProductID)
		assert.Equal(t, float64(2000), gotReleases[0].Quantity)
		assert.Equal(t, float64(300000), gotSubtotal)
		assert.Equal(t, float64(300000), gotTotal)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - xóa dòng service, nhả vật tư của dòng", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(twoLines(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{
			{ID: "m-1", OrderItemID: "it-2", ProductID: "prod-nhuom", Quantity: 60, UnitCostAtTime: 2000, Unit: "ml"},
		}, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		var gotReleases []domain.StockDeduction
		repo.On("ApplyDeleteItem", mock.Anything, "org-123", "ord-1", "it-2", mock.Anything, mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				gotReleases = args.Get(4).([]domain.StockDeduction)
			}).Return(nil)

		uc := NewOrderUsecase(repo, catalogOK(), new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.DeleteOrderItem(withOrgCtx("org-123"), "ord-1", "it-2")

		assert.NoError(t, err)
		assert.Equal(t, "it-2", res)
		assert.Len(t, gotReleases, 1)
		assert.Equal(t, "prod-nhuom", gotReleases[0].ProductID)
		assert.Equal(t, float64(60), gotReleases[0].Quantity)
		repo.AssertExpectations(t)
	})

	t.Run("Thất bại - cấm xóa dòng cuối cùng", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return([]*domain.OrderItem{
			{ID: "it-1", OrganizationID: "org-123", OrderID: "ord-1", ItemType: domain.ItemTypeProduct, ProductID: strP("prod-1"), Quantity: 2, UnitPrice: 150000, LineTotal: 300000},
		}, nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.DeleteOrderItem(withOrgCtx("org-123"), "ord-1", "it-1")

		assert.Error(t, err)
		assert.Empty(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - đơn delivery không được xóa", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-9").Return(deliveryOrder, nil)

		uc := NewOrderUsecase(repo, catalogOK(), new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.DeleteOrderItem(withOrgCtx("org-123"), "ord-9", "it-1")

		assert.Error(t, err)
		assert.Empty(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - dòng không thuộc đơn", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(twoLines(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), new(MockProductStore), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.DeleteOrderItem(withOrgCtx("org-123"), "ord-1", "missing")

		assert.Error(t, err)
		assert.Empty(t, res)
		assertFlatAppError(t, err, 404)
	})

	t.Run("Thất bại - giảm giá vượt tổng mới", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		discOrder := &domain.Order{ID: "ord-1", OrganizationID: "org-123", Code: "ORD-1", Status: domain.StatusPending, SubtotalAmount: 700000, DiscountAmount: 650000, TotalAmount: 50000}
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(discOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(twoLines(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(netUnits, nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.DeleteOrderItem(withOrgCtx("org-123"), "ord-1", "it-1")

		assert.Error(t, err)
		assert.Empty(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - đã thu vượt tổng mới", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(twoLines(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(netUnits, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(400000.0, nil)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.DeleteOrderItem(withOrgCtx("org-123"), "ord-1", "it-1")

		assert.Error(t, err)
		assert.Empty(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - đơn bị khóa trong tx (race chốt đơn)", func(t *testing.T) {
		repo := new(MockOrderRepository)
		products := new(MockProductStore)
		repo.On("GetOrderByID", mock.Anything, "org-123", "ord-1").Return(pendingOrder, nil)
		repo.On("GetOrderItems", mock.Anything, "org-123", "ord-1").Return(twoLines(), nil)
		repo.On("GetOrderMaterials", mock.Anything, "ord-1").Return([]*domain.OrderItemMaterial{}, nil)
		products.On("GetProductUnits", mock.Anything, "org-123", []string{"prod-net"}).Return(netUnits, nil)
		repo.On("GetTotalPaidByOrder", mock.Anything, "org-123", "ord-1").Return(0.0, nil)
		repo.On("ApplyDeleteItem", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(domain.ErrOrderNotEditable)

		uc := NewOrderUsecase(repo, catalogOK(), products, new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.DeleteOrderItem(withOrgCtx("org-123"), "ord-1", "it-1")

		assert.Error(t, err)
		assert.Empty(t, res)
		assertFlatAppError(t, err, 400)
	})
}

func TestOrderUsecase_GetOrderStats(t *testing.T) {
	t.Run("Thành công - tính % so hôm qua và % hủy/hoàn", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderStats", mock.Anything, "org-123").Return(&domain.OrderStatsResponse{
			TodayTotal: 18, TodayCompleted: 12, TodayProcessing: 6,
			TodayRevenue: 8450000, YesterdayRevenue: 7500000,
			PendingCount: 6, PendingAmount: 2300000,
			CancelRefundToday: 2, CancelRefundMonth: 3, MonthTotal: 96,
		}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetOrderStats(withOrgCtx("org-123"))

		assert.NoError(t, err)
		assert.Equal(t, int64(18), res.TodayTotal)
		assert.Equal(t, 8450000.0, res.TodayRevenue)
		assert.InDelta(t, 12.666, res.RevenueChangePct, 0.001)
		assert.InDelta(t, 3.125, res.CancelRefundRate, 0.001)
		assert.Equal(t, int64(6), res.PendingCount)
		assert.Equal(t, 2300000.0, res.PendingAmount)
		repo.AssertExpectations(t)
	})

	t.Run("Thành công - mẫu số 0 thì % bằng 0", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderStats", mock.Anything, "org-123").Return(&domain.OrderStatsResponse{
			TodayRevenue: 100000, YesterdayRevenue: 0, CancelRefundMonth: 0, MonthTotal: 0,
		}, nil)

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetOrderStats(withOrgCtx("org-123"))

		assert.NoError(t, err)
		assert.Equal(t, 0.0, res.RevenueChangePct)
		assert.Equal(t, 0.0, res.CancelRefundRate)
	})

	t.Run("Thất bại - Thiếu organization_id", func(t *testing.T) {
		uc := NewOrderUsecase(new(MockOrderRepository), catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetOrderStats(context.Background())

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - Lỗi DB", func(t *testing.T) {
		repo := new(MockOrderRepository)
		repo.On("GetOrderStats", mock.Anything, "org-123").Return(nil, errors.New("db query failed"))

		uc := NewOrderUsecase(repo, catalogOK(), productsWithPricing(), new(MockServiceStore), new(MockCustomerStore), new(MockAppointmentStore), new(MockStaffStore), new(MockSettingStore))
		res, err := uc.GetOrderStats(withOrgCtx("org-123"))

		assert.Error(t, err)
		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
	})
}
