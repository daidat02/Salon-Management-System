package staff

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	"github.com/gin-gonic/gin"
)

func RegisterStaffRoutes(r *gin.Engine, h *StaffHandler, basePath string) {
	group := r.Group(basePath + "/staff")
	group.Use(middlewares.VerifyToken())
	{
		group.GET("", h.GetStaffByOrgID)
		group.GET("/:id", h.GetStaffByID)
		group.GET("/:id/payroll", h.GetStaffPayroll)
		group.GET("/:id/service-history", h.GetStaffServiceHistory)
		group.GET("/:id/leaves", h.GetStaffLeaves)
		group.POST("", h.CreateStaff)
		group.POST("/:id/payroll", h.CreatePayroll)
		group.POST("/:id/leaves", h.CreateStaffLeave)
		group.PUT("/:id", h.UpdateStaff)
		group.DELETE("/:id", h.DeleteStaff)

		group.POST("/salary-adjustment", h.CreateSalaryAdjustment)
		group.GET("/:id/salary-adjustments", h.GetSalaryAdjustments)
		group.DELETE("/salary-adjustment/:id", h.DeleteSalaryAdjustment)
	}
}
