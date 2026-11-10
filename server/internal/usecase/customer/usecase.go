package customer

import (
	"context"
	"errors"
	"log"
	"strings"

	appointmentDomain "github.com/daidat02/server/internal/domain/appointment"
	domain "github.com/daidat02/server/internal/domain/customer"
	orderDomain "github.com/daidat02/server/internal/domain/order"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/pagination"
	"github.com/daidat02/server/pkg/utils"
)

type CustomerUsecase struct {
	repo         domain.CustomerRepository
	history      HistoryStore
	orderHistory OrderHistoryStore
}

// HistoryStore lấy lịch sử lịch hẹn của khách.
// PostgresAppointmentRepository thỏa mãn ngầm.
type HistoryStore interface {
	GetAppointmentsByCustomerID(ctx context.Context, orgID, customerID string, limit, offset int) ([]*appointmentDomain.AppointmentResponse, error)
	CountAppointmentsByCustomerID(ctx context.Context, orgID, customerID string) (int64, error)
}

// OrderHistoryStore lấy lịch sử đơn hàng của khách.
// PostgresOrderRepository thỏa mãn ngầm.
type OrderHistoryStore interface {
	ListHistoriesOrderByCustomerId(ctx context.Context, orgID, customerID string, limit, offset int) ([]*orderDomain.Order, error)
	CountHistoriesOrderByCustomerId(ctx context.Context, orgID, customerID string) (int64, error)
}

func NewCustomerUsecase(repo domain.CustomerRepository, history HistoryStore, orderHistory OrderHistoryStore) *CustomerUsecase {
	return &CustomerUsecase{
		repo:         repo,
		history:      history,
		orderHistory: orderHistory,
	}
}

// CustomerDetail hồ sơ khách + chi tiêu 6 tháng + lịch sử lịch hẹn
// + lịch sử đơn hàng (mỗi loại phân trang riêng).
type CustomerDetail struct {
	Customer     *domain.CustomerDetailsResponse                    `json:"customer"`
	Appointments *pagination.Result[*appointmentDomain.AppointmentResponse] `json:"appointments"`
	Orders       *pagination.Result[*orderDomain.Order]              `json:"orders"`
}

func toResponse(c *domain.Customer) *domain.CustomerResponse {
	return &domain.CustomerResponse{
		ID:             c.ID,
		OrganizationID: c.OrganizationID,
		FullName:       c.FullName,
		Phone:          c.Phone,
		Gender:         c.Gender,
		BirthDate:      c.BirthDate,
		Note:           c.Note,
		TotalSpent:     c.TotalSpent,
		TotalVisits:    c.TotalVisits,
		RewardPoints:   c.RewardPoints,
		IsFlaggedRisk:  c.IsFlaggedRisk,
		CreatedAt:      c.CreatedAt,
		UpdatedAt:      c.UpdatedAt,
		DeletedAt:      c.DeletedAt,
	}
}

func (u *CustomerUsecase) CreateCustomer(ctx context.Context, customer *domain.Customer) (*domain.CustomerResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	if err := customer.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}
	customer.ID = utils.NewID()
	customer.OrganizationID = orgID

	if err := u.repo.CreateCustomer(ctx, customer); err != nil {
		log.Println("Error creating customer:", err)
		return nil, apperror.New(500, "Lỗi khi tạo khách hàng", err)
	}

	return toResponse(customer), nil
}

func (u *CustomerUsecase) GetCustomersByOrgID(ctx context.Context, page, pageSize int, search string) (*pagination.Result[*domain.CustomerResponse], error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	params := pagination.Normalize(page, pageSize)
	search = strings.TrimSpace(search)

	customers, err := u.repo.GetCustomersByOrgID(ctx, orgID, search, params.PageSize, params.Offset())
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách khách hàng", err)
	}

	var result []*domain.CustomerResponse
	for _, c := range customers {
		result = append(result, toResponse(c))
	}

	total, err := u.repo.CountCustomersByOrgID(ctx, orgID, search)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm danh sách khách hàng", err)
	}

	return pagination.NewResult(result, params, total), nil
}

