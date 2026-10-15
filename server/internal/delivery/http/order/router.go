package order

import (
	"github.com/daidat02/server/internal/delivery/http/middlewares"
	"github.com/gin-gonic/gin"
)

func RegisterOrderRoutes(r *gin.Engine, h *OrderHandler, basePath string) {
	group := r.Group(basePath + "/orders")
	group.Use(middlewares.VerifyToken())
	{
		group.GET("", h.GetOrdersByOrgID)
		group.GET("/stats", h.GetOrderStats)
		group.POST("", h.CreateOrder)
		group.POST("/items/:itemId/staff", h.ReplaceStaffOrderItems)
		group.POST("/:id/items", h.AddOrderItems)
		group.PATCH("/:id/items/:itemId", h.UpdateOrderItemQty)
		group.DELETE("/:id/items/:itemId", h.DeleteOrderItem)
		group.GET("/:id", h.GetOrderDetail)

		group.POST("/:id/cancel", h.CancelOrder)
		group.POST("/:id/refund", h.RefundOrder)
		group.POST("/:id/complete", h.CompleteOrder)
		group.POST("/:id/payments", h.CreatePayment)
		group.POST("/materials", h.ReplaceOrderMaterials)
		group.PATCH("/:id/customer", h.UpdateOrderCustomer)

		group.GET("/pos-items", h.GetPosItemsByOrgID)
	}
}
