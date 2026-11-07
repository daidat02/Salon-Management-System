package order

import (
	repo "github.com/daidat02/server/internal/infrastructure/postgres"
	uc "github.com/daidat02/server/internal/usecase/order"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Dependencies struct {
	UseCase *uc.OrderUsecase
	Handler *OrderHandler
	Repo    *repo.PostgresOrderRepository
}

func NewDependencies(dbPool *pgxpool.Pool) *Dependencies {
	orderRepo := repo.NewPostgresOrderRepository(dbPool)
	serviceRepo := repo.NewPostgresServiceRepository(dbPool)
	productRepo := repo.NewPostgresProductRepository(dbPool)
	customerRepo := repo.NewPostgresCustomerRepository(dbPool)
	appointmentRepo := repo.NewPostgresAppointmentRepository(dbPool)
	staffRepo := repo.NewPostgresStaffRepository(dbPool)
	settingRepo := repo.NewPostgresSettingRepository(dbPool)
	useCase := uc.NewOrderUsecase(orderRepo, serviceRepo, productRepo, serviceRepo, customerRepo, appointmentRepo, staffRepo, settingRepo)
	handler := NewOrderHandler(useCase)

	return &Dependencies{
		UseCase: useCase,
		Handler: handler,
		Repo:    orderRepo,
	}
}
