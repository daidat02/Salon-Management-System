package supplier

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	"github.com/gin-gonic/gin"
)

func RegisterSupplierRoutes(r *gin.Engine, h *SupplierHandler, basePath string) {
	group := r.Group(basePath + "/suppliers")
	group.Use(middlewares.VerifyToken())
	{
		group.GET("", h.GetSuppliersByOrgID)
		group.POST("", h.CreateSupplier)
	}
}
