package supplier

import (
	"strconv"

	domain "github.com/daidat02/server/internal/domain/supplier"
	uc "github.com/daidat02/server/internal/usecase/supplier"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/response"
	"github.com/gin-gonic/gin"
)

type SupplierHandler struct {
	uc *uc.SupplierUsecase
}

func NewSupplierHandler(uc *uc.SupplierUsecase) *SupplierHandler {
	return &SupplierHandler{uc: uc}
}

// CreateSupplier godoc
// @Summary      Tạo nhà cung cấp
// @Description  Yêu cầu vai trò: owner hoặc manager.
// @Tags         Suppliers
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.CreateSupplierRequest  true  "Thông tin nhà cung cấp"
// @Success      200   {object}  response.SuccessResponse      "Tạo nhà cung cấp thành công"
// @Failure      400   {object}  response.ErrorResponse        "Dữ liệu không hợp lệ / thiếu organization"
// @Failure      401   {object}  response.ErrorResponse        "Thiếu token / token không hợp lệ"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /suppliers [post]
func (h *SupplierHandler) CreateSupplier(c *gin.Context) {
	var req domain.CreateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	result, err := h.uc.CreateSupplier(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Tạo nhà cung cấp thành công", result)
}

// GetSuppliersByOrgID godoc
// @Summary      Lấy danh sách nhà cung cấp (tìm kiếm + phân trang)
// @Tags         Suppliers
// @Produce      json
// @Security     BearerAuth
// @Param        search     query     string  false  "Tìm theo tên hoặc số điện thoại"
// @Param        page       query     int     false  "Trang (mặc định 1)"
// @Param        page_size  query     int     false  "Số dòng/trang (mặc định 20, tối đa 100)"
// @Success      200        {object}  response.SuccessResponse  "Danh sách nhà cung cấp kèm phân trang"
// @Failure      400        {object}  response.ErrorResponse    "Thiếu organization"
// @Failure      401        {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Router       /suppliers [get]
func (h *SupplierHandler) GetSuppliersByOrgID(c *gin.Context) {
	search := c.DefaultQuery("search", "")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	result, err := h.uc.GetSuppliersByOrgID(c.Request.Context(), search, page, pageSize)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Danh sách nhà cung cấp", result)
}
