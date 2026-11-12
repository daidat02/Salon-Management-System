package cashflow

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterCashFlowRoutes(r *gin.Engine, h *CashFlowHandler, basePath string) {
	group := r.Group(basePath)
	group.Use(middlewares.VerifyToken())
	{
		// Phiếu thu/chi
		group.POST("/cashflows", h.CreateCashFlow)
		group.GET("/cashflows", h.GetCashFlows)
		group.GET("/cashflows/", h.GetCashFlows)
		group.GET("/cashflows/stats", h.GetCashFlowStats)
		group.GET("/cashflows/:id", h.GetCashFlowByID)
		group.POST("/cashflows/:id/approve", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.ApproveCashFlow)
		group.POST("/cashflows/:id/cancel", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.CancelCashFlow)

		// Quỹ
		group.POST("/funds", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.CreateFund)
		group.GET("/funds", h.GetFunds)
		group.GET("/funds/history", h.GetFundMovementHistory)
		group.GET("/funds/:id", h.GetFundByID)
		group.PUT("/funds/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.UpdateFund)
		group.DELETE("/funds/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.DeactivateFund)

		// Danh mục thu/chi
		group.POST("/cashflow-categories", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.CreateCashFlowCategory)
		group.GET("/cashflow-categories", h.GetCashFlowCategories)
		group.PUT("/cashflow-categories/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.UpdateCashFlowCategory)
		group.DELETE("/cashflow-categories/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.DeleteCashFlowCategory)
	}
}
