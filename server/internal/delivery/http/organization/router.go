package organization

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterOrganizationRoutes(r *gin.Engine, h *OrganizationHandler, basePath string) {
	group := r.Group(basePath + "/organizations")
	{
		group.POST("", h.CreateOrganization)
		group.PATCH("/demo", middlewares.VerifyToken(), middlewares.VertifyRole(userDomain.RoleOwner), h.UpdateDemoStatus)
	}
}
