package setting

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	"github.com/gin-gonic/gin"
)

func RegisterSettingRoutes(r *gin.Engine, h *SettingHandler, basePath string) {
	group := r.Group(basePath + "/settings")
	group.Use(middlewares.VerifyToken())
	{
		group.GET("/general", h.GetGeneralSettings)
		group.PUT("/general", h.UpdateGeneralSettings)
		group.GET("/booking", h.GetBookingSettings)
		group.PUT("/booking", h.UpdateBookingSettings)
		group.GET("/notifications", h.GetNotificationSettings)
		group.PUT("/notifications", h.UpdateNotificationSettings)
		group.GET("/payment", h.GetPaymentSettings)
		group.PUT("/payment", h.UpdatePaymentSettings)
	}
}
