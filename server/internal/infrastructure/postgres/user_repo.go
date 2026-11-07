package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	userDomain "github.com/daidat02/server/internal/domain/user"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresUserRepository struct {
	db *pgxpool.Pool
}

func NewPostgresUserRepository(db *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{
		db: db,
	}
}

func (r *PostgresUserRepository) CreateUser(ctx context.Context, orgID string, user *userDomain.User) error {
	_, err := r.db.Exec(
		ctx,
		createUserQuery,
		user.ID,
		orgID,
		user.Email,
		user.Password,
		user.FullName,
		user.Phone,
		user.Role,
		user.Status,
	)
	if err != nil {
		return err
	}
	return nil
}

func (r *PostgresUserRepository) FindUserByPhoneNumber(ctx context.Context, phoneNumber string) (*userDomain.User, error) {
	u := &userDomain.User{}
	var email sql.NullString
	err := r.db.QueryRow(
		ctx,
		findUserByPhoneNumberQuery,
		phoneNumber,
	).Scan(
		&u.ID,
		&u.OrganizationID,
		&email,
		&u.Password,
		&u.FullName,
		&u.Phone,
		&u.Role,
		&u.Status,
		&u.LastLoginAt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if email.Valid {
		u.Email = email.String
	}
	if err != nil {
		fmt.Printf("DEBUG SQL ERROR: %+v\n", err)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return u, nil
}
