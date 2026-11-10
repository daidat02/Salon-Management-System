package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

var ErrInvalidTokenType = errors.New("loại token không hợp lệ")

type CustomClaims struct {
	OrgID  string `json:"org_id,omitempty"`
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	Typ    string `json:"typ,omitempty"`
	jwt.RegisteredClaims
}

var jwtSecret []byte
var accessTokenExpire time.Duration
var refreshTokenExpire time.Duration
var legacyAccessCutoff time.Time

func InitJWT(secret string, accessExpire, refreshExpire time.Duration) {
	jwtSecret = []byte(secret)
	accessTokenExpire = accessExpire
	refreshTokenExpire = refreshExpire
	// Token access cũ chưa có typ chỉ được chấp nhận tối đa bằng vòng đời access token.
	legacyAccessCutoff = time.Now().Add(accessExpire)
}

func GenerateToken(userID, orgID, role string) (string, error) {
	return generateToken(userID, orgID, role, TokenTypeAccess, accessTokenExpire)
}

func GenerateAccessToken(userID, orgID, role string) (string, error) {
	return generateToken(userID, orgID, role, TokenTypeAccess, accessTokenExpire)
}

func GenerateRefreshToken(userID string, orgID string, role string) (*string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(refreshTokenExpire)
	tokenStr, err := generateTokenAt(userID, orgID, role, TokenTypeRefresh, now, expiresAt)
	if err != nil {
		return nil, now, err
	}
	return &tokenStr, expiresAt, nil
}

func generateToken(userID, orgID, role, typ string, ttl time.Duration) (string, error) {
	now := time.Now()
	return generateTokenAt(userID, orgID, role, typ, now, now.Add(ttl))
}

func generateTokenAt(userID, orgID, role, typ string, issuedAt, expiresAt time.Time) (string, error) {
	regClaims := jwt.RegisteredClaims{
		ID:        NewID(),
		IssuedAt:  jwt.NewNumericDate(issuedAt),
		ExpiresAt: jwt.NewNumericDate(expiresAt),
	}

	claims := CustomClaims{
		OrgID:            orgID,
		UserID:           userID,
		Role:             role,
		Typ:              typ,
		RegisteredClaims: regClaims,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func ValidateToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("thuật toán ký không hợp lệ")
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, errors.New("token không hợp lệ")
	}

	return claims, nil
}

func ValidateAccessToken(tokenString string) (*CustomClaims, error) {
	claims, err := ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}
	if claims.Typ == TokenTypeAccess {
		return claims, nil
	}
	if claims.Typ == "" && time.Now().Before(legacyAccessCutoff) {
		return claims, nil
	}
	return nil, ErrInvalidTokenType
}

func ValidateRefreshToken(tokenString string) (*CustomClaims, error) {
	claims, err := ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}
	if claims.Typ != TokenTypeRefresh {
		return nil, ErrInvalidTokenType
	}
	return claims, nil
}

func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
