package setting

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterSettingRoutes(r *gin.Engine, h *SettingHandler, basePath string) {
	group := r.Group(basePath + "/settings")
	group.Use(middlewares.VerifyToken())
	{
		group.GET("/general", h.GetGeneralSettings)
		group.PUT("/general", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.UpdateGeneralSettings)
		group.GET("/booking", h.GetBookingSettings)
		group.PUT("/booking", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.UpdateBookingSettings)
		group.GET("/notifications", h.GetNotificationSettings)
		group.PUT("/notifications", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.UpdateNotificationSettings)
		group.GET("/payment", h.GetPaymentSettings)
		group.PUT("/payment", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.UpdatePaymentSettings)
	}
}
