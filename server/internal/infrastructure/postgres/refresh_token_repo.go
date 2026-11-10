package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRefreshTokenRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRefreshTokenRepository(db *pgxpool.Pool) *PostgresRefreshTokenRepository {
	return &PostgresRefreshTokenRepository{db: db}
}

func (r *PostgresRefreshTokenRepository) Create(ctx context.Context, token *userDomain.RefreshToken) error {
	_, err := r.db.Exec(
		ctx,
		insertRefreshTokenQuery,
		token.ID,
		token.UserID,
		token.FamilyID,
		token.TokenHash,
		token.ExpiresAt,
		nullableString(token.UserAgent),
		nullableString(token.IP),
	)
	return err
}

func (r *PostgresRefreshTokenRepository) Rotate(ctx context.Context, oldTokenHash string, newToken *userDomain.RefreshToken, now time.Time) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var (
		id           string
		familyID     string
		expiresAt    time.Time
		revokedAt    sql.NullTime
		replacedByID sql.NullString
	)
	err = tx.QueryRow(ctx, lockRefreshTokenQuery, oldTokenHash).Scan(
		&id,
		&familyID,
		&expiresAt,
		&revokedAt,
		&replacedByID,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return userDomain.ErrRefreshTokenNotFound
		}
		return err
	}

	if revokedAt.Valid || replacedByID.Valid {
		if _, err := tx.Exec(ctx, revokeFamilyByTokenHashQuery, oldTokenHash, now); err != nil {
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
		return userDomain.ErrRefreshTokenReused
	}

	if !expiresAt.After(now) {
		if _, err := tx.Exec(ctx, revokeTokenQuery, oldTokenHash, now); err != nil {
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
		return userDomain.ErrRefreshTokenExpired
	}

	newToken.FamilyID = familyID
	if _, err := tx.Exec(
		ctx,
		insertRefreshTokenQuery,
		newToken.ID,
		newToken.UserID,
		newToken.FamilyID,
		newToken.TokenHash,
		newToken.ExpiresAt,
		nullableString(newToken.UserAgent),
		nullableString(newToken.IP),
	); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, rotateTokenQuery, oldTokenHash, now, newToken.ID); err != nil {
		return err
	}
	// Lazy cleanup: token hết hạn quá 1 ngày không còn giá trị audit/reuse detection.
	_, _ = tx.Exec(ctx, deleteExpiredRefreshTokensQuery, now.Add(-24*time.Hour))

	return tx.Commit(ctx)
}

func (r *PostgresRefreshTokenRepository) RevokeFamilyByTokenHash(ctx context.Context, tokenHash string, now time.Time) error {
	_, err := r.db.Exec(ctx, revokeFamilyByTokenHashQuery, tokenHash, now)
	return err
}

func (r *PostgresRefreshTokenRepository) DeleteExpired(ctx context.Context, before time.Time) error {
	_, err := r.db.Exec(ctx, deleteExpiredRefreshTokensQuery, before)
	return err
}

func nullableString(value *string) interface{} {
	if value == nil {
		return nil
	}
	return *value
}
