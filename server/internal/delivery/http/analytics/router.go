package analytics

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	"github.com/gin-gonic/gin"
)

func RegisterAnalyticsRoutes(r *gin.Engine, h *AnalyticsHandler, basePath string) {
	group := r.Group(basePath)
	group.Use(middlewares.VerifyToken())
	{
		group.GET("/reports/revenue", h.GetRevenueReport)
		group.GET("/overview", h.GetOverview)
	}
}
