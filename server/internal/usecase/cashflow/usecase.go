package cashflow

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	domain "github.com/daidat02/server/internal/domain/cashflow"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/pagination"
	"github.com/daidat02/server/pkg/utils"
	"github.com/jackc/pgx/v5/pgconn"
)

type CashflowUsecase struct {
	repo       domain.CashFlowRepository
	funds      domain.FundRepository
	categories domain.CashFlowCategoryRepository
}

func NewCashflowUsecase(repo domain.CashFlowRepository, funds domain.FundRepository, categories domain.CashFlowCategoryRepository) *CashflowUsecase {
	return &CashflowUsecase{
		repo:       repo,
		funds:      funds,
		categories: categories,
	}
}

// ---------- Helper thuần túy (không chạm DB) ----------

// isUniqueViolation nhận diện lỗi unique PostgreSQL (mã 23505) để map
// sang message thân thiện (trùng mã phiếu).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// parseOccurredAt nhận RFC3339 ("2024-10-24T10:30:00+07:00") hoặc ngày
// "2006-01-02" (mặc định 00:00 UTC). Sai format thì 400.
func parseOccurredAt(raw string) (*time.Time, error) {
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return &t, nil
	}
	if t, err := time.Parse("2006-01-02", raw); err == nil {
		return &t, nil
	}
	return nil, apperror.New(400, "Ngày phát sinh không hợp lệ (RFC3339 hoặc yyyy-MM-dd)", nil)
}

// parseDateParam parse tham số ngày dạng RFC3339 hoặc yyyy-MM-dd.
// Chuỗi rỗng trả nil để SQL dùng khoảng mặc định.
func parseDateParam(raw, field string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return &t, nil
	}
	if t, err := time.Parse("2006-01-02", raw); err == nil {
		return &t, nil
	}
	return nil, apperror.New(400, "Tham số "+field+" không hợp lệ (RFC3339 hoặc yyyy-MM-dd)", nil)
}

// ---------- 1. Tạo phiếu thu/chi ----------

// CreateCashFlow tạo phiếu thu/chi ở trạng thái pending:
// validate quỹ (tồn tại + active trong org), validate danh mục (đúng kind),
// server tự sinh mã PT-/PC-, số tiền và quỹ do server chốt từ entity.
func (u *CashflowUsecase) CreateCashFlow(ctx context.Context, req *domain.CreateCashFlowRequest) (*domain.CashFlowResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	if req.Kind != domain.KindIncome && req.Kind != domain.KindExpense {
		return nil, apperror.New(400, "Loại phiếu không hợp lệ (income | expense)", nil)
	}
	fundID, err := shared.RequireID(req.FundID, "Phiếu thu/chi phải hạch toán vào một quỹ")
	if err != nil {
		return nil, err
	}
	if req.Amount <= 0 {
		return nil, apperror.New(400, "Số tiền phiếu phải lớn hơn 0", nil)
	}
	occurredAt, err := parseOccurredAt(req.OccurredAt)
	if err != nil {
		return nil, err
	}

	// Quỹ phải tồn tại và đang hoạt động trong đúng organization.
	fund, err := u.funds.GetFundByID(ctx, orgID, fundID)
	if err != nil {
		if errors.Is(err, domain.ErrFundNotFound) {
			return nil, apperror.New(404, "Không tìm thấy quỹ trong tổ chức", err)
		}
		return nil, apperror.New(500, "Lỗi khi kiểm tra quỹ", err)
	}
	if !fund.IsActive {
		return nil, apperror.New(400, "Quỹ đã ngừng sử dụng, chọn quỹ khác", nil)
	}

	// Danh mục (nếu có) phải thuộc đúng kind thu/chi của phiếu.
	var categoryID *string
	if req.CategoryID != nil && *req.CategoryID != "" {
		categoryID, err = u.resolveCategory(ctx, orgID, req.Kind, *req.CategoryID)
		if err != nil {
			return nil, err
		}
	}

	voucher := &domain.CashFlow{
		ID:                  utils.NewID(),
		OrganizationID:      orgID,
		Code:                utils.GenerateCashFlowCode(req.Kind),
		Kind:                req.Kind,
		CategoryID:          categoryID,
		FundID:              fund.ID,
		Amount:              req.Amount,
		Description:         utils.StrPtr(utils.StrVal(req.Description)),
		OccurredAt:          occurredAt,
		Status:              domain.VoucherStatusPending,
		OrderID:             utils.StrPtr(utils.StrVal(req.OrderID)),
		InventoryDocumentID: utils.StrPtr(utils.StrVal(req.InventoryDocumentID)),
	}
	if err := voucher.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	if err := u.repo.CreateCashFlow(ctx, voucher); err != nil {
		log.Println("Error creating cash flow:", err)
		if isUniqueViolation(err) {
			return nil, apperror.New(500, "Trùng mã phiếu, vui lòng thử lại", err)
		}
		return nil, apperror.New(500, "Lỗi khi tạo phiếu thu/chi", err)
	}

	return toResponse(voucher, nil, fund.Name), nil
}

