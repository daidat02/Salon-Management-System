package setting

import (
	domain "github.com/daidat02/server/internal/domain/setting"
	uc "github.com/daidat02/server/internal/usecase/setting"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/response"
	"github.com/gin-gonic/gin"
)

type SettingHandler struct {
	uc *uc.SettingUseCase
}

func NewSettingHandler(uc *uc.SettingUseCase) *SettingHandler {
	return &SettingHandler{uc: uc}
}

// GetGeneralSettings godoc
// @Summary      Lấy cài đặt chung (thông tin salon + giờ làm việc)
// @Tags         Settings
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.SuccessResponse  "Cài đặt chung"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404  {object}  response.ErrorResponse    "Không tìm thấy tổ chức"
// @Failure      500  {object}  response.ErrorResponse    "Lỗi server"
// @Router       /settings/general [get]
func (h *SettingHandler) GetGeneralSettings(c *gin.Context) {
	result, err := h.uc.GetGeneralSettings(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cài đặt chung", result)
}

// GetBookingSettings godoc
// @Summary      Lấy cài đặt lịch hẹn
// @Tags         Settings
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.SuccessResponse  "Cài đặt lịch hẹn"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      500  {object}  response.ErrorResponse    "Lỗi server"
// @Router       /settings/booking [get]
func (h *SettingHandler) GetBookingSettings(c *gin.Context) {
	result, err := h.uc.GetBookingSettings(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cài đặt lịch hẹn", result)
}

// UpdateBookingSettings godoc
// @Summary      Cập nhật cài đặt lịch hẹn
// @Tags         Settings
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.BookingSettings  true  "Cấu hình lịch hẹn"
// @Success      200   {object}  response.SuccessResponse  "Cập nhật thành công"
// @Failure      400   {object}  response.ErrorResponse    "Dữ liệu không hợp lệ"
// @Failure      401   {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      500   {object}  response.ErrorResponse    "Lỗi server"
// @Router       /settings/booking [put]
func (h *SettingHandler) UpdateBookingSettings(c *gin.Context) {
	var req domain.BookingSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	result, err := h.uc.UpdateBookingSettings(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cập nhật cài đặt lịch hẹn thành công", result)
}

// GetPaymentSettings godoc
// @Summary      Lấy cài đặt thanh toán (hóa đơn + phương thức thanh toán)
// @Tags         Settings
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.SuccessResponse  "Cài đặt thanh toán"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404  {object}  response.ErrorResponse    "Không tìm thấy tổ chức"
// @Failure      500  {object}  response.ErrorResponse    "Lỗi server"
// @Router       /settings/payment [get]
func (h *SettingHandler) GetPaymentSettings(c *gin.Context) {
	result, err := h.uc.GetPaymentSetting(c.Request.Context(), "")
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cài đặt thanh toán", result)
}

// GetNotificationSettings godoc
// @Summary      Lấy cài đặt thông báo
// @Tags         Settings
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.SuccessResponse  "Cài đặt thông báo"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      500  {object}  response.ErrorResponse    "Lỗi server"
// @Router       /settings/notifications [get]
func (h *SettingHandler) GetNotificationSettings(c *gin.Context) {
	result, err := h.uc.GetNotificationSettings(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cài đặt thông báo", result)
}

// UpdateNotificationSettings godoc
// @Summary      Cập nhật cài đặt thông báo
// @Tags         Settings
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.NotificationSettings  true  "Cấu hình thông báo"
// @Success      200   {object}  response.SuccessResponse  "Cập nhật thành công"
// @Failure      400   {object}  response.ErrorResponse    "Dữ liệu không hợp lệ"
// @Failure      401   {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      500   {object}  response.ErrorResponse    "Lỗi server"
// @Router       /settings/notifications [put]
func (h *SettingHandler) UpdateNotificationSettings(c *gin.Context) {
	var req domain.NotificationSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	result, err := h.uc.UpdateNotificationSettings(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cập nhật cài đặt thông báo thành công", result)
}

// UpdateGeneralSettings godoc
// @Summary      Cập nhật cài đặt chung (thông tin salon + giờ làm việc)
// @Tags         Settings
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.GeneralSettingsResponse  true  "Cấu hình chung"
// @Success      200   {object}  response.SuccessResponse  "Cập nhật thành công"
// @Failure      400   {object}  response.ErrorResponse    "Dữ liệu không hợp lệ"
// @Failure      401   {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404   {object}  response.ErrorResponse    "Không tìm thấy tổ chức"
// @Failure      500   {object}  response.ErrorResponse    "Lỗi server"
// @Router       /settings/general [put]
func (h *SettingHandler) UpdateGeneralSettings(c *gin.Context) {
	var req domain.GeneralSettingsResponse
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	result, err := h.uc.UpdateGeneralSettings(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cập nhật cài đặt chung thành công", result)
}

// UpdatePaymentSettings godoc
// @Summary      Cập nhật cài đặt thanh toán (hóa đơn + phương thức thanh toán)
// @Tags         Settings
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.PaymentSettingsResponse  true  "Cấu hình thanh toán"
// @Success      200   {object}  response.SuccessResponse  "Cập nhật thành công"
// @Failure      400   {object}  response.ErrorResponse    "Dữ liệu không hợp lệ"
// @Failure      401   {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      500   {object}  response.ErrorResponse    "Lỗi server"
// @Router       /settings/payment [put]
func (h *SettingHandler) UpdatePaymentSettings(c *gin.Context) {
	var req domain.PaymentSettingsResponse
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	result, err := h.uc.UpdatePaymentSettings(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cập nhật cài đặt thanh toán thành công", result)
}
