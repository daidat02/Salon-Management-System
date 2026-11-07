package appointment

import (
	"context"
	"errors"

	"github.com/daidat02/server/internal/domain/customer"
)

// ErrAppointmentNotFound dùng để usecase map đúng 404.
var ErrAppointmentNotFound = errors.New("appointment not found")

type AppoimentRepository interface {
	CreateAppointment(ctx context.Context, appointment *Appointment, items []*AppointmentItem) error
	UpdateAppointment(ctx context.Context, appointment *Appointment, items []*AppointmentItem) error
	GetAppointmentByID(ctx context.Context, orgID, id string) (*AppointmentResponse, error)
	GetAppointmentsByOrgID(ctx context.Context, orgID, status, from, to, search string, limit, offset int) ([]*AppointmentResponse, error)
	CountAppointmentsByOrgID(ctx context.Context, orgID, status, from, to, search string) (int64, error)
	GetAppointmentsByDateRange(ctx context.Context, orgID, from, to string) ([]*AppointmentResponse, error)
	GetAppointmentItems(ctx context.Context, orgID, appointmentID string) ([]*AppointmentItemResponse, error)
	UpdateAppointmentTimes(ctx context.Context, orgID, id, startTime, endTime string) error
	UpdateAppointmentStatus(ctx context.Context, orgID, id, status, cancelReason string) error
	// MarkOverdueAppointmentsAsNoShow chuyển các lịch pending/confirmed đã trễ
	// quá graceMinutes sang no_show, trả về id các lịch đã đổi.
	MarkOverdueAppointmentsAsNoShow(ctx context.Context, orgID string, graceMinutes int) ([]string, error)
	DeleteAppointment(ctx context.Context, orgID, id string) error

	CheckExitAppointmentByID(ctx context.Context, orgID, id string) (*Appointment, error)
}

type CustomerFinder interface {
	CreateCustomer(ctx context.Context, customer *customer.Customer) error
	FindCustomerByPhone(ctx context.Context, orgID, phone string) (*customer.Customer, error)
}

type ServiceFinder interface {
}
