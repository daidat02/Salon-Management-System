package analytics

import (
	repo "github.com/daidat02/server/internal/infrastructure/postgres"
	uc "github.com/daidat02/server/internal/usecase/analytics"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Dependencies struct {
	Repository *repo.PostgresAnalyticsRepository
	UseCase    *uc.AnalyticsUsecase
	Handler    *AnalyticsHandler
}

func NewDependencies(pgxPool *pgxpool.Pool) *Dependencies {
	repository := repo.NewPostgresAnalyticsRepository(pgxPool)
	useCase := uc.NewAnalyticsUsecase(repository)
	handler := NewAnalyticsHandler(useCase)

	return &Dependencies{
		Repository: repository,
		UseCase:    useCase,
		Handler:    handler,
	}
}
