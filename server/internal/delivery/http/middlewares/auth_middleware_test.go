package middlewares

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/daidat02/server/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func runAuthRequest(t *testing.T, token string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(VerifyToken())
	r.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"user_id": c.GetString("userId")})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestVerifyToken(t *testing.T) {
	const secret = "test-secret-key"
	utils.InitJWT(secret, time.Hour, 24*time.Hour)

	accessToken, err := utils.GenerateAccessToken("user-1", "org-1", "owner")
	assert.NoError(t, err)
	refreshToken, _, err := utils.GenerateRefreshToken("user-1", "org-1", "owner")
	assert.NoError(t, err)

	legacyToken := jwt.NewWithClaims(jwt.SigningMethodHS256, utils.CustomClaims{
		UserID: "user-legacy",
		OrgID:  "org-1",
		Role:   "owner",
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	})
	legacyTokenString, err := legacyToken.SignedString([]byte(secret))
	assert.NoError(t, err)

	tests := []struct {
		name       string
		token      string
		wantStatus int
	}{
		{name: "access token hợp lệ", token: accessToken, wantStatus: http.StatusOK},
		{name: "refresh token bị từ chối", token: *refreshToken, wantStatus: http.StatusUnauthorized},
		{name: "token legacy chưa có typ vẫn được nhận", token: legacyTokenString, wantStatus: http.StatusOK},
		{name: "thiếu token", token: "", wantStatus: http.StatusUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := runAuthRequest(t, tt.token)
			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestVertifyRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	newRouter := func(role string) (*gin.Engine, *int) {
		calls := 0
		r := gin.New()
		r.GET("/protected", func(c *gin.Context) {
			if role != "" {
				c.Set("role", role)
			}
		}, VertifyRole("owner", "manager"), func(c *gin.Context) {
			calls++
			c.Status(http.StatusOK)
		})
		return r, &calls
	}

	tests := []struct {
		name       string
		role       string
		wantStatus int
		wantCalls  int
	}{
		{name: "owner được phép", role: "owner", wantStatus: http.StatusOK, wantCalls: 1},
		{name: "manager được phép", role: "manager", wantStatus: http.StatusOK, wantCalls: 1},
		{name: "receptionist bị chặn", role: "receptionist", wantStatus: http.StatusForbidden, wantCalls: 0},
		{name: "thiếu role", role: "", wantStatus: http.StatusUnauthorized, wantCalls: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, calls := newRouter(tt.role)
			req := httptest.NewRequest(http.MethodGet, "/protected", nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
			assert.Equal(t, tt.wantCalls, *calls)
		})
	}
}
