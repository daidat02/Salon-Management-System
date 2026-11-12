package appointment

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterAppointmentRoutes(r *gin.Engine, h *AppointmentHandler, basePath string) {
	group := r.Group(basePath + "/appointments")
	group.Use(middlewares.VerifyToken())
	{
		group.POST("", h.CreateAppointment)
		group.GET("", h.GetAppointments)
		group.GET("/weekly", h.GetWeeklySchedule)
		group.GET("/:id", h.GetAppointmentDetail)
		group.PUT("/:id", h.UpdateAppointment)
		group.PUT("/:id/reschedule", h.RescheduleAppointment)
		group.POST("/:id/cancel", h.CancelAppointment)
		group.PATCH("/:id/status", h.UpdateAppointmentStatus)
		group.DELETE("/:id", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.DeleteAppointment)
	}
}
