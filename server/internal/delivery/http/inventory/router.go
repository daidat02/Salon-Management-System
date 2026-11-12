package inventory

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/gin-gonic/gin"
)

func RegisterInventoryRoutes(r *gin.Engine, h *InventoryHandler, basePath string) {
	group := r.Group(basePath + "/inventory")
	group.Use(middlewares.VerifyToken())
	{
		group.POST("/", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.CreateDocument)
		group.GET("/", h.GetDocumentsByOrgID)
		group.GET("/transactions", h.GetTransactionsByOrgID)
		group.GET("/low-stock", h.GetLowStockProducts)
		group.GET("/stats", h.GetInventoryStats)
		group.GET("/:document_id", h.GetDocumentByID)
		group.POST("/:document_id/payments", middlewares.VertifyRole(userDomain.RoleOwner, userDomain.RoleManager), h.AddPayment)
		group.GET("/transactions/:product_id", h.GetTransactionsByProductID)
	}
}
