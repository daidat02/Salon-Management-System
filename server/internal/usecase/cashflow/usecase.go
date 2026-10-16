package cashflow

import (
	"context"
	"errors"
	"log"
	"time"

	domain "github.com/daidat02/server/internal/domain/cashflow"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
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