// resolveCategory đảm bảo danh mục tồn tại, active và đúng kind của phiếu.
// Trả về id đã trim để chứa vào phiếu.
func (u *CashflowUsecase) resolveCategory(ctx context.Context, orgID, kind, categoryID string) (*string, error) {
	id, err := shared.RequireID(categoryID, "Mã danh mục không hợp lệ")
	if err != nil {
		return nil, err
	}
	categories, err := u.categories.GetCategoriesByOrgID(ctx, orgID, kind)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi kiểm tra danh mục thu/chi", err)
	}
	for _, c := range categories {
		if c.ID == id {
			if !c.IsActive {
				return nil, apperror.New(400, "Danh mục đã ngừng sử dụng, chọn danh mục khác", nil)
			}
			return &c.ID, nil
		}
	}
	return nil, apperror.New(404, "Không tìm thấy danh mục thu/chi trong tổ chức", nil)
}

// ---------- Mapping response ----------

// toResponse map entity CashFlow sang response (tên danh mục/quỹ kèm khi
// query có join, nil khi tạo mới chỉ có id).
func toResponse(v *domain.CashFlow, categoryName *string, fundName string) *domain.CashFlowResponse {
	return &domain.CashFlowResponse{
		ID:                  v.ID,
		OrganizationID:      v.OrganizationID,
		Code:                v.Code,
		Kind:                v.Kind,
		CategoryID:          v.CategoryID,
		CategoryName:        categoryName,
		FundID:              v.FundID,
		FundName:            fundName,
		Amount:              v.Amount,
		Description:         v.Description,
		OccurredAt:          v.OccurredAt,
		Status:              v.Status,
		OrderID:             v.OrderID,
		InventoryDocumentID: v.InventoryDocumentID,
		CreatedBy:           v.CreatedBy,
		ApprovedBy:          v.ApprovedBy,
		ApprovedAt:          v.ApprovedAt,
		CreatedAt:           v.CreatedAt,
		UpdatedAt:           v.UpdatedAt,
	}
}

func (u *CashflowUsecase) GetCashFlowByOrgID(ctx context.Context, q *domain.ListCashFlowsQuery) (*pagination.Result[*domain.CashFlowResponse], error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	params := pagination.Normalize(q.Page, q.PageSize)
	q.Page = params.Page
	q.PageSize = params.PageSize
	cashflows, total, err := u.repo.GetCashFlowByOrgID(ctx, orgID, *q)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách phiếu thu/chi", err)
	}

	return pagination.NewResult(cashflows, params, total), nil
}

// ---------- Mapping Fund / CashFlowCategory ----------

func toFundResponse(f *domain.Fund) *domain.FundResponse {
	return &domain.FundResponse{
		ID:             f.ID,
		OrganizationID: f.OrganizationID,
		Code:           f.Code,
		Name:           f.Name,
		FundType:       f.FundType,
		BankName:       f.BankName,
		AccountNumber:  f.AccountNumber,
		OpeningBalance: f.OpeningBalance,
		CurrentBalance: f.CurrentBalance,
		IsActive:       f.IsActive,
		IsDefault:      f.IsDefault,
		IsConfigured:   f.IsConfigured,
		CreatedAt:      f.CreatedAt,
		UpdatedAt:      f.UpdatedAt,
	}
}

