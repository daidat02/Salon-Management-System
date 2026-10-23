package cashflow

import (
	repo "github.com/daidat02/server/internal/infrastructure/postgres"
	uc "github.com/daidat02/server/internal/usecase/cashflow"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Dependencies struct {
	CashFlowRepo *repo.CashFlowRepository
	FundRepo     *repo.PostgresFundRepository
	CategoryRepo *repo.PostgresCashFlowCategoryRepository
	UseCase      *uc.CashflowUsecase
	Handler      *CashFlowHandler
}

func NewDependencies(pgxPool *pgxpool.Pool) *Dependencies {
	cashFlowRepo := repo.NewCashFlowRepository(pgxPool)
	fundRepo := repo.NewPostgresFundRepository(pgxPool)
	categoryRepo := repo.NewPostgresCashFlowCategoryRepository(pgxPool)

	useCase := uc.NewCashflowUsecase(cashFlowRepo, fundRepo, categoryRepo)
	handler := NewCashFlowHandler(useCase)

	return &Dependencies{
		CashFlowRepo: cashFlowRepo,
		FundRepo:     fundRepo,
		CategoryRepo: categoryRepo,
		UseCase:      useCase,
		Handler:      handler,
	}
}
