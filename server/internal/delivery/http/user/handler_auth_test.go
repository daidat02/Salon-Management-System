package user

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/daidat02/server/configs"
	userdomain "github.com/daidat02/server/internal/domain/user"
	uc "github.com/daidat02/server/internal/usecase/user"
	"github.com/daidat02/server/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

type fakeUserRepository struct {
	user *userdomain.User
}

func (f *fakeUserRepository) CreateUser(context.Context, string, *userdomain.User) error {
	return nil
}
func (f *fakeUserRepository) FindUserByPhoneNumber(context.Context, string) (*userdomain.User, error) {
	return f.user, nil
}
func (f *fakeUserRepository) FindUserByID(context.Context, string) (*userdomain.User, error) {
	return f.user, nil
}

type fakeRefreshTokenRepository struct {
	revokedHash string
}

func (f *fakeRefreshTokenRepository) Create(context.Context, *userdomain.RefreshToken) error {
	return nil
}
func (f *fakeRefreshTokenRepository) Rotate(context.Context, string, *userdomain.RefreshToken, time.Time) error {
	return nil
}
func (f *fakeRefreshTokenRepository) RevokeFamilyByTokenHash(_ context.Context, tokenHash string, _ time.Time) error {
	f.revokedHash = tokenHash
	return nil
}
func (f *fakeRefreshTokenRepository) DeleteExpired(context.Context, time.Time) error { return nil }

func newTestHandler(t *testing.T) (*UserHandler, *fakeRefreshTokenRepository) {
	t.Helper()
	utils.InitJWT("test-secret-key", time.Hour, 24*time.Hour)
	tokenRepo := &fakeRefreshTokenRepository{}
	userRepo := &fakeUserRepository{user: &userdomain.User{
		ID: "user-1", OrganizationID: "org-1", Role: userdomain.RoleOwner, Status: userdomain.StatusActive,
	}}
	useCase := uc.NewUserUsecase(userRepo, tokenRepo)
	h := NewCreateUserHandler(useCase, config.JWTConfig{
		Secret:             "test-secret-key",
		AccessTokenExpire:  time.Hour,
		RefreshTokenExpire: 24 * time.Hour,
		CookieSameSite:     "lax",
	})
	return h, tokenRepo
}

func refreshRouter(h *UserHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/refresh-token", h.RefreshToken)
	return r
}

func TestRefreshTokenHandler_RejectsAccessToken(t *testing.T) {
	h, _ := newTestHandler(t)
	accessToken, err := utils.GenerateAccessToken("user-1", "org-1", userdomain.RoleOwner)
	assert.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/refresh-token", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: accessToken})
	w := httptest.NewRecorder()
	refreshRouter(h).ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRefreshTokenHandler_AcceptsRefreshToken(t *testing.T) {
	h, _ := newTestHandler(t)
	refreshToken, _, err := utils.GenerateRefreshToken("user-1", "org-1", userdomain.RoleOwner)
	assert.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/refresh-token", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: *refreshToken})
	w := httptest.NewRecorder()
	refreshRouter(h).ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "access_token")
	cookie := w.Header().Get("Set-Cookie")
	assert.Contains(t, cookie, "refresh_token=")
	assert.Contains(t, cookie, "HttpOnly")
	assert.Contains(t, cookie, "Path=/")
	assert.Contains(t, cookie, "SameSite=Lax")
	assert.NotContains(t, strings.ToLower(cookie), "refresh_token=;")
}