func toCashFlowCategoryResponse(c *domain.CashFlowCategory) *domain.CashFlowCategoryResponse {
	return &domain.CashFlowCategoryResponse{
		ID:             c.ID,
		OrganizationID: c.OrganizationID,
		Code:           c.Code,
		Name:           c.Name,
		Kind:           c.Kind,
		CategoryType:   c.CategoryType,
		IsSystem:       c.IsSystem,
		SortOrder:      c.SortOrder,
		IsActive:       c.IsActive,
		CreatedAt:      c.CreatedAt,
		UpdatedAt:      c.UpdatedAt,
	}
}

// ---------- 2. Quỹ ----------

func (u *CashflowUsecase) CreateFund(ctx context.Context, req *domain.CreateFundRequest) (*domain.FundResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	fund := &domain.Fund{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		Code:           strings.TrimSpace(req.Code),
		Name:           strings.TrimSpace(req.Name),
		FundType:       req.FundType,
		BankName:       req.BankName,
		AccountNumber:  req.AccountNumber,
		OpeningBalance: req.OpeningBalance,
		CurrentBalance: req.OpeningBalance,
		IsActive:       true,
	}
	if err := fund.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	if err := u.funds.CreateFund(ctx, fund); err != nil {
		log.Println("Error creating fund:", err)
		if isUniqueViolation(err) {
			return nil, apperror.New(400, "Mã quỹ đã tồn tại trong tổ chức", err)
		}
		return nil, apperror.New(500, "Lỗi khi tạo quỹ", err)
	}

	return toFundResponse(fund), nil
}

func (u *CashflowUsecase) GetFunds(ctx context.Context, activeOnly bool) ([]*domain.FundResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	funds, err := u.funds.GetFundsByOrgID(ctx, orgID, activeOnly)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách quỹ", err)
	}

	res := make([]*domain.FundResponse, 0, len(funds))
	for _, f := range funds {
		res = append(res, toFundResponse(f))
	}
	return res, nil
}

func (u *CashflowUsecase) GetFundByID(ctx context.Context, id string) (*domain.FundResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	id, err = shared.RequireID(id, "Thiếu id quỹ")
	if err != nil {
		return nil, err
	}

	fund, err := u.funds.GetFundByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrFundNotFound) {
			return nil, apperror.New(404, "Không tìm thấy quỹ", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy quỹ", err)
	}
	return toFundResponse(fund), nil
}

func (u *CashflowUsecase) UpdateFund(ctx context.Context, id string, req *domain.UpdateFundRequest) (*domain.FundResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	id, err = shared.RequireID(id, "Thiếu id quỹ")
	if err != nil {
		return nil, err
	}

	fund, err := u.funds.GetFundByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrFundNotFound) {
			return nil, apperror.New(404, "Không tìm thấy quỹ", err)
		}
		return nil, apperror.New(500, "Lỗi khi kiểm tra quỹ", err)
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, apperror.New(400, "Tên quỹ không được để trống", nil)
	}
	fund.Name = name
	fund.BankName = req.BankName
	fund.AccountNumber = req.AccountNumber
	if req.IsActive != nil {
		fund.IsActive = *req.IsActive
	}
	if err := fund.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	if err := u.funds.UpdateFund(ctx, fund); err != nil {
		if errors.Is(err, domain.ErrFundNotFound) {
			return nil, apperror.New(404, "Không tìm thấy quỹ", err)
		}
		return nil, apperror.New(500, "Lỗi khi cập nhật quỹ", err)
	}
	return toFundResponse(fund), nil
}

