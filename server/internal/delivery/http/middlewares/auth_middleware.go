package middlewares

import (
	"context"
	"errors"
	"strings"

	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/response"
	"github.com/daidat02/server/pkg/utils"
	"github.com/gin-gonic/gin"
)

type contextKey string

const OrgIdKey contextKey = contextKey("organization_id")
const UserIdKey contextKey = contextKey("user_id")

func VerifyToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Lấy token từ header Authorization
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			response.Error(c, apperror.New(401, "Thiếu token xác thực, đăng nhập để tiếp tục", nil))
			c.Abort()
			return
		}

		paths := strings.Split(authHeader, " ")
		if len(paths) != 2 || paths[0] != "Bearer" {
			response.Error(c, apperror.New(401, "Token xác thực không hợp lệ", nil))
			c.Abort()
			return
		}

		tokenString := paths[1]
		claims, err := utils.ValidateAccessToken(tokenString)
		if err != nil {
			response.Error(c, apperror.New(401, "Token xác thực không hợp lệ", nil))
			c.Abort()
			return
		}
		c.Set("userId", claims.UserID)
		c.Set("role", claims.Role)
		c.Set("orgId", claims.OrgID)
		ctx := c.Request.Context()
		ctx = context.WithValue(ctx, OrgIdKey, claims.OrgID)
		ctx = context.WithValue(ctx, UserIdKey, claims.UserID)

		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

func VertifyRole(requiredRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		value, exists := c.Get("role")
		userRole, ok := value.(string)
		if !exists || !ok || userRole == "" {
			response.Error(c, apperror.New(401, "Không tìm thấy vai trò người dùng", nil))
			c.Abort()
			return
		}

		for _, role := range requiredRoles {
			if userRole == role {
				c.Next()
				return
			}
		}

		response.Error(c, apperror.New(403, "Người dùng không có quyền truy cập", nil))
		c.Abort()
	}
}

func GetOrgID(ctx context.Context) (string, error) {
	orgID, ok := ctx.Value(OrgIdKey).(string)

	if !ok || orgID == "" {
		return "", errors.New("missing organization_id in context")
	}
	return orgID, nil
}

func GetUserID(ctx context.Context) (string, error) {
	userID, ok := ctx.Value(UserIdKey).(string)
	if !ok || userID == "" {
		return "", errors.New("missing user_id in context")
	}
	return userID, nil
}
