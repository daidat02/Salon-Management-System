package appointment

import (
	"errors"
	"time"
)

type ApoimentItemInput struct {
	ItemType  string  `json:"item_type" binding:"required,oneof=product service"`
	ProductID string  `json:"product_id"`
	ServiceID string  `json:"service_id"`
	Quantity  float64 `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
}

type AppointmentCreateRequest struct {
	Code          string `json:"code"`
	CustomerName  string `json:"customer_name"`
	CustomerPhone string `json:"customer_phone"`

	StaffID               string              `json:"staff_id"`
	StartTime             string              `json:"start_time"`
	EndTime               string              `json:"end_time"`
	Status                string              `json:"status"`
	Source                string              `json:"source"`
	TotalAmount           float64             `json:"total_amount"`
	Note                  string              `json:"note"`
	DeviceID              string              `json:"device_id"`
	ClientIP              string              `json:"client_ip"`
	RequiredDepositAmount float64             `json:"required_deposit_amount"`
	DepositStatus         string              `json:"deposit_status"`
	Items                 []ApoimentItemInput `json:"items"`
}

type RescheduleRequest struct {
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

type UpdateStatusRequest struct {
	Status string `json:"status"`
}

type CancelRequest struct {
	Reason string `json:"reason"`
}

type AppointmentResponse struct {
	ID                    string     `json:"id" db:"id"`
	OrganizationID        string     `json:"organization_id" db:"organization_id"`
	Code                  string     `json:"code" db:"code"`
	CustomerID            string     `json:"customer_id" db:"customer_id"`
	CustomerName          string     `json:"customer_name" db:"customer_name"`
	CustomerPhone         string     `json:"customer_phone" db:"customer_phone"`
	StaffID               *string    `json:"staff_id" db:"staff_id"`
	StaffName             *string    `json:"staff_name" db:"staff_name"`
	StartTime             string     `json:"start_time" db:"start_time"`
	EndTime               string     `json:"end_time" db:"end_time"`
	Status                string     `json:"status" db:"status"`
	Source                string     `json:"source" db:"source"`
	TotalAmount           float64    `json:"total_amount" db:"total_amount"`
	Note                  *string    `json:"note" db:"note"`
	CanceledReason        *string    `json:"cancelled_reason" db:"cancelled_reason"`
	DeviceID              *string    `json:"device_id" db:"device_id"`
	ClientIP              *string    `json:"client_ip" db:"client_ip"`
	RequiredDepositAmount *float64   `json:"required_deposit_amount" db:"required_deposit_amount"`
	DepositStatus         string     `json:"deposit_status" db:"deposit_status"`
	CreatedAt             *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt             *time.Time `json:"updated_at" db:"updated_at"`
}
type AppointmentItemResponse struct {
	ID             string  `json:"id" db:"id"`
	OrganizationID string  `json:"organization_id" db:"organization_id"`
	AppointmentID  string  `json:"appointment_id" db:"appointment_id"`
	ItemType       string  `json:"item_type" db:"item_type"`
	ServiceID      *string `json:"service_id,omitempty" db:"service_id"`
	ProductID      *string `json:"product_id,omitempty" db:"product_id"`
	ServiceName    *string `json:"service_name,omitempty" db:"service_name"`
	ProductName    *string `json:"product_name,omitempty" db:"product_name"`
	Quantity       float64 `json:"quantity" db:"quantity"`
	UnitPrice      float64 `json:"unit_price" db:"unit_price"`
	LineTotal      float64 `json:"line_total" db:"line_total"`
}
type AppointmentDetailResponse struct {
	Appointment *AppointmentResponse       `json:"appointment"`
	Items       []*AppointmentItemResponse `json:"items"`
}

// WeekDaySchedule là lịch hẹn của một ngày trong tuần.
type WeekDaySchedule struct {
	Date         string                 `json:"date"`
	Weekday      string                 `json:"weekday"`
	Total        int                    `json:"total"`
	Appointments []*AppointmentResponse `json:"appointments"`
}

// WeeklyScheduleResponse là lịch tuần tách theo từng ngày (luôn đủ 7 ngày).
type WeeklyScheduleResponse struct {
	WeekStart string             `json:"week_start"`
	WeekEnd   string             `json:"week_end"`
	Total     int                `json:"total"`
	Days      []*WeekDaySchedule `json:"days"`
}

func (req *AppointmentCreateRequest) Validate() error {
	if req.Status != statusPending && req.Status != statusConfirmed && req.Status != statusCheckedIn && req.Status != statusInProgress && req.Status != statusCompleted && req.Status != statusCancelled && req.Status != statusNoShow {
		return errors.New("Trạng thái cuộc hẹn không hợp lệ")
	}
	return nil
}
