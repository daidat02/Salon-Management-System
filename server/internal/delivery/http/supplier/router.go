package supplier

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterSupplierRoutes(r *gin.Engine, h *SupplierHandler, basePath string) {
	group := r.Group(basePath + "/suppliers")
	group.Use(middlewares.VerifyToken())
	{
		group.GET("", h.GetSuppliersByOrgID)
		group.POST("", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.CreateSupplier)
	}
}
