package category

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterCategoryRoutes(r *gin.Engine, h *CategoryHandler, basePath string) {
	group := r.Group(basePath + "/categories")
	group.Use(middlewares.VerifyToken())
	{
		group.GET("", h.GetCategoriesByOrgID)
		group.POST("", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.CreateCategory)
		group.PUT("/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.UpdateCategory)
		group.DELETE("/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.DeleteCategory)
	}
}
