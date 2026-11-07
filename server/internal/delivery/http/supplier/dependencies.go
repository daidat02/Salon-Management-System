package supplier

import (
	repo "github.com/daidat02/server/internal/infrastructure/postgres"
	uc "github.com/daidat02/server/internal/usecase/supplier"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Dependencies struct {
	UseCase *uc.SupplierUsecase
	Handler *SupplierHandler
	Repo    *repo.SupplierRepository
}

func NewDependencies(dbPool *pgxpool.Pool) *Dependencies {
	supplierRepo := repo.NewSupplierRepository(dbPool)
	useCase := uc.NewSupplierUsecase(supplierRepo)
	handler := NewSupplierHandler(useCase)

	return &Dependencies{
		UseCase: useCase,
		Handler: handler,
		Repo:    supplierRepo,
	}
}
