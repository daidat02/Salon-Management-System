package staff

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterStaffRoutes(r *gin.Engine, h *StaffHandler, basePath string) {
	group := r.Group(basePath + "/staff")
	group.Use(middlewares.VerifyToken())
	{
		group.GET("", h.GetStaffByOrgID)
		group.GET("/:id", h.GetStaffByID)
		group.GET("/:id/payroll", middlewares.VertifyRole(userDomain.RoleOwner), h.GetStaffPayroll)
		group.GET("/:id/service-history", h.GetStaffServiceHistory)
		group.GET("/:id/leaves", h.GetStaffLeaves)
		group.POST("", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.CreateStaff)
		group.POST("/:id/payroll", middlewares.VertifyRole(userDomain.RoleOwner), h.CreatePayroll)
		group.POST("/:id/leaves", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.CreateStaffLeave)
		group.PUT("/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.UpdateStaff)
		group.DELETE("/:id", middlewares.VertifyRole(userDomain.RoleOwner), h.DeleteStaff)

		group.POST("/salary-adjustment", middlewares.VertifyRole(userDomain.RoleOwner), h.CreateSalaryAdjustment)
		group.GET("/:id/salary-adjustments", middlewares.VertifyRole(userDomain.RoleOwner), h.GetSalaryAdjustments)
		group.DELETE("/salary-adjustment/:id", middlewares.VertifyRole(userDomain.RoleOwner), h.DeleteSalaryAdjustment)
	}
}
