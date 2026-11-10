package user

import (
	"context"
	"errors"
	"time"
)

var (
	ErrRefreshTokenNotFound = errors.New("refresh token không tồn tại")
	ErrRefreshTokenReused   = errors.New("refresh token đã bị thu hồi hoặc thay thế")
	ErrRefreshTokenExpired  = errors.New("refresh token đã hết hạn")
)

type UserRepository interface {
	CreateUser(ctx context.Context, orgID string, user *User) error
	FindUserByPhoneNumber(ctx context.Context, phoneNumber string) (*User, error)
	FindUserByID(ctx context.Context, userID string) (*User, error)
}

type RefreshTokenRepository interface {
	Create(ctx context.Context, token *RefreshToken) error
	Rotate(ctx context.Context, oldTokenHash string, newToken *RefreshToken, now time.Time) error
	RevokeFamilyByTokenHash(ctx context.Context, tokenHash string, now time.Time) error
	DeleteExpired(ctx context.Context, before time.Time) error
}
