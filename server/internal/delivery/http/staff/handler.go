package staff

import (
	"log"
	"strconv"
	"strings"
	"time"

	domain "github.com/daidat02/server/internal/domain/staff"
	uc "github.com/daidat02/server/internal/usecase/staff"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/response"
	"github.com/gin-gonic/gin"
)

type StaffHandler struct {
	uc *uc.StaffUsecase
}

func NewStaffHandler(uc *uc.StaffUsecase) *StaffHandler {
	return &StaffHandler{
		uc: uc,
	}
}

// parseOptionalDate nhận yyyy-MM-dd hoặc RFC3339; chuỗi rỗng trả về nil.
func parseOptionalDate(raw *string) (*time.Time, error) {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil, nil
	}
	value := strings.TrimSpace(*raw)
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		parsed, err = time.Parse(time.RFC3339, value)
	}
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

// parseHireDate nhận yyyy-MM-dd hoặc RFC3339; chuỗi rỗng trả về zero time.
func parseHireDate(raw *string) (time.Time, error) {
	parsed, err := parseOptionalDate(raw)
	if err != nil || parsed == nil {
		return time.Time{}, err
	}
	return *parsed, nil
}

// CreateStaff godoc
// @Summary      Tạo nhân viên
// @Description  Yêu cầu vai trò: owner hoặc manager.
// @Tags         Staff
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.CreateStaffRequest  true  "Thông tin nhân viên"
// @Success      200   {object}  response.SuccessResponse   "Tạo nhân viên thành công"
// @Failure      400   {object}  response.ErrorResponse     "Dữ liệu không hợp lệ / thiếu organization"
// @Failure      401   {object}  response.ErrorResponse     "Thiếu token / token không hợp lệ"
// @Failure      500   {object}  response.ErrorResponse     "Lỗi server"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /staff [post]
func (h *StaffHandler) CreateStaff(c *gin.Context) {
	var req domain.CreateStaffRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		c.Abort()
		return
	}

	birthDate, err := parseOptionalDate(req.BirthDate)
	if err != nil {
		response.Error(c, apperror.New(400, "Ngày sinh không hợp lệ", err))
		c.Abort()
		return
	}
	hireDate, err := parseHireDate(req.HireDate)
	if err != nil {
		response.Error(c, apperror.New(400, "Ngày vào làm không hợp lệ", err))
		c.Abort()
		return
	}

	staff := &domain.Staff{
		FullName:          req.FullName,
		Phone:             req.Phone,
		Email:             req.Email,
		BirthDate:         birthDate,
		Gender:            req.Gender,
		Address:           req.Address,
		Position:          req.Position,
		EmploymentType:    req.EmploymentType,
		CommissionRate:    req.CommissionRate,
		BaseSalary:        req.BaseSalary,
		BankName:          req.BankName,
		BankAccountNumber: req.BankAccountNumber,
		BankAccountHolder: req.BankAccountHolder,
		Status:            req.Status,
		HireDate:          hireDate,
	}

	result, err := h.uc.CreateStaff(c.Request.Context(), staff)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Tạo nhân viên thành công", result)
}

// GetStaffByOrgID godoc
// @Summary      Lấy danh sách nhân viên (phân trang + lọc + sắp xếp)
// @Tags         Staff
// @Produce      json
// @Security     BearerAuth
// @Param        page       query     int     false  "Trang (mặc định 1)"
// @Param        page_size  query     int     false  "Số dòng/trang (mặc định 20, tối đa 100)"
// @Param        search     query     string  false  "Tìm theo tên, mã, SĐT hoặc vị trí (ILIKE)"
// @Param        status     query     string  false  "Lọc trạng thái" Enums(active,inactive)
// @Param        sort       query     string  false  "Sắp xếp" Enums(created_at_desc,name_asc,name_desc,hire_date_asc,hire_date_desc)
// @Success      200        {object}  response.SuccessResponse  "Danh sách nhân viên kèm phân trang {data, page, page_size, total, total_pages}"
// @Failure      400        {object}  response.ErrorResponse    "Thiếu organization"
// @Failure      401        {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      500        {object}  response.ErrorResponse    "Lỗi server"
// @Router       /staff [get]
func (h *StaffHandler) GetStaffByOrgID(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.DefaultQuery("search", "")
	status := c.DefaultQuery("status", "")
	sort := c.DefaultQuery("sort", "created_at_desc")

	result, err := h.uc.GetStaffByOrgID(c.Request.Context(), search, status, sort, page, pageSize)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Danh sách nhân viên", result)
}

