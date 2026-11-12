package analytics

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterAnalyticsRoutes(r *gin.Engine, h *AnalyticsHandler, basePath string) {
	group := r.Group(basePath)
	group.Use(middlewares.VerifyToken())
	{
		group.GET("/reports/revenue", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.GetRevenueReport)
		group.GET("/overview", h.GetOverview)
	}
}