func (u *CashflowUsecase) DeactivateFund(ctx context.Context, id string) error {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return err
	}
	id, err = shared.RequireID(id, "Thiếu id quỹ")
	if err != nil {
		return err
	}

	if err := u.funds.DeactivateFund(ctx, orgID, id); err != nil {
		if errors.Is(err, domain.ErrFundNotFound) {
			return apperror.New(404, "Không tìm thấy quỹ", err)
		}
		return apperror.New(500, "Lỗi khi ngừng sử dụng quỹ", err)
	}
	return nil
}

func (u *CashflowUsecase) GetFundMovementHistory(ctx context.Context) ([]*domain.CashFlowResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	movements, err := u.funds.GetFundMovementHistory(ctx, orgID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy lịch sử nạp/rút quỹ", err)
	}
	if movements == nil {
		movements = []*domain.CashFlowResponse{}
	}
	return movements, nil
}

// ---------- 3. Danh mục thu/chi ----------

func (u *CashflowUsecase) CreateCashFlowCategory(ctx context.Context, req *domain.CreateCashFlowCategoryRequest) (*domain.CashFlowCategoryResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	category := &domain.CashFlowCategory{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		Code:           strings.TrimSpace(req.Code),
		Name:           strings.TrimSpace(req.Name),
		Kind:           req.Kind,
		CategoryType:   req.CategoryType,
		IsSystem:       false,
		SortOrder:      req.SortOrder,
		IsActive:       true,
	}
	if err := category.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	if err := u.categories.CreateCategory(ctx, category); err != nil {
		log.Println("Error creating cash flow category:", err)
		if isUniqueViolation(err) {
			return nil, apperror.New(400, "Mã danh mục đã tồn tại trong tổ chức", err)
		}
		return nil, apperror.New(500, "Lỗi khi tạo danh mục thu/chi", err)
	}
	return toCashFlowCategoryResponse(category), nil
}

func (u *CashflowUsecase) GetCashFlowCategories(ctx context.Context, kind string) ([]*domain.CashFlowCategoryResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	kind = strings.TrimSpace(kind)
	if kind != "" && kind != domain.KindIncome && kind != domain.KindExpense {
		return nil, apperror.New(400, "Loại danh mục không hợp lệ (income | expense)", nil)
	}

	categories, err := u.categories.GetCategoriesByOrgID(ctx, orgID, kind)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách danh mục thu/chi", err)
	}

	res := make([]*domain.CashFlowCategoryResponse, 0, len(categories))
	for _, c := range categories {
		res = append(res, toCashFlowCategoryResponse(c))
	}
	return res, nil
}

func (u *CashflowUsecase) UpdateCashFlowCategory(ctx context.Context, id string, req *domain.UpdateCashFlowCategoryRequest) (*domain.CashFlowCategoryResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	id, err = shared.RequireID(id, "Thiếu id danh mục")
	if err != nil {
		return nil, err
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, apperror.New(400, "Tên danh mục không được để trống", nil)
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	category := &domain.CashFlowCategory{
		ID:             id,
		OrganizationID: orgID,
		Name:           name,
		SortOrder:      req.SortOrder,
		IsActive:       isActive,
	}
	if err := u.categories.UpdateCategory(ctx, category); err != nil {
		if errors.Is(err, domain.ErrCashFlowCategoryNotFound) {
			return nil, apperror.New(404, "Không tìm thấy danh mục thu/chi", err)
		}
		return nil, apperror.New(500, "Lỗi khi cập nhật danh mục thu/chi", err)
	}

	// Đọc lại để trả đủ code/kind/category_type/is_system đã lưu.
	if categories, err := u.categories.GetCategoriesByOrgID(ctx, orgID, ""); err == nil {
		for _, c := range categories {
			if c.ID == id {
				return toCashFlowCategoryResponse(c), nil
			}
		}
	}
	return toCashFlowCategoryResponse(category), nil
}

func (u *CashflowUsecase) DeleteCashFlowCategory(ctx context.Context, id string) (string, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return "", err
	}
	id, err = shared.RequireID(id, "Thiếu id danh mục")
	if err != nil {
		return "", err
	}

	if err := u.categories.DeleteCategory(ctx, orgID, id); err != nil {
		if errors.Is(err, domain.ErrCashFlowCategoryNotFound) {
			return "", apperror.New(404, "Không tìm thấy danh mục thu/chi (hoặc danh mục hệ thống không thể xóa)", err)
		}
		return "", apperror.New(500, "Lỗi khi xóa danh mục thu/chi", err)
	}
	return id, nil
}

