package user

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(r *gin.Engine, h *UserHandler, basePath string) {
	group := r.Group(basePath)

	group.POST("/register", h.CreateUser)
	group.POST("/login", h.Login)
	group.POST("/refresh-token", h.RefreshToken)

	protected := r.Group(basePath)
	protected.Use(middlewares.VerifyToken())
	protected.POST("/logout", h.Logout)
}
