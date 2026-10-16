package shared

import (
	"context"
	"strings"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	"github.com/daidat02/server/pkg/apperror"
)

// RequireOrgID lấy organization_id từ context, thiếu thì 400.
// Dùng chung cho mọi usecase thay vì gọi middlewares.GetOrgID trực tiếp.
func RequireOrgID(ctx context.Context) (string, error) {
	orgID, err := middlewares.GetOrgID(ctx)
	if err != nil {
		return "", apperror.New(400, "Không tìm thấy organization_id trong context", err)
	}
	return orgID, nil
}

// RequireID trim id, rỗng thì 400 với message của caller.
func RequireID(id, msg string) (string, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return "", apperror.New(400, msg, nil)
	}
	return id, nil
}
