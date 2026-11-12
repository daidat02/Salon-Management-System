package service

import (
	"strconv"

	domain "github.com/daidat02/server/internal/domain/service"
	uc "github.com/daidat02/server/internal/usecase/service"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/response"
	"github.com/gin-gonic/gin"
)

type ServiceHandler struct {
	uc *uc.ServiceUsecase
}

func NewServiceHandler(uc *uc.ServiceUsecase) *ServiceHandler {
	return &ServiceHandler{
		uc: uc,
	}
}

func boolOrDefault(v *bool, def bool) bool {
	if v == nil {
		return def
	}
	return *v
}

// CreateService godoc
// @Summary      Tạo dịch vụ
// @Description  Yêu cầu vai trò: owner hoặc manager.
// @Tags         Services
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.CreateServiceRequest  true  "Thông tin dịch vụ"
// @Success      200   {object}  response.SuccessResponse     "Tạo dịch vụ thành công"
// @Failure      400   {object}  response.ErrorResponse       "Dữ liệu không hợp lệ / thiếu organization"
// @Failure      401   {object}  response.ErrorResponse       "Thiếu token / token không hợp lệ"
// @Failure      500   {object}  response.ErrorResponse       "Lỗi server"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /services [post]
func (h *ServiceHandler) CreateService(c *gin.Context) {
	var req domain.CreateServiceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	service := &domain.Service{
		CategoryID:      req.CategoryID,
		Name:            req.Name,
		Description:     req.Description,
		DurationMinutes: req.DurationMinutes,
		BufferMinutes:   req.BufferMinutes,
		Price:           req.Price,
		IsActive:        boolOrDefault(req.IsActive, true),
	}

	materials := make([]*domain.ServiceMaterialInput, len(req.Materials))
	for i, m := range req.Materials {
		materials[i] = &domain.ServiceMaterialInput{
			ProductID: m.ProductID,
			Quantity:  m.Quantity,
			Unit:      m.Unit,
		}
	}
	result, err := h.uc.CreateService(c.Request.Context(), service, materials)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Tạo dịch vụ thành công", result)
}

// GetServicesByOrgID godoc
// @Summary      Lấy danh sách dịch vụ (phân trang + lọc + sắp xếp)
// @Tags         Services
// @Produce      json
// @Security     BearerAuth
// @Param        page       query     int     false  "Trang (mặc định 1)"
// @Param        page_size  query     int     false  "Số dòng/trang (mặc định 20, tối đa 100)"
// @Param        search       query     string  false  "Tìm theo tên hoặc mô tả (ILIKE)"
// @Param        status       query     string  false  "Lọc trạng thái" Enums(active,inactive)
// @Param        category_id  query     string  false  "Lọc theo ID danh mục dịch vụ"
// @Param        sort         query     string  false  "Sắp xếp" Enums(created_at_desc,price_asc,price_desc,duration_asc,name_asc)
// @Success      200        {object}  response.SuccessResponse  "Danh sách dịch vụ kèm phân trang {data, page, page_size, total, total_pages}"
// @Failure      400        {object}  response.ErrorResponse    "Thiếu organization"
// @Failure      401        {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      500        {object}  response.ErrorResponse    "Lỗi server"
// @Router       /services [get]
func (h *ServiceHandler) GetServicesByOrgID(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.DefaultQuery("search", "")
	status := c.DefaultQuery("status", "")
	categoryID := c.DefaultQuery("category_id", "")
	sort := c.DefaultQuery("sort", "created_at_desc")

	result, err := h.uc.GetServicesByOrgID(c.Request.Context(), search, status, categoryID, sort, page, pageSize)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Danh sách dịch vụ", result)
}

