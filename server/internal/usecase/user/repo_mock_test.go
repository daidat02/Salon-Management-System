package user

import (
	"context"
	"time"

	userdomain "github.com/daidat02/server/internal/domain/user"
	"github.com/stretchr/testify/mock"
)

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) CreateUser(ctx context.Context, orgID string, user *userdomain.User) error {
	args := m.Called(ctx, orgID, user)
	return args.Error(0)
}

func (m *MockUserRepository) FindUserByPhoneNumber(ctx context.Context, phoneNumber string) (*userdomain.User, error) {
	args := m.Called(ctx, phoneNumber)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userdomain.User), args.Error(1)
}

func (m *MockUserRepository) FindUserByID(ctx context.Context, userID string) (*userdomain.User, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userdomain.User), args.Error(1)
}

type MockRefreshTokenRepository struct {
	mock.Mock
}

func (m *MockRefreshTokenRepository) Create(ctx context.Context, token *userdomain.RefreshToken) error {
	args := m.Called(ctx, token)
	return args.Error(0)
}

func (m *MockRefreshTokenRepository) Rotate(ctx context.Context, oldTokenHash string, newToken *userdomain.RefreshToken, now time.Time) error {
	args := m.Called(ctx, oldTokenHash, newToken, now)
	return args.Error(0)
}

func (m *MockRefreshTokenRepository) RevokeFamilyByTokenHash(ctx context.Context, tokenHash string, now time.Time) error {
	args := m.Called(ctx, tokenHash, now)
	return args.Error(0)
}

func (m *MockRefreshTokenRepository) DeleteExpired(ctx context.Context, before time.Time) error {
	args := m.Called(ctx, before)
	return args.Error(0)
}
