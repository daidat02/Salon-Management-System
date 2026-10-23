package cashflow

import (
	"context"
	"errors"
	"testing"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	domain "github.com/daidat02/server/internal/domain/cashflow"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func withOrgCtx(orgID string) context.Context {
	return context.WithValue(context.Background(), middlewares.OrgIdKey, orgID)
}

func strP(s string) *string { return &s }

func activeFund() *domain.Fund {
	return &domain.Fund{ID: "fund-cash", OrganizationID: "org-123", Code: "CASH", Name: "Tiền mặt tại quầy", FundType: domain.FundTypeCash, IsActive: true}
}

func baseReq() *domain.CreateCashFlowRequest {
	return &domain.CreateCashFlowRequest{
		Kind:       domain.KindIncome,
		FundID:     "fund-cash",
		Amount:     1850000,
		OccurredAt: "2024-10-24T10:30:00+07:00",
	}
}

func assertAppErrorCode(t *testing.T, err error, expectedCode int) {
	t.Helper()
	var appErr *apperror.AppError
	assert.True(t, errors.As(err, &appErr), "Lỗi phải là *apperror.AppError")
	if appErr != nil {
		assert.Equal(t, expectedCode, appErr.StatusCode)
	}
}

func TestCreateCashFlow_Success(t *testing.T) {
	repo := new(MockCashFlowRepository)
	funds := new(MockFundRepository)
	cats := new(MockCashFlowCategoryRepository)
	u := NewCashflowUsecase(repo, funds, cats)

	funds.On("GetFundByID", mock.Anything, "org-123", "fund-cash").Return(activeFund(), nil)
	repo.On("CreateCashFlow", mock.Anything, mock.Anything).Return(nil)

	res, err := u.CreateCashFlow(withOrgCtx("org-123"), baseReq())

	assert.NoError(t, err)
	assert.Equal(t, domain.KindIncome, res.Kind)
	assert.Equal(t, domain.VoucherStatusPending, res.Status)
	assert.Equal(t, "fund-cash", res.FundID)
	assert.Equal(t, "Tiền mặt tại quầy", res.FundName)
	assert.Contains(t, res.Code, "PT-")
	repo.AssertExpectations(t)
}

func TestCreateCashFlow_MissingOrg(t *testing.T) {
	u := NewCashflowUsecase(new(MockCashFlowRepository), new(MockFundRepository), new(MockCashFlowCategoryRepository))

	_, err := u.CreateCashFlow(context.Background(), baseReq())

	assertAppErrorCode(t, err, 400)
}

func TestCreateCashFlow_InvalidAmount(t *testing.T) {
	u := NewCashflowUsecase(new(MockCashFlowRepository), new(MockFundRepository), new(MockCashFlowCategoryRepository))

	req := baseReq()
	req.Amount = 0
	_, err := u.CreateCashFlow(withOrgCtx("org-123"), req)

	assertAppErrorCode(t, err, 400)
}

func TestCreateCashFlow_FundNotFound(t *testing.T) {
	repo := new(MockCashFlowRepository)
	funds := new(MockFundRepository)
	u := NewCashflowUsecase(repo, funds, new(MockCashFlowCategoryRepository))

	funds.On("GetFundByID", mock.Anything, "org-123", "fund-cash").Return(nil, domain.ErrFundNotFound)

	_, err := u.CreateCashFlow(withOrgCtx("org-123"), baseReq())

	assertAppErrorCode(t, err, 404)
}

func TestCreateCashFlow_InactiveFund(t *testing.T) {
	repo := new(MockCashFlowRepository)
	funds := new(MockFundRepository)
	u := NewCashflowUsecase(repo, funds, new(MockCashFlowCategoryRepository))

	locked := activeFund()
	locked.IsActive = false
	funds.On("GetFundByID", mock.Anything, "org-123", "fund-cash").Return(locked, nil)

	_, err := u.CreateCashFlow(withOrgCtx("org-123"), baseReq())

	assertAppErrorCode(t, err, 400)
}

func TestCreateCashFlow_WrongKindCategory(t *testing.T) {
	repo := new(MockCashFlowRepository)
	funds := new(MockFundRepository)
	cats := new(MockCashFlowCategoryRepository)
	u := NewCashflowUsecase(repo, funds, cats)

	funds.On("GetFundByID", mock.Anything, "org-123", "fund-cash").Return(activeFund(), nil)
	// Danh mục chi nhưng phiếu thu -> resolveCategory không thấy trong kind=income.
	cats.On("GetCategoriesByOrgID", mock.Anything, "org-123", domain.KindIncome).
		Return([]*domain.CashFlowCategory{
			{ID: "cat-thu", Code: "SALON_REVENUE", Kind: domain.KindIncome, IsActive: true},
		}, nil)

	req := baseReq()
	req.CategoryID = strP("cat-chi")
	_, err := u.CreateCashFlow(withOrgCtx("org-123"), req)

	assertAppErrorCode(t, err, 404)
}

func TestGetCashFlowStats_Success(t *testing.T) {
	repo := new(MockCashFlowRepository)
	funds := new(MockFundRepository)
	u := NewCashflowUsecase(repo, funds, new(MockCashFlowCategoryRepository))

	repo.On("GetCashFlowStats", mock.Anything, "org-123", "2024-10-01", "2024-10-31").
		Return(&domain.CashFlowStats{
			TotalIncome:           1850000,
			TotalOperatingExpense: 450000,
			TotalNonPNLExpense:    100000,
		}, nil)
	funds.On("GetFundStats", mock.Anything, "org-123").
		Return([]*domain.FundStats{{ID: "fund-cash", Name: "Tiền mặt tại quầy"}}, nil)

	res, err := u.GetCashFlowStats(withOrgCtx("org-123"), "2024-10-01", "2024-10-31")

	assert.NoError(t, err)
	assert.Equal(t, 1850000.0, res.TotalIncome)
	assert.Equal(t, 450000.0, res.TotalOperatingExpense)
	assert.Equal(t, 100000.0, res.TotalNonPNLExpense)
	assert.Len(t, res.Funds, 1)
	repo.AssertExpectations(t)
	funds.AssertExpectations(t)
}

func TestGetCashFlowStats_EmptyFundsReturnsEmptySlice(t *testing.T) {
	repo := new(MockCashFlowRepository)
	funds := new(MockFundRepository)
	u := NewCashflowUsecase(repo, funds, new(MockCashFlowCategoryRepository))

	repo.On("GetCashFlowStats", mock.Anything, "org-123", "", "").
		Return(&domain.CashFlowStats{}, nil)
	funds.On("GetFundStats", mock.Anything, "org-123").Return(nil, nil)

	res, err := u.GetCashFlowStats(withOrgCtx("org-123"), "", "")

	assert.NoError(t, err)
	assert.NotNil(t, res.Funds)
	assert.Empty(t, res.Funds)
}

func TestGetCashFlowStats_InvalidDateRange(t *testing.T) {
	u := NewCashflowUsecase(new(MockCashFlowRepository), new(MockFundRepository), new(MockCashFlowCategoryRepository))

	_, err := u.GetCashFlowStats(withOrgCtx("org-123"), "2024-10-31", "2024-10-01")

	assertAppErrorCode(t, err, 400)
}

func TestGetCashFlowStats_InvalidDate(t *testing.T) {
	u := NewCashflowUsecase(new(MockCashFlowRepository), new(MockFundRepository), new(MockCashFlowCategoryRepository))

	_, err := u.GetCashFlowStats(withOrgCtx("org-123"), "31/10/2024", "")

	assertAppErrorCode(t, err, 400)
}

func TestGetFundMovementHistory_Success(t *testing.T) {
	funds := new(MockFundRepository)
	u := NewCashflowUsecase(new(MockCashFlowRepository), funds, new(MockCashFlowCategoryRepository))

	funds.On("GetFundMovementHistory", mock.Anything, "org-123").
		Return([]*domain.CashFlowResponse{
			{ID: "cf-1", Code: "PT-2610-0001", Kind: domain.KindIncome, FundName: "Tiền mặt tại quầy", Amount: 5000000},
		}, nil)

	res, err := u.GetFundMovementHistory(withOrgCtx("org-123"))

	assert.NoError(t, err)
	assert.Len(t, res, 1)
	assert.Equal(t, "cf-1", res[0].ID)
	funds.AssertExpectations(t)
}

func TestGetFundMovementHistory_EmptyReturnsEmptySlice(t *testing.T) {
	funds := new(MockFundRepository)
	u := NewCashflowUsecase(new(MockCashFlowRepository), funds, new(MockCashFlowCategoryRepository))

	funds.On("GetFundMovementHistory", mock.Anything, "org-123").Return(nil, nil)

	res, err := u.GetFundMovementHistory(withOrgCtx("org-123"))

	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Empty(t, res)
}

func TestGetFundMovementHistory_RepoError(t *testing.T) {
	funds := new(MockFundRepository)
	u := NewCashflowUsecase(new(MockCashFlowRepository), funds, new(MockCashFlowCategoryRepository))

	funds.On("GetFundMovementHistory", mock.Anything, "org-123").
		Return(nil, errors.New("db error"))

	_, err := u.GetFundMovementHistory(withOrgCtx("org-123"))

	assertAppErrorCode(t, err, 500)
}
