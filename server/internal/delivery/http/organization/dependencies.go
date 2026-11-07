package organization

import (
	repo "github.com/daidat02/server/internal/infrastructure/postgres"
	uc "github.com/daidat02/server/internal/usecase/organization"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Dependencies struct {
	UseCase *uc.OrganizationUseCase
	Handler *OrganizationHandler
	Repo    *repo.PostgresOrganizationRepository
}

func NewDependencies(dbPool *pgxpool.Pool) *Dependencies {
	settingRepo := repo.NewPostgresSettingRepository(dbPool)
	organizationRepo := repo.NewPostgresOrganizationRepository(dbPool, settingRepo)
	useCase := uc.NewOrganizationUseCase(organizationRepo)
	handler := NewOrganizationHandler(useCase)

	return &Dependencies{
		UseCase: useCase,
		Handler: handler,
		Repo:    organizationRepo,
	}
}
