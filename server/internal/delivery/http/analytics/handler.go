package analytics

import (
	"net/http"

	uc "github.com/daidat02/server/internal/usecase/analytics"
	"github.com/daidat02/server/pkg/response"
	"github.com/gin-gonic/gin"
)

type AnalyticsHandler struct {
	uc *uc.AnalyticsUsecase
}

func NewAnalyticsHandler(uc *uc.AnalyticsUsecase) *AnalyticsHandler {
	return &AnalyticsHandler{uc: uc}
}

// GetRevenueReport godoc
// @Summary      Báo cáo doanh thu và lợi nhuận theo kỳ
// @Description  Yêu cầu vai trò: owner hoặc manager.
// @Tags         Reports
// @Produce      json
// @Security     BearerAuth
// @Param        date_from  query     string  false  "Từ ngày (RFC3339 hoặc yyyy-MM-dd), mặc định đầu tháng"
// @Param        date_to    query     string  false  "Đến ngày (RFC3339 hoặc yyyy-MM-dd), mặc định cuối tháng"
// @Success      200  {object}  response.SuccessResponse
// @Failure      400  {object}  response.ErrorResponse
// @Failure      401  {object}  response.ErrorResponse
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /reports/revenue [get]
func (h *AnalyticsHandler) GetRevenueReport(c *gin.Context) {
	result, err := h.uc.GetRevenueReport(
		c.Request.Context(),
		c.Query("date_from"),
		c.Query("date_to"),
	)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Lấy báo cáo doanh thu thành công", result)
}

// GetOverview godoc
// @Summary      Tổng quan vận hành trong ngày
// @Description  Trả KPI hôm nay, doanh thu 7 ngày, cảnh báo tồn kho, lịch hẹn hôm nay và đơn hàng gần đây.
// @Tags         Reports
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.SuccessResponse
// @Failure      401  {object}  response.ErrorResponse
// @Failure      500  {object}  response.ErrorResponse
// @Router       /overview [get]
func (h *AnalyticsHandler) GetOverview(c *gin.Context) {
	result, err := h.uc.GetOverview(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Lấy tổng quan thành công", result)
}
