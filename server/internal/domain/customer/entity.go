package customer

import (
	"errors"
	"time"
)

const (
	GenderMale   = "male"
	GenderFemale = "female"
	GenderOther  = "other"

	// VNDPerRewardPoint là số tiền chi tiêu để tích 1 điểm thưởng.
	VNDPerRewardPoint = 10000
)

// RewardPointsForAmount quy đổi số tiền chi tiêu thành điểm thưởng,
// làm tròn xuống theo từng mốc VNDPerRewardPoint.
func RewardPointsForAmount(amount float64) int {
	if amount <= 0 {
		return 0
	}
	return int(amount / VNDPerRewardPoint)
}

type Customer struct {
	ID             string     `json:"id" db:"id"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	FullName       string     `json:"full_name" db:"full_name"`
	Phone          string     `json:"phone" db:"phone"`
	Gender         string     `json:"gender" db:"gender"`
	BirthDate      *time.Time `json:"birth_date" db:"birth_date"`
	Note           string     `json:"note" db:"note"`
	TotalSpent     float64    `json:"total_spent" db:"total_spent"`
	TotalVisits    int        `json:"total_visits" db:"total_visits"`
	RewardPoints   int        `json:"reward_points" db:"reward_points"`
	IsFlaggedRisk  bool       `json:"is_flagged_risk" db:"is_flagged_risk"`
	CreatedAt      *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at" db:"deleted_at"`
}

func (c *Customer) Validate() error {
	if c.FullName == "" {
		return errors.New("Tên khách hàng không được để trống")
	}
	if c.Phone == "" {
		return errors.New("Số điện thoại không được để trống")
	}
	if c.Gender != "" && c.Gender != GenderMale && c.Gender != GenderFemale && c.Gender != GenderOther {
		return errors.New("Giới tính không hợp lệ")
	}
	return nil
}
