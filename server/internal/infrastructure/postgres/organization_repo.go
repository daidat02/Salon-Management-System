package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	domain "github.com/daidat02/server/internal/domain/organization"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresOrganizationRepository struct {
	db          *pgxpool.Pool
	settingRepo *PostgresSettingRepository
}

func NewPostgresOrganizationRepository(db *pgxpool.Pool, settingRepo *PostgresSettingRepository) *PostgresOrganizationRepository {
	return &PostgresOrganizationRepository{db: db, settingRepo: settingRepo}
}

// CreateOrganization tạo organization + user owner; settings do settingRepo
// khởi tạo trong cùng transaction.
func (r *PostgresOrganizationRepository) CreateOrganization(ctx context.Context, org *domain.Organization, owner *domain.OwnerAccount) (*domain.OrganizationResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var createdAt, updatedAt time.Time
	err = tx.QueryRow(
		ctx,
		createOrganizationQuery,
		org.ID,
		org.Name,
		org.Slug,
		org.Phone,
		org.Address,
		org.Timezone,
		org.Status,
		org.Email,
		org.Website,
		org.TaxCode,
		org.Slogan,
		org.LogoURL,
	).Scan(&createdAt, &updatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, domain.ErrSlugExists
		}
		return nil, fmt.Errorf("lỗi khi tạo tổ chức: %w", err)
	}

	if _, err := tx.Exec(
		ctx,
		createOwnerUserQuery,
		owner.ID,
		org.ID,
		owner.Phone,
		owner.PasswordHash,
		owner.FullName,
	); err != nil {
		return nil, fmt.Errorf("lỗi khi tạo tài khoản owner: %w", err)
	}

	if err := r.settingRepo.InsertSetting(ctx, tx, org.ID); err != nil {
		
		return nil, fmt.Errorf("lỗi khi tạo cấu hình mặc định: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("lỗi khi commit transaction: %w", err)
	}

	return toOrganizationResponse(org, createdAt, updatedAt), nil
}

func toOrganizationResponse(org *domain.Organization, createdAt, updatedAt time.Time) *domain.OrganizationResponse {
	resp := &domain.OrganizationResponse{
		ID:        org.ID,
		Name:      org.Name,
		Slug:      org.Slug,
		Phone:     org.Phone,
		Address:   org.Address,
		Timezone:  org.Timezone,
		Status:    org.Status,
		CreatedAt: &createdAt,
		UpdatedAt: &updatedAt,
	}
	if org.Email != "" {
		resp.Email = &org.Email
	}
	if org.Website != "" {
		resp.Website = &org.Website
	}
	if org.TaxCode != "" {
		resp.TaxCode = &org.TaxCode
	}
	if org.Slogan != "" {
		resp.Slogan = &org.Slogan
	}
	if org.LogoURL != "" {
		resp.LogoURL = &org.LogoURL
	}
	return resp
}
