package user

import "context"

type UserRepository interface {
	CreateUser(ctx context.Context, orgID string, user *User) error

	FindUserByPhoneNumber(ctx context.Context, phoneNumber string) (*User, error)
}