// GetServiceStats godoc
// @Summary      Thống kê tổng quan dịch vụ
// @Tags         Services
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.SuccessResponse  "Thống kê dịch vụ"
// @Failure      400  {object}  response.ErrorResponse    "Thiếu organization"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Router       /services/stats [get]
func (h *ServiceHandler) GetServiceStats(c *gin.Context) {
	result, err := h.uc.GetServiceStats(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Thống kê dịch vụ", result)
}

// UpdateService godoc
// @Summary      Cập nhật dịch vụ
// @Description  Yêu cầu vai trò: owner hoặc manager.
// @Tags         Services
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                      true  "ID dịch vụ"
// @Param        body  body      domain.UpdateServiceRequest  true  "Thông tin cập nhật"
// @Success      200   {object}  response.SuccessResponse     "Cập nhật dịch vụ thành công"
// @Failure      400   {object}  response.ErrorResponse       "Thiếu id / dữ liệu không hợp lệ"
// @Failure      401   {object}  response.ErrorResponse       "Thiếu token / token không hợp lệ"
// @Failure      404   {object}  response.ErrorResponse       "Không tìm thấy dịch vụ"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /services/{id} [put]
func (h *ServiceHandler) UpdateService(c *gin.Context) {
	id := c.Param("id")

	var req domain.UpdateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	service := &domain.Service{
		CategoryID:      req.CategoryID,
		Name:            req.Name,
		Description:     req.Description,
		DurationMinutes: req.DurationMinutes,
		BufferMinutes:   req.BufferMinutes,
		Price:           req.Price,
		IsActive:        boolOrDefault(req.IsActive, true),
	}

	result, err := h.uc.UpdateService(c.Request.Context(), id, service)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cập nhật dịch vụ thành công", result)
}

// ReplaceServiceMaterials godoc
// @Summary      Thay định mức nguyên vật liệu của dịch vụ
// @Description  Yêu cầu vai trò: owner hoặc manager. Thay toàn bộ định mức trong 1 transaction; mảng rỗng xóa hết. Chỉ ảnh hưởng đơn tạo sau thời điểm cập nhật.
// @Tags         Services
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                                  true  "ID dịch vụ"
// @Param        body  body      domain.ReplaceServiceMaterialsRequest   true  "Danh sách định mức mới"
// @Success      200   {object}  response.SuccessResponse                 "Cập nhật định mức thành công"
// @Failure      400   {object}  response.ErrorResponse                   "Thiếu id / dữ liệu không hợp lệ / product_id bị trùng"
// @Failure      401   {object}  response.ErrorResponse                   "Thiếu token / token không hợp lệ"
// @Failure      403   {object}  response.ErrorResponse                   "Không có quyền truy cập"
// @Failure      404   {object}  response.ErrorResponse                   "Không tìm thấy dịch vụ hoặc sản phẩm"
// @Failure      500   {object}  response.ErrorResponse                   "Lỗi server"
// @Router       /services/{id}/materials [put]
func (h *ServiceHandler) ReplaceServiceMaterials(c *gin.Context) {
	id := c.Param("id")

	var req domain.ReplaceServiceMaterialsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	materials := make([]*domain.ServiceMaterialInput, len(req.Materials))
	for i, m := range req.Materials {
		materials[i] = &domain.ServiceMaterialInput{
			ProductID: m.ProductID,
			Quantity:  m.Quantity,
			Unit:      m.Unit,
		}
	}

	result, err := h.uc.ReplaceServiceMaterials(c.Request.Context(), id, materials)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cập nhật định mức nguyên vật liệu thành công", gin.H{
		"materials": result,
	})
}

// DeleteService godoc
// @Summary      Xóa dịch vụ
// @Description  Yêu cầu vai trò: owner hoặc manager.
// @Tags         Services
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string                  true  "ID dịch vụ"
// @Success      200  {object}  response.SuccessResponse  "Xóa dịch vụ thành công"
// @Failure      400  {object}  response.ErrorResponse    "Thiếu id"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404  {object}  response.ErrorResponse    "Không tìm thấy dịch vụ"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /services/{id} [delete]
func (h *ServiceHandler) DeleteService(c *gin.Context) {
	id := c.Param("id")

	deletedID, err := h.uc.DeleteService(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Xóa dịch vụ thành công", gin.H{"id": deletedID})
}

// GetServiceDetails godoc
// @Summary      Lấy chi tiết dịch vụ và nguyên vật liệu
// @Tags         Services
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string                  true  "ID dịch vụ"
// @Success      200  {object}  response.SuccessResponse  "Chi tiết dịch vụ và danh sách nguyên vật liệu"
// @Failure      400  {object}  response.ErrorResponse    "Thiếu id"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404  {object}  response.ErrorResponse    "Không tìm thấy dịch vụ"
// @Router       /services/{id}/details [get]
func (h *ServiceHandler) GetServiceDetails(c *gin.Context) {
	serviceID := c.Param("id")
	service, materials, err := h.uc.GetServiceDetails(c.Request.Context(), serviceID)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}

	response.Success(c, 200, "Chi tiết dịch vụ", gin.H{
		"service":   service,
		"materials": materials,
	})
}
