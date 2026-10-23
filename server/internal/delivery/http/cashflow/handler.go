package cashflow

import (
	"net/http"
	"strconv"

	domain "github.com/daidat02/server/internal/domain/cashflow"
	uc "github.com/daidat02/server/internal/usecase/cashflow"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/response"
	"github.com/gin-gonic/gin"
)

type CashFlowHandler struct {
	uc *uc.CashflowUsecase
}

func NewCashFlowHandler(uc *uc.CashflowUsecase) *CashFlowHandler {
	return &CashFlowHandler{
		uc: uc,
	}
}

// ============================================================
// 1. PHIẾU THU / CHI
// ============================================================

// CreateCashFlow godoc
// @Summary      Tạo phiếu thu/chi
// @Tags         Cashflows
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.CreateCashFlowRequest  true  "Thông tin phiếu"
// @Success      200   {object}  response.SuccessResponse
// @Failure      400   {object}  response.ErrorResponse
// @Router       /cashflows [post]
func (h *CashFlowHandler) CreateCashFlow(c *gin.Context) {
	var req domain.CreateCashFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		return
	}

	result, err := h.uc.CreateCashFlow(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Tạo phiếu thu/chi thành công", result)
}

// GetCashFlows godoc
// @Summary      Danh sách phiếu thu/chi
// @Tags         Cashflows
// @Produce      json
// @Security     BearerAuth
// @Param        kind        query     string  false  "income | expense"
// @Param        status      query     string  false  "pending | approved | cancelled"
// @Param        category_id query     string  false  "ID danh mục"
// @Param        fund_id     query     string  false  "ID quỹ"
// @Param        search      query     string  false  "Tìm theo mã/ghi chú"
// @Param        date_from   query     string  false  "Từ ngày (RFC3339 hoặc yyyy-MM-dd)"
// @Param        date_to     query     string  false  "Đến ngày (RFC3339 hoặc yyyy-MM-dd)"
// @Param        sort_by     query     string  false  "amount_asc | amount_desc | created_at_asc | created_at_desc"
// @Param        page        query     int     false  "Trang"
// @Param        page_size   query     int     false  "Số dòng/trang"
// @Success      200  {object}  response.SuccessResponse
// @Failure      401  {object}  response.ErrorResponse
// @Router       /cashflows [get]
func (h *CashFlowHandler) GetCashFlows(c *gin.Context) {
	var q domain.ListCashFlowsQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		return
	}

	result, err := h.uc.GetCashFlowByOrgID(c.Request.Context(), &q)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, "Lấy danh sách phiếu thu/chi thành công", result)
}

// GetCashFlowStats godoc
// @Summary      Thống kê thu/chi
// @Tags         Cashflows
// @Produce      json
// @Security     BearerAuth
// @Param        date_from  query     string  false  "Từ ngày (RFC3339 hoặc yyyy-MM-dd), mặc định đầu tháng"
// @Param        date_to    query     string  false  "Đến ngày (RFC3339 hoặc yyyy-MM-dd), mặc định cuối tháng"
// @Success      200  {object}  response.SuccessResponse
// @Failure      400  {object}  response.ErrorResponse
// @Failure      401  {object}  response.ErrorResponse
// @Router       /cashflows/stats [get]
func (h *CashFlowHandler) GetCashFlowStats(c *gin.Context) {
	result, err := h.uc.GetCashFlowStats(
		c.Request.Context(),
		c.Query("date_from"),
		c.Query("date_to"),
	)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Lấy thống kê thu/chi thành công", result)
}

// GetCashFlowByID godoc
// @Summary      Chi tiết phiếu thu/chi
// @Tags         Cashflows
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "ID phiếu"
// @Success      200  {object}  response.SuccessResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /cashflows/{id} [get]
func (h *CashFlowHandler) GetCashFlowByID(c *gin.Context) {
	result, err := h.uc.GetCashFlowByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Chi tiết phiếu thu/chi", result)
}

// ApproveCashFlow godoc
// @Summary      Duyệt phiếu thu/chi
// @Tags         Cashflows
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "ID phiếu"
// @Success      200  {object}  response.SuccessResponse
// @Failure      400  {object}  response.ErrorResponse "Quỹ không đủ số dư"
// @Failure      404  {object}  response.ErrorResponse
// @Router       /cashflows/{id}/approve [post]
func (h *CashFlowHandler) ApproveCashFlow(c *gin.Context) {
	approvedBy := c.GetString("userId")
	if err := h.uc.ApproveCashFlow(c.Request.Context(), c.Param("id"), approvedBy); err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Duyệt phiếu thu/chi thành công", gin.H{"id": c.Param("id")})
}

// CancelCashFlow godoc
// @Summary      Hủy phiếu thu/chi (chỉ phiếu pending)
// @Tags         Cashflows
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "ID phiếu"
// @Success      200  {object}  response.SuccessResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /cashflows/{id}/cancel [post]
func (h *CashFlowHandler) CancelCashFlow(c *gin.Context) {
	if err := h.uc.CancelCashFlow(c.Request.Context(), c.Param("id")); err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Hủy phiếu thu/chi thành công", gin.H{"id": c.Param("id")})
}

// ============================================================
// 2. QUỸ
// ============================================================

