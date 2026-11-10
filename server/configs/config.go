package config

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	JWT      JWTConfig
	R2       R2Config
}

type AppConfig struct {
	Env       string `mapstructure:"APP_ENV"`
	Port      string `mapstructure:"APP_PORT"`
	BasePath  string `mapstructure:"API_BASE_PATH"`
	ServerURL string `mapstructure:"SERVER_URL"`
}

type DatabaseConfig struct {
	DB_USER     string `mapstructure:"DB_USER"`
	DB_PASSWORD string `mapstructure:"DB_PASSWORD"`
	DB_NAME     string `mapstructure:"DB_NAME"`
	DB_PORT     string `mapstructure:"DB_PORT"`
	DB_url      string `mapstructure:"DB_URL"`
}

type JWTConfig struct {
	Secret             string        `mapstructure:"JWT_SECRET"`
	AccessTokenExpire  time.Duration `mapstructure:"ACCESS_TOKEN_EXPIRE"`
	RefreshTokenExpire time.Duration `mapstructure:"REFRESH_TOKEN_EXPIRE"`
	CookieSecure       bool          `mapstructure:"REFRESH_COOKIE_SECURE"`
	CookieSameSite     string        `mapstructure:"REFRESH_COOKIE_SAMESITE"`
	CookieDomain       string        `mapstructure:"REFRESH_COOKIE_DOMAIN"`
}

func (c *JWTConfig) Validate(appEnv string) error {
	if strings.TrimSpace(c.Secret) == "" {
		return fmt.Errorf("JWT_SECRET không được để trống")
	}
	if appEnv == "production" && len(c.Secret) < 32 {
		return fmt.Errorf("JWT_SECRET phải có ít nhất 32 ký tự ở production")
	}
	if c.AccessTokenExpire <= 0 {
		return fmt.Errorf("ACCESS_TOKEN_EXPIRE phải lớn hơn 0")
	}
	if c.RefreshTokenExpire <= 0 {
		return fmt.Errorf("REFRESH_TOKEN_EXPIRE phải lớn hơn 0")
	}
	if c.RefreshTokenExpire <= c.AccessTokenExpire {
		return fmt.Errorf("REFRESH_TOKEN_EXPIRE phải lớn hơn ACCESS_TOKEN_EXPIRE")
	}
	c.CookieSameSite = strings.ToLower(strings.TrimSpace(c.CookieSameSite))
	switch c.CookieSameSite {
	case "lax", "strict", "none":
	default:
		return fmt.Errorf("REFRESH_COOKIE_SAMESITE phải là lax, strict hoặc none")
	}
	if c.CookieSameSite == "none" && !c.CookieSecure {
		return fmt.Errorf("REFRESH_COOKIE_SECURE phải bật khi REFRESH_COOKIE_SAMESITE=none")
	}
	return nil
}

type R2Config struct {
	AccountID       string `mapstructure:"R2_ACCOUNT_ID"`
	AccessKeyID     string `mapstructure:"R2_ACCESS_KEY_ID"`
	SecretAccessKey string `mapstructure:"R2_ACCESS_KEY_SECRET"`
	BucketName      string `mapstructure:"R2_BUCKET_NAME"`
	PublicURL       string `mapstructure:"R2_PUBLIC_URL"`
}

// LoadConfig khởi tạo cấu hình từ các biến môi trường

func LoadConfig() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")
	viper.AutomaticEnv()

	viper.SetDefault("APP_PORT", "8080")
	viper.SetDefault("APP_ENV", "development")
	viper.SetDefault("API_BASE_PATH", "/api/v1")
	viper.SetDefault("SERVER_URL", "http://localhost:8080")
	if err := viper.ReadInConfig(); err != nil {
		log.Println("Không tìm thấy file .env, đang đọc trực tiếp từ Environment Variables của hệ thống")
	}
	var config Config
	if err := viper.Unmarshal(&config.App); err != nil {
		return nil, err
	}
	if err := viper.Unmarshal(&config.Database); err != nil {
		return nil, err
	}

	viper.SetDefault("REFRESH_COOKIE_SAMESITE", "lax")
	if !viper.IsSet("REFRESH_COOKIE_SECURE") {
		viper.SetDefault("REFRESH_COOKIE_SECURE", config.App.Env == "production")
	}
	if err := viper.Unmarshal(&config.JWT); err != nil {
		return nil, err
	}
	if err := config.JWT.Validate(config.App.Env); err != nil {
		return nil, fmt.Errorf("cấu hình JWT không hợp lệ: %w", err)
	}
	if err := viper.Unmarshal(&config.R2); err != nil {
		return nil, err
	}
	return &config, nil
}
