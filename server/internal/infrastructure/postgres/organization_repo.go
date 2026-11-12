package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	domain "github.com/daidat02/server/internal/domain/organization"
	"github.com/jackc/pgx/v5"
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
		org.IsDemo,
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

	if err := seedDemoData(ctx, tx, org.ID); err != nil {
		return nil, fmt.Errorf("lỗi khi tạo dữ liệu mẫu: %w", err)
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
		IsDemo:    org.IsDemo,
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

// DisableDemo xóa toàn bộ dữ liệu nghiệp vụ của organization, giữ lại các
// bảng cấu hình và reset số dư quỹ về số dư đầu kỳ.
func (r *PostgresOrganizationRepository) DisableDemo(ctx context.Context, orgID string) (*domain.OrganizationResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var org domain.Organization
	var createdAt, updatedAt time.Time
	err = tx.QueryRow(ctx, getOrganizationForDemoQuery, orgID).Scan(
		&org.ID,
		&org.Name,
		&org.Slug,
		&org.Phone,
		&org.Address,
		&org.Timezone,
		&org.Status,
		&org.Email,
		&org.Website,
		&org.TaxCode,
		&org.Slogan,
		&org.LogoURL,
		&org.IsDemo,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrOrganizationNotFound
		}
		return nil, fmt.Errorf("lỗi khi lấy tổ chức: %w", err)
	}

	if !org.IsDemo {
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("lỗi khi commit transaction: %w", err)
		}
		return toOrganizationResponse(&org, createdAt, updatedAt), nil
	}

	for _, query := range deleteDemoDataQueries {
		if _, err := tx.Exec(ctx, query, orgID); err != nil {
			return nil, fmt.Errorf("lỗi khi xóa dữ liệu mẫu: %w", err)
		}
	}

	if _, err := tx.Exec(ctx, resetOrganizationFundsQuery, orgID); err != nil {
		return nil, fmt.Errorf("lỗi khi reset quỹ: %w", err)
	}
	if err := tx.QueryRow(ctx, updateOrganizationDemoQuery, orgID).Scan(&updatedAt); err != nil {
		return nil, fmt.Errorf("lỗi khi tắt chế độ dữ liệu mẫu: %w", err)
	}

	org.IsDemo = false
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("lỗi khi commit transaction: %w", err)
	}
	return toOrganizationResponse(&org, createdAt, updatedAt), nil
}
