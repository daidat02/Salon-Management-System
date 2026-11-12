package product

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterProductRoutes(r *gin.Engine, h *ProductHandler, basePath string) {
	group := r.Group(basePath + "/products")
	group.Use(middlewares.VerifyToken())
	{
		group.GET("", h.GetProductsByOrgID)
		group.GET("/stats", h.GetProductStats)
		group.GET("/materials", h.GetMaterialProducts)
		group.GET("/:id", h.GetProductByID)
		group.POST("", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.CreateProduct)
		group.PUT("/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.UpdateProduct)
		group.DELETE("/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.DeleteProduct)
	}
}
