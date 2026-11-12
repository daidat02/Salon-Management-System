package service

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterServiceRoutes(r *gin.Engine, h *ServiceHandler, basePath string) {
	group := r.Group(basePath + "/services")
	group.Use(middlewares.VerifyToken())
	{
		group.GET("", h.GetServicesByOrgID)
		group.GET("/stats", h.GetServiceStats)
		group.GET("/:id/details", h.GetServiceDetails)
		group.POST("", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.CreateService)
		group.PUT("/:id/materials", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.ReplaceServiceMaterials)
		group.PUT("/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.UpdateService)
		group.DELETE("/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.DeleteService)
	}
}
