package user

import (
	"context"
	"errors"
	"net"
	"strings"
	"time"

	userdomain "github.com/daidat02/server/internal/domain/user"
	"github.com/daidat02/server/pkg/apperror"
	utils "github.com/daidat02/server/pkg/utils"
)

type TokenMetadata struct {
	UserAgent string
	IP        string
}

type UserUsecase struct {
	userRepo  userdomain.UserRepository
	tokenRepo userdomain.RefreshTokenRepository
}

func NewUserUsecase(userRepo userdomain.UserRepository, tokenRepo userdomain.RefreshTokenRepository) *UserUsecase {
	return &UserUsecase{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
	}
}

func (uc *UserUsecase) RegisterUser(c context.Context, user *userdomain.User) (*userdomain.UserResponse, error) {
	ctx, cancel := context.WithTimeout(c, 5*time.Second)
	defer cancel()

	user.Status = userdomain.StatusActive
	if err := user.Validate(); err != nil {
		return nil, err
	}

	existingUser, err := uc.userRepo.FindUserByPhoneNumber(ctx, user.Phone)
	if err != nil && !errors.Is(err, context.DeadlineExceeded) {
		return nil, apperror.New(500, "Lỗi khi kiểm tra số điện thoại", err)
	}
	if existingUser != nil {
		return nil, apperror.New(400, "Số điện thoại đã tồn tại", nil)
	}

	hashPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi băm mật khẩu", err)
	}

	user.Password = hashPassword
	if user.ID == "" {
		user.ID = utils.NewID()
	}

	err = uc.userRepo.CreateUser(ctx, user.OrganizationID, user)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, apperror.New(408, "Lỗi: Hết thời gian chờ khi tạo người dùng", err)
		}

		return nil, apperror.New(500, "Lỗi khi tạo người dùng", err)
	}

	response := &userdomain.UserResponse{
		ID:             user.ID,
		OrganizationID: user.OrganizationID,
		Email:          user.Email,
		FullName:       user.FullName,
		PhoneNumber:    user.Phone,
		Role:           user.Role,
		Status:         user.Status,
	}
	return response, nil
}

func (uc *UserUsecase) LoginUser(c context.Context, req *userdomain.LoginRequest, meta TokenMetadata) (*userdomain.UserResponse, *string, *string, error) {
	ctx, cancel := context.WithTimeout(c, 5*time.Second)
	defer cancel()
	err := req.Validate()
	if err != nil {
		return nil, nil, nil, apperror.New(400, "Dữ liệu không hợp lệ", err)
	}

	existingUser, err := uc.userRepo.FindUserByPhoneNumber(ctx, req.PhoneNumber)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, nil, nil, apperror.New(408, "Lỗi: Hết thời gian chờ khi tìm kiếm người dùng", err)
		}
		return nil, nil, nil, apperror.New(500, "Lỗi khi tìm kiếm người dùng", err)
	}
	if existingUser == nil {
		return nil, nil, nil, apperror.New(404, "Số điện thoại không tồn tại", nil)
	}

	if !utils.CheckPasswordHash(req.Password, existingUser.Password) {
		return nil, nil, nil, apperror.New(401, "Mật khẩu không đúng", nil)
	}

	accessToken, err := utils.GenerateAccessToken(existingUser.ID, existingUser.OrganizationID, existingUser.Role)
	if err != nil {
		return nil, nil, nil, apperror.New(500, "Lỗi khi tạo token", err)
	}

	refreshToken, refreshExpiresAt, err := utils.GenerateRefreshToken(existingUser.ID, existingUser.OrganizationID, existingUser.Role)
	if err != nil {
		return nil, nil, nil, apperror.New(500, "Lỗi khi tạo Refresh Token", err)
	}

	userAgent, ip := normalizeTokenMetadata(meta)
	err = uc.tokenRepo.Create(ctx, &userdomain.RefreshToken{
		ID:        utils.NewID(),
		UserID:    existingUser.ID,
		FamilyID:  utils.NewID(),
		TokenHash: utils.HashToken(*refreshToken),
		ExpiresAt: refreshExpiresAt,
		UserAgent: userAgent,
		IP:        ip,
	})
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, nil, nil, apperror.New(408, "Lỗi: Hết thời gian chờ khi lưu Refresh Token", err)
		}
		return nil, nil, nil, apperror.New(500, "Lỗi khi lưu Refresh Token", err)
	}

	var lastLogin time.Time
	if existingUser.LastLoginAt != nil {
		lastLogin = *existingUser.LastLoginAt
	}

	return &userdomain.UserResponse{
		ID:             existingUser.ID,
		OrganizationID: existingUser.OrganizationID,
		Email:          existingUser.Email,
		FullName:       existingUser.FullName,
		PhoneNumber:    existingUser.Phone,
		Role:           existingUser.Role,
		Status:         existingUser.Status,
		LastLoginAt:    lastLogin,
		CreatedAt:      *existingUser.CreatedAt,
		UpdatedAt:      *existingUser.UpdatedAt,
	}, &accessToken, refreshToken, nil
}