// ---------- 4. Chi tiết / duyệt / hủy phiếu ----------

func (u *CashflowUsecase) GetCashFlowByID(ctx context.Context, id string) (*domain.CashFlowResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	id, err = shared.RequireID(id, "Thiếu id phiếu")
	if err != nil {
		return nil, err
	}

	voucher, err := u.repo.GetCashFlowByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrCashFlowNotFound) {
			return nil, apperror.New(404, "Không tìm thấy phiếu thu/chi", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy phiếu thu/chi", err)
	}

	fundName := ""
	if fund, err := u.funds.GetFundByID(ctx, orgID, voucher.FundID); err == nil && fund != nil {
		fundName = fund.Name
	}
	var categoryName *string
	if voucher.CategoryID != nil {
		if categories, err := u.categories.GetCategoriesByOrgID(ctx, orgID, voucher.Kind); err == nil {
			for _, c := range categories {
				if c.ID == *voucher.CategoryID {
					name := c.Name
					categoryName = &name
					break
				}
			}
		}
	}

	return toResponse(voucher, categoryName, fundName), nil
}

func (u *CashflowUsecase) ApproveCashFlow(ctx context.Context, id, approvedBy string) error {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return err
	}
	id, err = shared.RequireID(id, "Thiếu id phiếu")
	if err != nil {
		return err
	}

	if err := u.repo.ApproveCashFlow(ctx, orgID, id, approvedBy); err != nil {
		switch {
		case errors.Is(err, domain.ErrCashFlowNotFound):
			return apperror.New(404, "Không tìm thấy phiếu chờ duyệt", err)
		case errors.Is(err, domain.ErrInsufficientFundBalance):
			return apperror.New(400, "Quỹ không đủ số dư để chi", err)
		case errors.Is(err, domain.ErrFundNotFound):
			return apperror.New(404, "Không tìm thấy quỹ đang hoạt động", err)
		default:
			return apperror.New(500, "Lỗi khi duyệt phiếu thu/chi", err)
		}
	}
	return nil
}

func (u *CashflowUsecase) CancelCashFlow(ctx context.Context, id string) error {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return err
	}
	id, err = shared.RequireID(id, "Thiếu id phiếu")
	if err != nil {
		return err
	}

	if err := u.repo.CancelCashFlow(ctx, orgID, id); err != nil {
		if errors.Is(err, domain.ErrCashFlowNotFound) {
			return apperror.New(404, "Không tìm thấy phiếu chờ hủy", err)
		}
		return apperror.New(500, "Lỗi khi hủy phiếu thu/chi", err)
	}
	return nil
}

func (u *CashflowUsecase) GetCashFlowStats(ctx context.Context, dateFrom, dateTo string) (*domain.CashFlowStatsResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	from, err := parseDateParam(dateFrom, "date_from")
	if err != nil {
		return nil, err
	}
	to, err := parseDateParam(dateTo, "date_to")
	if err != nil {
		return nil, err
	}
	if from != nil && to != nil && from.After(*to) {
		return nil, apperror.New(400, "Khoảng thời gian không hợp lệ (date_from phải trước date_to)", nil)
	}

	cashflowStats, err := u.repo.GetCashFlowStats(ctx, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy thống kê phiếu thu/chi", err)
	}

	fundStats, err := u.funds.GetFundStats(ctx, orgID)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy thống kê quỹ", err)
	}
	if fundStats == nil {
		fundStats = []*domain.FundStats{}
	}

	return &domain.CashFlowStatsResponse{
		TotalIncome:           cashflowStats.TotalIncome,
		TotalOperatingExpense: cashflowStats.TotalOperatingExpense,
		TotalNonPNLExpense:    cashflowStats.TotalNonPNLExpense,
		Funds:                 fundStats,
	}, nil
}
