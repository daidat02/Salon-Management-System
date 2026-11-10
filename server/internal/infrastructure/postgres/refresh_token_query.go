package postgres

const (
	insertRefreshTokenQuery = `
		INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at, user_agent, ip)
		VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::inet)
	`

	lockRefreshTokenQuery = `
		SELECT id, family_id, expires_at, revoked_at, replaced_by_id
		FROM refresh_tokens
		WHERE token_hash = $1
		FOR UPDATE
	`

	revokeTokenQuery = `
		UPDATE refresh_tokens
		SET revoked_at = $2
		WHERE token_hash = $1 AND revoked_at IS NULL
	`

	rotateTokenQuery = `
		UPDATE refresh_tokens
		SET revoked_at = $2, replaced_by_id = $3
		WHERE token_hash = $1 AND revoked_at IS NULL
	`

	revokeFamilyByTokenHashQuery = `
		UPDATE refresh_tokens
		SET revoked_at = $2
		WHERE revoked_at IS NULL
		  AND family_id = (
			SELECT family_id FROM refresh_tokens WHERE token_hash = $1
		  )
	`

	deleteExpiredRefreshTokensQuery = `
		DELETE FROM refresh_tokens WHERE expires_at < $1
	`
)
