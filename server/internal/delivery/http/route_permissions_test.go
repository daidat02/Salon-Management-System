package http_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/daidat02/server/internal/delivery/http/analytics"
	"github.com/daidat02/server/internal/delivery/http/appointment"
	"github.com/daidat02/server/internal/delivery/http/cashflow"
	"github.com/daidat02/server/internal/delivery/http/customer"
	"github.com/daidat02/server/internal/delivery/http/inventory"
	"github.com/daidat02/server/internal/delivery/http/order"
	"github.com/daidat02/server/internal/delivery/http/organization"
	"github.com/daidat02/server/internal/delivery/http/service"
	"github.com/daidat02/server/internal/delivery/http/setting"
	"github.com/daidat02/server/internal/delivery/http/staff"
	"github.com/daidat02/server/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSensitiveRoutesRejectDisallowedRoles(t *testing.T) {
	const secret = "route-permission-test-secret"
	utils.InitJWT(secret, time.Hour, 24*time.Hour)

	var settingHandler *setting.SettingHandler
	var staffHandler *staff.StaffHandler
	var cashflowHandler *cashflow.CashFlowHandler
	var orderHandler *order.OrderHandler
	var inventoryHandler *inventory.InventoryHandler
	var customerHandler *customer.CustomerHandler
	var appointmentHandler *appointment.AppointmentHandler
	var analyticsHandler *analytics.AnalyticsHandler
	var serviceHandler *service.ServiceHandler
	var organizationHandler *organization.OrganizationHandler

	tests := []struct {
		name     string
		role     string
		method   string
		path     string
		register func(*gin.Engine)
	}{
		{
			name:   "lễ tân không được sửa cài đặt",
			role:   "receptionist",
			method: http.MethodPut,
			path:   "/settings/general",
			register: func(r *gin.Engine) {
				setting.RegisterSettingRoutes(r, settingHandler, "")
			},
		},
		{
			name:   "lễ tân không được tạo nhân viên",
			role:   "receptionist",
			method: http.MethodPost,
			path:   "/staff",
			register: func(r *gin.Engine) {
				staff.RegisterStaffRoutes(r, staffHandler, "")
			},
		},
		{
			name:   "quản lý không được xóa nhân viên",
			role:   "manager",
			method: http.MethodDelete,
			path:   "/staff/staff-1",
			register: func(r *gin.Engine) {
				staff.RegisterStaffRoutes(r, staffHandler, "")
			},
		},
		{
			name:   "quản lý không được xem bảng lương",
			role:   "manager",
			method: http.MethodGet,
			path:   "/staff/staff-1/payroll",
			register: func(r *gin.Engine) {
				staff.RegisterStaffRoutes(r, staffHandler, "")
			},
		},
		{
			name:   "lễ tân không được duyệt phiếu thu chi",
			role:   "receptionist",
			method: http.MethodPost,
			path:   "/cashflows/cashflow-1/approve",
			register: func(r *gin.Engine) {
				cashflow.RegisterCashFlowRoutes(r, cashflowHandler, "")
			},
		},
		{
			name:   "quản lý không được hoàn tiền",
			role:   "manager",
			method: http.MethodPost,
			path:   "/orders/order-1/refund",
			register: func(r *gin.Engine) {
				order.RegisterOrderRoutes(r, orderHandler, "")
			},
		},
		{
			name:   "lễ tân không được tạo phiếu kho",
			role:   "receptionist",
			method: http.MethodPost,
			path:   "/inventory/",
			register: func(r *gin.Engine) {
				inventory.RegisterInventoryRoutes(r, inventoryHandler, "")
			},
		},
		{
			name:   "lễ tân không được xóa khách hàng",
			role:   "receptionist",
			method: http.MethodDelete,
			path:   "/customers/customer-1",
			register: func(r *gin.Engine) {
				customer.RegisterCustomerRoutes(r, customerHandler, "")
			},
		},
		{
			name:   "lễ tân không được xóa lịch hẹn",
			role:   "receptionist",
			method: http.MethodDelete,
			path:   "/appointments/appointment-1",
			register: func(r *gin.Engine) {
				appointment.RegisterAppointmentRoutes(r, appointmentHandler, "")
			},
		},
		{
			name:   "lễ tân không được sửa định mức dịch vụ",
			role:   "receptionist",
			method: http.MethodPut,
			path:   "/services/svc-1/materials",
			register: func(r *gin.Engine) {
				service.RegisterServiceRoutes(r, serviceHandler, "")
			},
		},
		{
			name:   "quản lý không được xóa dữ liệu mẫu",
			role:   "manager",
			method: http.MethodPatch,
			path:   "/organizations/demo",
			register: func(r *gin.Engine) {
				organization.RegisterOrganizationRoutes(r, organizationHandler, "")
			},
		},
		{
			name:   "lễ tân không được xóa dữ liệu mẫu",
			role:   "receptionist",
			method: http.MethodPatch,
			path:   "/organizations/demo",
			register: func(r *gin.Engine) {
				organization.RegisterOrganizationRoutes(r, organizationHandler, "")
			},
		},
		{
			name:   "lễ tân không được xem báo cáo doanh thu",
			role:   "receptionist",
			method: http.MethodGet,
			path:   "/reports/revenue",
			register: func(r *gin.Engine) {
				analytics.RegisterAnalyticsRoutes(r, analyticsHandler, "")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			r := gin.New()
			tt.register(r)

			token, err := utils.GenerateAccessToken("user-1", "org-1", tt.role)
			require.NoError(t, err)

			req := httptest.NewRequest(tt.method, tt.path, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, http.StatusForbidden, w.Code)
		})
	}
}
