package organization

import (
	domain "github.com/daidat02/server/internal/domain/organization"
	uc "github.com/daidat02/server/internal/usecase/organization"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/response"
	"github.com/gin-gonic/gin"
)

type OrganizationHandler struct {
	uc *uc.OrganizationUseCase
}

func NewOrganizationHandler(uc *uc.OrganizationUseCase) *OrganizationHandler {
	return &OrganizationHandler{uc: uc}
}

// CreateOrganization godoc
// @Summary      Tạo tổ chức mới kèm tài khoản owner và settings mặc định
// @Description  Tạo organization + user owner (role=owner) + business_hours/notification/appointment/receipt settings trong cùng transaction.
// @Tags         Organizations
// @Accept       json
// @Produce      json
// @Param        body  body      domain.CreateOrganizationRequest  true  "Thông tin tổ chức + tài khoản owner (owner_phone, owner_password)"
// @Success      200   {object}  response.SuccessResponse          "Tạo tổ chức thành công"
// @Failure      400   {object}  response.ErrorResponse            "Dữ liệu không hợp lệ"
// @Failure      409   {object}  response.ErrorResponse            "Slug đã tồn tại"
// @Failure      500   {object}  response.ErrorResponse            "Lỗi server"
// @Router       /organizations [post]
func (h *OrganizationHandler) CreateOrganization(c *gin.Context) {
	var req domain.CreateOrganizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	result, err := h.uc.CreateOrganization(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Tạo tổ chức thành công", result)
}

// UpdateDemoStatus godoc
// @Summary      Tắt chế độ dữ liệu mẫu
// @Description  Yêu cầu vai trò owner. Xóa toàn bộ dữ liệu nghiệp vụ của tổ chức, giữ cấu hình, reset quỹ và chuyển is_demo=false.
// @Tags         Organizations
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.UpdateDemoStatusRequest  true  "Trạng thái dữ liệu mẫu (chỉ hỗ trợ false)"
// @Success      200   {object}  response.SuccessResponse       "Đã xóa dữ liệu mẫu"
// @Failure      400   {object}  response.ErrorResponse         "Dữ liệu không hợp lệ"
// @Failure      401   {object}  response.ErrorResponse         "Thiếu token / token không hợp lệ"
// @Failure      403   {object}  response.ErrorResponse         "Không có quyền truy cập"
// @Failure      404   {object}  response.ErrorResponse         "Không tìm thấy tổ chức"
// @Failure      500   {object}  response.ErrorResponse         "Lỗi server"
// @Router       /organizations/demo [patch]
func (h *OrganizationHandler) UpdateDemoStatus(c *gin.Context) {
	var req domain.UpdateDemoStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	result, err := h.uc.UpdateDemoStatus(c.Request.Context(), *req.IsDemo)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Đã xóa dữ liệu mẫu", result)
}