// GetStaffByID godoc
// @Summary      Lấy thông tin chi tiết nhân viên
// @Tags         Staff
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string                  true  "ID nhân viên"
// @Success      200  {object}  response.SuccessResponse  "Thông tin chi tiết nhân viên"
// @Failure      400  {object}  response.ErrorResponse    "Thiếu id"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404  {object}  response.ErrorResponse    "Không tìm thấy nhân viên"
// @Failure      500  {object}  response.ErrorResponse    "Lỗi server"
// @Router       /staff/{id} [get]
func (h *StaffHandler) GetStaffByID(c *gin.Context) {
	result, err := h.uc.GetStaffByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Chi tiết nhân viên", result)
}

// UpdateStaff godoc
// @Summary      Cập nhật nhân viên
// @Description  Yêu cầu vai trò: owner hoặc manager.
// @Tags         Staff
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                    true  "ID nhân viên"
// @Param        body  body      domain.UpdateStaffRequest  true  "Thông tin cập nhật"
// @Success      200   {object}  response.SuccessResponse   "Cập nhật nhân viên thành công"
// @Failure      400   {object}  response.ErrorResponse     "Thiếu id / dữ liệu không hợp lệ"
// @Failure      401   {object}  response.ErrorResponse     "Thiếu token / token không hợp lệ"
// @Failure      404   {object}  response.ErrorResponse     "Không tìm thấy nhân viên"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /staff/{id} [put]
func (h *StaffHandler) UpdateStaff(c *gin.Context) {
	id := c.Param("id")

	var req domain.UpdateStaffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	birthDate, err := parseOptionalDate(req.BirthDate)
	if err != nil {
		response.Error(c, apperror.New(400, "Ngày sinh không hợp lệ", err))
		c.Abort()
		return
	}
	hireDate, err := parseHireDate(req.HireDate)
	if err != nil {
		response.Error(c, apperror.New(400, "Ngày vào làm không hợp lệ", err))
		c.Abort()
		return
	}

	staff := &domain.Staff{
		Code:              req.Code,
		FullName:          req.FullName,
		Phone:             req.Phone,
		Email:             req.Email,
		BirthDate:         birthDate,
		Gender:            req.Gender,
		Address:           req.Address,
		Position:          req.Position,
		EmploymentType:    req.EmploymentType,
		CommissionRate:    req.CommissionRate,
		BaseSalary:        req.BaseSalary,
		BankName:          req.BankName,
		BankAccountNumber: req.BankAccountNumber,
		BankAccountHolder: req.BankAccountHolder,
		Status:            req.Status,
		HireDate:          hireDate,
	}

	result, err := h.uc.UpdateStaff(c.Request.Context(), id, staff)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Cập nhật nhân viên thành công", result)
}

type CreatePayrollRequest struct {
	TargetMonth string `json:"target_month" binding:"required"`
	Status      string `json:"status" binding:"omitempty,oneof=draft approved"`
}

type CreatePayrollDraftsRequest struct {
	TargetMonth string `json:"target_month" binding:"required"`
}