func (u *CustomerUsecase) GetCustomerDetail(ctx context.Context, id string, histPage, histPageSize, ordPage, ordPageSize int) (*CustomerDetail, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id khách hàng", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	customer, err := u.repo.GetCustomerDetailByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrCustomerNotFound) {
			return nil, apperror.New(404, "Không tìm thấy khách hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy khách hàng", err)
	}

	params := pagination.Normalize(histPage, histPageSize)

	appointments, err := u.history.GetAppointmentsByCustomerID(ctx, orgID, id, params.PageSize, params.Offset())
	if err != nil {
		log.Println("Error getting appointments by customer ID:", err)
		return nil, apperror.New(500, "Lỗi khi lấy lịch sử lịch hẹn", err)
	}

	total, err := u.history.CountAppointmentsByCustomerID(ctx, orgID, id)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm lịch sử lịch hẹn", err)
	}

	ordParams := pagination.Normalize(ordPage, ordPageSize)

	orders, err := u.orderHistory.ListHistoriesOrderByCustomerId(ctx, orgID, id, ordParams.PageSize, ordParams.Offset())
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy lịch sử đơn hàng", err)
	}

	ordTotal, err := u.orderHistory.CountHistoriesOrderByCustomerId(ctx, orgID, id)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm lịch sử đơn hàng", err)
	}

	return &CustomerDetail{
		Customer:     customer,
		Appointments: pagination.NewResult(appointments, params, total),
		Orders:       pagination.NewResult(orders, ordParams, ordTotal),
	}, nil
}

func (u *CustomerUsecase) GetCustomerByPhoneNumber(ctx context.Context, phone string) (*domain.CustomerResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	customer, err := u.repo.GetCustomerByPhone(ctx, orgID, phone)
	if err != nil {
		if errors.Is(err, domain.ErrCustomerNotFound) {
			return nil, apperror.New(404, "Không tìm thấy khách hàng", err)
		}
		log.Println("Error getting customer by phone:", err)
		return nil, apperror.New(500, "Lỗi khi lấy khách hàng", err)
	}

	return toResponse(customer), nil
}

func (u *CustomerUsecase) UpdateCustomer(ctx context.Context, id string, customer *domain.Customer) (*domain.CustomerResponse, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id khách hàng", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	if err := customer.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}
	customer.ID = id
	customer.OrganizationID = orgID

	if err := u.repo.UpdateCustomer(ctx, customer); err != nil {
		log.Println("Error updating customer:", err)
		if errors.Is(err, domain.ErrCustomerNotFound) {
			return nil, apperror.New(404, "Không tìm thấy khách hàng", err)
		}
		return nil, apperror.New(500, "Lỗi khi cập nhật khách hàng", err)
	}

	return toResponse(customer), nil
}

func (u *CustomerUsecase) DeleteCustomer(ctx context.Context, id string) (string, error) {
	if strings.TrimSpace(id) == "" {
		return "", apperror.New(400, "Thiếu id khách hàng", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return "", err
	}

	if err := u.repo.DeleteCustomer(ctx, orgID, id); err != nil {
		log.Println("Error deleting customer:", err)
		if errors.Is(err, domain.ErrCustomerNotFound) {
			return "", apperror.New(404, "Không tìm thấy khách hàng", err)
		}
		return "", apperror.New(500, "Lỗi khi xóa khách hàng", err)
	}

	return id, nil
}

// GetCustomerStats thống kê tổng quan tệp khách của salon.
func (u *CustomerUsecase) GetCustomerStats(ctx context.Context) (*domain.CustomerStatsResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	stats, err := u.repo.GetCustomerStats(ctx, orgID)
	if err != nil {
		log.Println("Error getting customer stats:", err)
		return nil, apperror.New(500, "Lỗi khi lấy thống kê khách hàng", err)
	}

	return stats, nil
}
