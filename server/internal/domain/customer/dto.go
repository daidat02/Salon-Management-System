package customer

import "time"

type CreateCustomerRequest struct {
	FullName  string  `json:"full_name"`
	Phone     string  `json:"phone"`
	Gender    string  `json:"gender"`
	BirthDate *string `json:"birth_date"`
	Note      string  `json:"note"`
}

type UpdateCustomerRequest struct {
	FullName  string  `json:"full_name"`
	Phone     string  `json:"phone"`
	Gender    string  `json:"gender"`
	BirthDate *string `json:"birth_date"`
	Note      string  `json:"note"`
}

type CustomerResponse struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	FullName       string     `json:"full_name"`
	Phone          string     `json:"phone"`
	Gender         string     `json:"gender"`
	BirthDate      *time.Time `json:"birth_date"`
	Note           string     `json:"note"`
	TotalSpent     float64    `json:"total_spent"`
	TotalVisits    int        `json:"total_visits"`
	RewardPoints   int        `json:"reward_points"`
	IsFlaggedRisk  bool       `json:"is_flagged_risk"`
	CreatedAt      *time.Time `json:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at"`
}

type SpendByMonth struct {
	Month       string  `json:"month" db:"month"`
	TotalSpent  float64 `json:"total_spent" db:"total_spent"`
	TotalOrders int     `json:"total_orders" db:"total_orders"`
}
type CustomerDetailsResponse struct {
	ID                         string         `json:"id" db:"id"`
	OrganizationID             string         `json:"organization_id" db:"organization_id"`
	FullName                   string         `json:"full_name" db:"full_name"`
	Phone                      string         `json:"phone" db:"phone"`
	Gender                     string         `json:"gender" db:"gender"`
	BirthDate                  *time.Time     `json:"birth_date" db:"birth_date"`
	Note                       string         `json:"note" db:"note"`
	TotalSpent                 float64        `json:"total_spent" db:"total_spent"`
	TotalVisits                int            `json:"total_visits" db:"total_visits"`
	RewardPoints               int            `json:"reward_points" db:"reward_points"`
	IsFlaggedRisk              bool           `json:"is_flagged_risk" db:"is_flagged_risk"`
	CreatedAt                  *time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt                  *time.Time     `json:"updated_at" db:"updated_at"`
	DeletedAt                  *time.Time     `json:"deleted_at" db:"deleted_at"`
	TotalCancelledAppointments int            `json:"total_cancelled_appointments" db:"total_cancelled_appointments"`
	SpendingByMonth            []SpendByMonth `json:"spending_by_month"`
}

// CustomerStatsResponse thống kê tổng quan tệp khách của salon.
type CustomerStatsResponse struct {
	TotalCustomer             int64 `json:"total_customer" db:"total_customer"`
	TotalNewCustomer          int64 `json:"total_new_customer" db:"total_new_customer"`
	TotalNewCustomerLastMonth int64 `json:"total_new_customer_last_month" db:"total_new_customer_last_month"`
	TotalOutstandingPoints    int64 `json:"total_outstanding_points" db:"total_outstanding_points"`
}