// CreateFund godoc
// @Summary      Tạo quỹ
// @Tags         Funds
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.CreateFundRequest  true  "Thông tin quỹ"
// @Success      200   {object}  response.SuccessResponse
// @Failure      400   {object}  response.ErrorResponse
// @Router       /funds [post]
func (h *CashFlowHandler) CreateFund(c *gin.Context) {
	var req domain.CreateFundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		return
	}

	result, err := h.uc.CreateFund(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Tạo quỹ thành công", result)
}

// GetFunds godoc
// @Summary      Danh sách quỹ
// @Tags         Funds
// @Produce      json
// @Security     BearerAuth
// @Param        active_only  query     bool  false  "Chỉ quỹ đang hoạt động"
// @Success      200  {object}  response.SuccessResponse
// @Router       /funds [get]
func (h *CashFlowHandler) GetFunds(c *gin.Context) {
	activeOnly, _ := strconv.ParseBool(c.DefaultQuery("active_only", "false"))

	result, err := h.uc.GetFunds(c.Request.Context(), activeOnly)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Danh sách quỹ", result)
}

// GetFundMovementHistory godoc
// @Summary      Lịch sử nạp/rút quỹ
// @Tags         Funds
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.SuccessResponse
// @Failure      401  {object}  response.ErrorResponse
// @Router       /funds/history [get]
func (h *CashFlowHandler) GetFundMovementHistory(c *gin.Context) {
	result, err := h.uc.GetFundMovementHistory(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Lịch sử nạp/rút quỹ", result)
}

// GetFundByID godoc
// @Summary      Chi tiết quỹ
// @Tags         Funds
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "ID quỹ"
// @Success      200  {object}  response.SuccessResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /funds/{id} [get]
func (h *CashFlowHandler) GetFundByID(c *gin.Context) {
	result, err := h.uc.GetFundByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Chi tiết quỹ", result)
}

// UpdateFund godoc
// @Summary      Cập nhật quỹ
// @Tags         Funds
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                     true  "ID quỹ"
// @Param        body  body      domain.UpdateFundRequest    true  "Thông tin cập nhật"
// @Success      200   {object}  response.SuccessResponse
// @Failure      404   {object}  response.ErrorResponse
// @Router       /funds/{id} [put]
func (h *CashFlowHandler) UpdateFund(c *gin.Context) {
	var req domain.UpdateFundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		return
	}

	result, err := h.uc.UpdateFund(c.Request.Context(), c.Param("id"), &req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Cập nhật quỹ thành công", result)
}

// DeactivateFund godoc
// @Summary      Ngừng sử dụng quỹ
// @Tags         Funds
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "ID quỹ"
// @Success      200  {object}  response.SuccessResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /funds/{id} [delete]
func (h *CashFlowHandler) DeactivateFund(c *gin.Context) {
	if err := h.uc.DeactivateFund(c.Request.Context(), c.Param("id")); err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Ngừng sử dụng quỹ thành công", gin.H{"id": c.Param("id")})
}

// ============================================================
// 3. DANH MỤC THU / CHI
// ============================================================

// CreateCashFlowCategory godoc
// @Summary      Tạo danh mục thu/chi
// @Tags         CashflowCategories
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      domain.CreateCashFlowCategoryRequest  true  "Thông tin danh mục"
// @Success      200   {object}  response.SuccessResponse
// @Failure      400   {object}  response.ErrorResponse
// @Router       /cashflow-categories [post]
func (h *CashFlowHandler) CreateCashFlowCategory(c *gin.Context) {
	var req domain.CreateCashFlowCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		return
	}

	result, err := h.uc.CreateCashFlowCategory(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Tạo danh mục thu/chi thành công", result)
}

// GetCashFlowCategories godoc
// @Summary      Danh sách danh mục thu/chi
// @Tags         CashflowCategories
// @Produce      json
// @Security     BearerAuth
// @Param        kind  query     string  false  "income | expense"
// @Success      200   {object}  response.SuccessResponse
// @Router       /cashflow-categories [get]
func (h *CashFlowHandler) GetCashFlowCategories(c *gin.Context) {
	result, err := h.uc.GetCashFlowCategories(c.Request.Context(), c.Query("kind"))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Danh sách danh mục thu/chi", result)
}

// UpdateCashFlowCategory godoc
// @Summary      Cập nhật danh mục thu/chi
// @Tags         CashflowCategories
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                                true  "ID danh mục"
// @Param        body  body      domain.UpdateCashFlowCategoryRequest  true  "Thông tin cập nhật"
// @Success      200   {object}  response.SuccessResponse
// @Failure      404   {object}  response.ErrorResponse
// @Router       /cashflow-categories/{id} [put]
func (h *CashFlowHandler) UpdateCashFlowCategory(c *gin.Context) {
	var req domain.UpdateCashFlowCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperror.New(400, "Dữ liệu không hợp lệ", err))
		return
	}

	result, err := h.uc.UpdateCashFlowCategory(c.Request.Context(), c.Param("id"), &req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Cập nhật danh mục thu/chi thành công", result)
}

// DeleteCashFlowCategory godoc
// @Summary      Xóa danh mục thu/chi (không xóa danh mục hệ thống)
// @Tags         CashflowCategories
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "ID danh mục"
// @Success      200  {object}  response.SuccessResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /cashflow-categories/{id} [delete]
func (h *CashFlowHandler) DeleteCashFlowCategory(c *gin.Context) {
	deletedID, err := h.uc.DeleteCashFlowCategory(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Xóa danh mục thu/chi thành công", gin.H{"id": deletedID})
}
