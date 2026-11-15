package user

import (
	"errors"
	"log"
	"net/http"

	config "github.com/daidat02/server/configs"
	domain "github.com/daidat02/server/internal/domain/user"
	uc "github.com/daidat02/server/internal/usecase/user"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/response"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	useCase *uc.UserUsecase
	jwtCfg  config.JWTConfig
}

func NewCreateUserHandler(useCase *uc.UserUsecase, jwtCfg config.JWTConfig) *UserHandler {
	return &UserHandler{
		useCase: useCase,
		jwtCfg:  jwtCfg,
	}
}

// CreateUser godoc
// @Summary      Đăng ký người dùng
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.CreateUserRequest  true  "Thông tin đăng ký"
// @Success      200   {object}  response.SuccessResponse  "Tạo người dùng thành công"
// @Failure      400   {object}  response.ErrorResponse    "Dữ liệu không hợp lệ / Số điện thoại đã tồn tại"
// @Failure      500   {object}  response.ErrorResponse    "Lỗi server"
// @Router       /register [post]
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req domain.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	user := &domain.User{
		Email:    req.Email,
		Password: req.Password,
		FullName: req.FullName,
		Phone:    req.Phone,
		Role:     req.Role,
		Status:   req.Status,
	}

	createdUser, err := h.useCase.RegisterUser(c, user)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Tạo người dùng thành công", createdUser)
}

func (h *UserHandler) sameSite() http.SameSite {
	switch h.jwtCfg.CookieSameSite {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func (h *UserHandler) setRefreshTokenCookie(c *gin.Context, refreshToken string) {
	c.SetSameSite(h.sameSite())
	c.SetCookie(
		"refresh_token",
		refreshToken,
		int(h.jwtCfg.RefreshTokenExpire.Seconds()),
		"/",
		h.jwtCfg.CookieDomain,
		h.jwtCfg.CookieSecure,
		true,
	)
}

func (h *UserHandler) clearRefreshTokenCookie(c *gin.Context) {
	c.SetSameSite(h.sameSite())
	c.SetCookie(
		"refresh_token",
		"",
		-1,
		"/",
		h.jwtCfg.CookieDomain,
		h.jwtCfg.CookieSecure,
		true,
	)
}

func tokenMetadata(c *gin.Context) uc.TokenMetadata {
	return uc.TokenMetadata{
		UserAgent: c.Request.UserAgent(),
		IP:        c.ClientIP(),
	}
}

// Login godoc
// @Summary      Đăng nhập
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.LoginRequest       true  "Số điện thoại + mật khẩu"
// @Success      200   {object}  response.SuccessResponse  "Đăng nhập thành công (kèm access_token)"
// @Failure      400   {object}  response.ErrorResponse    "Dữ liệu không hợp lệ"
// @Failure      401   {object}  response.ErrorResponse    "Mật khẩu không đúng"
// @Failure      404   {object}  response.ErrorResponse    "Số điện thoại không tồn tại"
// @Router       /login [post]
func (h *UserHandler) Login(c *gin.Context) {
	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	user, accessToken, refreshToken, err := h.useCase.LoginUser(c, &req, tokenMetadata(c))
	if err != nil {
		response.Error(c, err)
		return
	}

	h.setRefreshTokenCookie(c, *refreshToken)

	response.Success(c, http.StatusOK, "Đăng nhập thành công", gin.H{
		"user":         user,
		"access_token": accessToken,
	})
}

// RefreshToken godoc
// @Summary      Làm mới access token
// @Tags         Auth
// @Produce      json
// @Success      200   {object}  response.SuccessResponse  "Làm mới token thành công (kèm access_token mới)"
// @Failure      400   {object}  response.ErrorResponse    "Thiếu cookie refresh_token"
// @Failure      401   {object}  response.ErrorResponse    "Refresh token không hợp lệ hoặc hết hạn"
// @Router       /refresh-token [post]
func (h *UserHandler) RefreshToken(c *gin.Context) {
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		log.Printf("Error retrieving refresh token cookie: %v", err)
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	accessToken, newrefreshToken, err := h.useCase.RefreshToken(c, refreshToken, tokenMetadata(c))
	if err != nil {
		var appErr *apperror.AppError
		if errors.As(err, &appErr) && appErr.StatusCode == http.StatusUnauthorized {
			h.clearRefreshTokenCookie(c)
		}
		response.Error(c, err)
		return
	}


	h.setRefreshTokenCookie(c, *newrefreshToken)
	response.Success(c, http.StatusOK, "Làm mới token thành công", gin.H{
		"access_token": *accessToken,
	})
}

// Logout godoc
// @Summary      Đăng xuất
// @Tags         Auth
// @Security     BearerAuth
// @Produce      json
// @Success      200   {object}  response.SuccessResponse  "Đăng xuất thành công"
// @Failure      401   {object}  response.ErrorResponse    "Access token không hợp lệ"
// @Router       /logout [post]
func (h *UserHandler) Logout(c *gin.Context) {
	refreshToken, _ := c.Cookie("refresh_token")
	err := h.useCase.Logout(c, refreshToken)
	h.clearRefreshTokenCookie(c)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Đăng xuất thành công", nil)
}