// CreatePayroll godoc
// @Summary      Tạo bảng lương nhân viên
// @Description  Yêu cầu vai trò: owner.
// @Tags         Staff
// @Produce      json
// @Security     BearerAuth
// @Param        id            path      string                  true  "ID nhân viên"
// @Param        body          body      CreatePayrollRequest    true  "Kỳ bảng lương (yyyy-MM) và trạng thái (draft | approved)"
// @Success      200           {object}  response.SuccessResponse  "Tạo bảng lương thành công"
// @Failure      400           {object}  response.ErrorResponse    "Thiếu id / thiếu target_month / tham số không hợp lệ"
// @Failure      401           {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404           {object}  response.ErrorResponse    "Không tìm thấy nhân viên"
// @Failure      409           {object}  response.ErrorResponse    "Đã tồn tại bảng lương của nhân viên trong kỳ này"
// @Failure      500           {object}  response.ErrorResponse    "Lỗi server"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /staff/{id}/payroll [post]
func (h *StaffHandler) CreatePayroll(c *gin.Context) {
	var req CreatePayrollRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Thiếu target_month hoặc dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	err := h.uc.CreatePayroll(
		c.Request.Context(),
		c.Param("id"),
		req.TargetMonth,
		req.Status,
	)

	if err != nil {
		response.Error(c, err)
		log.Printf("Lỗi khi tạo bảng lương: %v", err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Lưu bảng lương nhân viên thành công", nil)
}

// CreatePayrollDrafts godoc
// @Summary      Tạo bảng lương nháp hàng loạt
// @Description  Yêu cầu vai trò: owner. Bỏ qua nhân viên đã có bảng lương trong kỳ.
// @Tags         Staff
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      CreatePayrollDraftsRequest  true  "Kỳ lương (yyyy-MM)"
// @Success      200   {object}  response.SuccessResponse    "Tạo bảng lương nháp thành công"
// @Failure      400   {object}  response.ErrorResponse      "Kỳ lương không hợp lệ hoặc ở tương lai"
// @Failure      401   {object}  response.ErrorResponse      "Thiếu token / token không hợp lệ"
// @Failure      403   {object}  response.ErrorResponse      "Không có quyền truy cập"
// @Failure      500   {object}  response.ErrorResponse      "Lỗi server"
// @Router       /staff/payrolls-draft [post]
func (h *StaffHandler) CreatePayrollDrafts(c *gin.Context) {
	var req CreatePayrollDraftsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Thiếu target_month hoặc dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	result, err := h.uc.CreatePayrollDrafts(c.Request.Context(), req.TargetMonth)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Tạo bảng lương nháp thành công", result)
}

// GetStaffPayroll godoc
// @Summary      Lấy bảng lương nhân viên theo kỳ
// @Description  Yêu cầu vai trò: owner.
// @Tags         Staff
// @Produce      json
// @Security     BearerAuth
// @Param        id            path   string  true   "ID nhân viên"
// @Param        period_month  query  string  true   "Kỳ lương (yyyy-MM)"
// @Success      200  {object}  response.SuccessResponse  "Bảng lương nhân viên"
// @Failure      400  {object}  response.ErrorResponse    "Thiếu id / tham số không hợp lệ"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404  {object}  response.ErrorResponse    "Không tìm thấy nhân viên"
// @Failure      500  {object}  response.ErrorResponse    "Lỗi server"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /staff/{id}/payroll [get]
func (h *StaffHandler) GetStaffPayroll(c *gin.Context) {
	result, err := h.uc.GetStaffPayroll(
		c.Request.Context(),
		c.Param("id"),
		c.Query("period_month"),
	)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Bảng lương nhân viên", result)
}

// GetStaffServiceHistory godoc
// @Summary      Lấy lịch sử dịch vụ nhân viên đã thực hiện
// @Tags         Staff
// @Produce      json
// @Security     BearerAuth
// @Param        id         path   string  true   "ID nhân viên"
// @Param        date_from  query  string  false  "Từ ngày (yyyy-MM-dd hoặc RFC3339), mặc định đầu tháng"
// @Param        date_to    query  string  false  "Đến ngày (yyyy-MM-dd hoặc RFC3339), mặc định cuối tháng"
// @Param        search     query  string  false  "Tìm theo mã đơn, tên khách hoặc tên dịch vụ"
// @Param        page       query  int     false  "Trang (mặc định 1)"
// @Param        page_size  query  int     false  "Số dòng/trang (mặc định 20, tối đa 100)"
// @Success      200  {object}  response.SuccessResponse  "Lịch sử dịch vụ kèm tổng hợp và phân trang"
// @Failure      400  {object}  response.ErrorResponse    "Thiếu id / tham số không hợp lệ"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404  {object}  response.ErrorResponse    "Không tìm thấy nhân viên"
// @Failure      500  {object}  response.ErrorResponse    "Lỗi server"
// @Router       /staff/{id}/service-history [get]
func (h *StaffHandler) GetStaffServiceHistory(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	result, err := h.uc.GetStaffServiceHistory(
		c.Request.Context(),
		c.Param("id"),
		c.Query("date_from"),
		c.Query("date_to"),
		c.Query("search"),
		page,
		pageSize,
	)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Lịch sử dịch vụ nhân viên", result)
}

// DeleteStaff godoc
// @Summary      Xóa mềm nhân viên
// @Description  Yêu cầu vai trò: owner.
// @Tags         Staff
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string                  true  "ID nhân viên"
// @Success      200  {object}  response.SuccessResponse  "Xóa nhân viên thành công"
// @Failure      400  {object}  response.ErrorResponse    "Thiếu id"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404  {object}  response.ErrorResponse    "Không tìm thấy nhân viên"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /staff/{id} [delete]
func (h *StaffHandler) DeleteStaff(c *gin.Context) {
	id := c.Param("id")

	deletedID, err := h.uc.DeleteStaff(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Xóa nhân viên thành công", gin.H{"id": deletedID})
}

// CreateSalaryAdjustment godoc
// @Summary      Tạo điều chỉnh lương nhân viên
// @Description  Yêu cầu vai trò: owner.
// @Tags         Staff
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.SalaryAdjustmentRequest  true  "Thông tin điều chỉnh lương"
// @Success      200   {object}  response.SuccessResponse   "Tạo điều chỉnh lương thành công"
// @Failure      400   {object}  response.ErrorResponse     "Dữ liệu không hợp lệ / thiếu organization"
// @Failure      401   {object}  response.ErrorResponse     "Thiếu token / token không hợp lệ"
// @Failure      500   {object}  response.ErrorResponse     "Lỗi server"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /staff/salary-adjustment [post]
func (h *StaffHandler) CreateSalaryAdjustment(c *gin.Context) {
	req := &domain.SalaryAdjustmentRequest{}
	if err := c.ShouldBindJSON(req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	err := h.uc.CreateSalaryAdjustment(c.Request.Context(), req)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Tạo điều chỉnh lương thành công", nil)
}

// GetSalaryAdjustments godoc
// @Summary      Lấy danh sách điều chỉnh lương của nhân viên
// @Description  Yêu cầu vai trò: owner.
// @Tags         Staff
// @Produce      json
// @Security     BearerAuth
// @Param        id             path      string  true  "ID nhân viên"
// @Param        period_month   query     string  false "Tháng điều chỉnh"
// @Success      200  {object}  response.SuccessResponse  "Lấy danh sách điều chỉnh lương thành công"
// @Failure      400  {object}  response.ErrorResponse    "Thiếu id"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      500  {object}  response.ErrorResponse    "Lỗi server"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /staff/{id}/salary-adjustments [get]
func (h *StaffHandler) GetSalaryAdjustments(c *gin.Context) {
	staffID := c.Param("id")
	periodMonth := c.Query("period_month")

	result, err := h.uc.GetSalaryAdjustments(c.Request.Context(), staffID, periodMonth)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Danh sách điều chỉnh lương", result)
}

// DeleteSalaryAdjustment godoc
// @Summary      Xóa điều chỉnh lương nhân viên
// @Description  Yêu cầu vai trò: owner.
// @Tags         Staff
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string                  true  "ID điều chỉnh lương"
// @Success      200  {object}  response.SuccessResponse  "Xóa điều chỉnh lương thành công"
// @Failure      400  {object}  response.ErrorResponse    "Thiếu id"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404  {object}  response.ErrorResponse    "Không tìm thấy điều chỉnh lương hoặc đã bị khóa"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /staff/salary-adjustment/{id} [delete]
func (h *StaffHandler) DeleteSalaryAdjustment(c *gin.Context) {
	adjustmentID := c.Param("id")

	err := h.uc.DeleteSalaryAdjustment(c.Request.Context(), adjustmentID)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Xóa điều chỉnh lương thành công", nil)
}

// GetStaffLeaves godoc
// @Summary      Lấy danh sách ngày nghỉ của nhân viên
// @Tags         Staff
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "ID nhân viên"
// @Success      200  {object}  response.SuccessResponse  "Danh sách ngày nghỉ"
// @Failure      400  {object}  response.ErrorResponse    "Thiếu id"
// @Failure      401  {object}  response.ErrorResponse    "Thiếu token / token không hợp lệ"
// @Failure      404  {object}  response.ErrorResponse    "Không tìm thấy nhân viên"
// @Failure      500  {object}  response.ErrorResponse    "Lỗi server"
// @Router       /staff/{id}/leaves [get]
func (h *StaffHandler) GetStaffLeaves(c *gin.Context) {
	result, err := h.uc.GetStaffLeaves(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Danh sách ngày nghỉ", result)
}

// CreateStaffLeave godoc
// @Summary      Tạo ngày nghỉ cho nhân viên
// @Description  Yêu cầu vai trò: owner hoặc manager.
// @Tags         Staff
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                        true  "ID nhân viên"
// @Param        body  body      domain.CreateStaffLeaveRequest true  "Thông tin ngày nghỉ"
// @Success      200   {object}  response.SuccessResponse       "Tạo ngày nghỉ thành công"
// @Failure      400   {object}  response.ErrorResponse         "Dữ liệu không hợp lệ"
// @Failure      401   {object}  response.ErrorResponse         "Thiếu token / token không hợp lệ"
// @Failure      404   {object}  response.ErrorResponse         "Không tìm thấy nhân viên"
// @Failure      409   {object}  response.ErrorResponse         "Khoảng ngày đã được chốt trong bảng lương"
// @Failure      500   {object}  response.ErrorResponse         "Lỗi server"
// @Failure      403  {object}  response.ErrorResponse  "Không có quyền truy cập"
// @Router       /staff/{id}/leaves [post]
func (h *StaffHandler) CreateStaffLeave(c *gin.Context) {
	var req domain.CreateStaffLeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		c.Abort()
		return
	}

	result, err := h.uc.CreateStaffLeave(c.Request.Context(), c.Param("id"), &req)
	if err != nil {
		response.Error(c, err)
		c.Abort()
		return
	}
	response.Success(c, 200, "Tạo ngày nghỉ thành công", result)
}
