package cashflow

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
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
		group.POST("/cashflows/:id/approve", h.ApproveCashFlow)
		group.POST("/cashflows/:id/cancel", h.CancelCashFlow)

		// Quỹ
		group.POST("/funds", h.CreateFund)
		group.GET("/funds", h.GetFunds)
		group.GET("/funds/history", h.GetFundMovementHistory)
		group.GET("/funds/:id", h.GetFundByID)
		group.PUT("/funds/:id", h.UpdateFund)
		group.DELETE("/funds/:id", h.DeactivateFund)

		// Danh mục thu/chi
		group.POST("/cashflow-categories", h.CreateCashFlowCategory)
		group.GET("/cashflow-categories", h.GetCashFlowCategories)
		group.PUT("/cashflow-categories/:id", h.UpdateCashFlowCategory)
		group.DELETE("/cashflow-categories/:id", h.DeleteCashFlowCategory)
	}
}
