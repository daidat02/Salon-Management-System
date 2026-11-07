package setting

import (
	repo "github.com/daidat02/server/internal/infrastructure/postgres"
	uc "github.com/daidat02/server/internal/usecase/setting"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Dependencies struct {
	UseCase *uc.SettingUseCase
	Handler *SettingHandler
	Repo    *repo.PostgresSettingRepository
}

func NewDependencies(dbPool *pgxpool.Pool) *Dependencies {
	settingRepo := repo.NewPostgresSettingRepository(dbPool)
	useCase := uc.NewSettingUseCase(settingRepo)
	handler := NewSettingHandler(useCase)

	return &Dependencies{
		UseCase: useCase,
		Handler: handler,
		Repo:    settingRepo,
	}
}
