package staff

import "time"

type CreateStaffRequest struct {
	ID                string  `json:"id"`
	OrganizationId    string  `json:"organization_id"`
	FullName          string  `json:"full_name"`
	Phone             string  `json:"phone"`
	Email             string  `json:"email"`
	BirthDate         *string `json:"birth_date"`
	Gender            string  `json:"gender"`
	Address           string  `json:"address"`
	Position          string  `json:"position"`
	EmploymentType    string  `json:"employment_type"`
	CommissionRate    float64 `json:"commission_rate"`
	BaseSalary        float64 `json:"base_salary"`
	BankName          string  `json:"bank_name"`
	BankAccountNumber string  `json:"bank_account_number"`
	BankAccountHolder string  `json:"bank_account_holder"`
	Status            string  `json:"status"`
	HireDate          *string `json:"hire_date"`
}

type UpdateStaffRequest struct {
	Code              string  `json:"code"`
	FullName          string  `json:"full_name"`
	Phone             string  `json:"phone"`
	Email             string  `json:"email"`
	BirthDate         *string `json:"birth_date"`
	Gender            string  `json:"gender"`
	Address           string  `json:"address"`
	Position          string  `json:"position"`
	EmploymentType    string  `json:"employment_type"`
	CommissionRate    float64 `json:"commission_rate"`
	BaseSalary        float64 `json:"base_salary"`
	BankName          string  `json:"bank_name"`
	BankAccountNumber string  `json:"bank_account_number"`
	BankAccountHolder string  `json:"bank_account_holder"`
	Status            string  `json:"status"`
	HireDate          *string `json:"hire_date"`
}

type StaffResponse struct {
	ID                string     `json:"id"`
	OrganizationID    string     `json:"organization_id"`
	Code              string     `json:"code"`
	FullName          string     `json:"full_name"`
	Phone             string     `json:"phone"`
	Email             string     `json:"email"`
	BirthDate         *time.Time `json:"birth_date"`
	Gender            string     `json:"gender"`
	Address           string     `json:"address"`
	Position          string     `json:"position"`
	EmploymentType    string     `json:"employment_type"`
	CommissionRate    float64    `json:"commission_rate"`
	BaseSalary        float64    `json:"base_salary"`
	BankName          string     `json:"bank_name"`
	BankAccountNumber string     `json:"bank_account_number"`
	BankAccountHolder string     `json:"bank_account_holder"`
	Status            string     `json:"status"`
	HireDate          time.Time  `json:"hire_date"`
	CreatedAt         *time.Time `json:"created_at"`
	UpdatedAt         *time.Time `json:"updated_at"`
	DeletedAt         *time.Time `json:"deleted_at"`
}
