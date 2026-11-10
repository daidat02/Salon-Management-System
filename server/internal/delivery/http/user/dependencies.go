package user

import (
	"github.com/daidat02/server/configs"
	repo "github.com/daidat02/server/internal/infrastructure/postgres"
	uc "github.com/daidat02/server/internal/usecase/user"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Dependencies struct {
	UseCase *uc.UserUsecase
	Handler *UserHandler
	Repo    *repo.PostgresUserRepository
}

func NewDependencies(dbPool *pgxpool.Pool, cfg *config.Config) *Dependencies {
	userRepo := repo.NewPostgresUserRepository(dbPool)
	tokenRepo := repo.NewPostgresRefreshTokenRepository(dbPool)
	useCase := uc.NewUserUsecase(userRepo, tokenRepo)
	handler := NewCreateUserHandler(useCase, cfg.JWT)

	return &Dependencies{
		UseCase: useCase,
		Handler: handler,
		Repo:    userRepo,
	}
}