func (uc *UserUsecase) RefreshToken(c context.Context, refreshToken string, meta TokenMetadata) (*string, *string, error) {
	ctx, cancel := context.WithTimeout(c, 5*time.Second)
	defer cancel()

	claims, err := utils.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, nil, apperror.New(401, "Refresh Token không hợp lệ", err)
	}

	existingUser, err := uc.userRepo.FindUserByID(ctx, claims.UserID)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, nil, apperror.New(408, "Lỗi: Hết thời gian chờ khi tìm kiếm người dùng", err)
		}
		return nil, nil, apperror.New(500, "Lỗi khi tìm kiếm người dùng", err)
	}
	if existingUser == nil || existingUser.Status != userdomain.StatusActive {
		return nil, nil, apperror.New(401, "Tài khoản không khả dụng", nil)
	}

	newRefreshToken, refreshExpiresAt, err := utils.GenerateRefreshToken(claims.UserID, claims.OrgID, claims.Role)
	if err != nil {
		return nil, nil, apperror.New(500, "Lỗi khi tạo Refresh Token", err)
	}
	userAgent, ip := normalizeTokenMetadata(meta)
	err = uc.tokenRepo.Rotate(ctx, utils.HashToken(refreshToken), &userdomain.RefreshToken{
		ID:        utils.NewID(),
		UserID:    claims.UserID,
		TokenHash: utils.HashToken(*newRefreshToken),
		ExpiresAt: refreshExpiresAt,
		UserAgent: userAgent,
		IP:        ip,
	}, time.Now())
	if err != nil {
		switch {
		case errors.Is(err, userdomain.ErrRefreshTokenNotFound),
			errors.Is(err, userdomain.ErrRefreshTokenReused),
			errors.Is(err, userdomain.ErrRefreshTokenExpired):
			return nil, nil, apperror.New(401, "Refresh Token không hợp lệ hoặc đã hết hạn", nil)
		default:
			return nil, nil, apperror.New(500, "Lỗi khi xoay vòng Refresh Token", err)
		}
	}

	accessToken, err := utils.GenerateAccessToken(claims.UserID, claims.OrgID, claims.Role)
	if err != nil {
		return nil, nil, apperror.New(500, "Lỗi khi tạo Access Token", err)
	}

	return &accessToken, newRefreshToken, nil
}

func (uc *UserUsecase) Logout(c context.Context, refreshToken string) error {
	ctx, cancel := context.WithTimeout(c, 5*time.Second)
	defer cancel()

	if refreshToken == "" {
		return nil
	}
	err := uc.tokenRepo.RevokeFamilyByTokenHash(ctx, utils.HashToken(refreshToken), time.Now())
	if err != nil {
		return apperror.New(500, "Lỗi khi đăng xuất", err)
	}
	return nil
}

func normalizeTokenMetadata(meta TokenMetadata) (*string, *string) {
	userAgent := strings.TrimSpace(meta.UserAgent)
	if len(userAgent) > 512 {
		userAgent = userAgent[:512]
	}
	var userAgentPtr *string
	if userAgent != "" {
		userAgentPtr = &userAgent
	}

	ip := strings.TrimSpace(meta.IP)
	var ipPtr *string
	if parsed := net.ParseIP(ip); parsed != nil {
		normalized := parsed.String()
		ipPtr = &normalized
	}
	return userAgentPtr, ipPtr
}
