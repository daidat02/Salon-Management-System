package organization

import (
	"github.com/gin-gonic/gin"
)

func RegisterOrganizationRoutes(r *gin.Engine, h *OrganizationHandler, basePath string) {
	group := r.Group(basePath + "/organizations")
	{
		group.POST("", h.CreateOrganization)
	}
}
