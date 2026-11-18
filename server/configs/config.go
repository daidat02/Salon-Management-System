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
	GinMode  string 			`mapstructure:"GIN_MODE"`
	Env       string 			`mapstructure:"APP_ENV"`
	Port      string 			`mapstructure:"PORT"`
	BasePath  string 			`mapstructure:"API_BASE_PATH"`
	ServerURL string 			`mapstructure:"SERVER_URL"`
	AllowedOriginsRaw string  	`mapstructure:"CORS_ALLOWED_ORIGINS"`
	AllowedOrigins []string  	`mapstructure:"-"`
}

type DatabaseConfig struct {
	DB_USER     string `mapstructure:"DB_USER"`
	DB_PASSWORD string `mapstructure:"DB_PASSWORD"`
	DB_NAME     string `mapstructure:"DB_NAME"`
	DB_PORT     string `mapstructure:"DB_PORT"`
	DB_URL      string `mapstructure:"DB_URL"`
}

type JWTConfig struct {
	Secret             string        `mapstructure:"JWT_SECRET"`
	AccessTokenExpire  time.Duration `mapstructure:"ACCESS_TOKEN_EXPIRE"`
	RefreshTokenExpire time.Duration `mapstructure:"REFRESH_TOKEN_EXPIRE"`
	CookieSecure       bool          `mapstructure:"REFRESH_COOKIE_SECURE"`
	CookieSameSite     string        `mapstructure:"REFRESH_COOKIE_SAMESITE"`
	CookieDomain       string        `mapstructure:"REFRESH_COOKIE_DOMAIN"`
}

type R2Config struct {
	AccountID       string `mapstructure:"R2_ACCOUNT_ID"`
	AccessKeyID     string `mapstructure:"R2_ACCESS_KEY_ID"`
	SecretAccessKey string `mapstructure:"R2_ACCESS_KEY_SECRET"`
	BucketName      string `mapstructure:"R2_BUCKET_NAME"`
	PublicURL       string `mapstructure:"R2_PUBLIC_URL"`
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



// LoadConfig khởi tạo cấu hình từ các biến môi trường

func LoadConfig() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")
	viper.AutomaticEnv()

	envKeys := []string{
		// AppConfig
		"GIN_MODE",
		"APP_ENV",
		"PORT",
		"API_BASE_PATH",
		"SERVER_URL",
		"CORS_ALLOWED_ORIGINS",
		// DatabaseConfig
		"DB_USER",
		"DB_PASSWORD",
		"DB_NAME",
		"DB_PORT",
		"DB_URL",

		// JWTConfig
		"JWT_SECRET",
		"ACCESS_TOKEN_EXPIRE",
		"REFRESH_TOKEN_EXPIRE",
		"REFRESH_COOKIE_SECURE",
		"REFRESH_COOKIE_SAMESITE",
		"REFRESH_COOKIE_DOMAIN",

		// R2Config
		"R2_ACCOUNT_ID",
		"R2_ACCESS_KEY_ID",
		"R2_ACCESS_KEY_SECRET",
		"R2_BUCKET_NAME",
		"R2_PUBLIC_URL",
	}

	for _, key := range envKeys{
		_ = viper.BindEnv(key)
	}


	viper.SetDefault("PORT", "8080")
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

	if config.App.AllowedOriginsRaw != "" {
		for _, origin := range strings.Split(config.App.AllowedOriginsRaw, ","){
			if trimmedOrigin := strings.TrimSpace(origin); trimmedOrigin != "" {
				config.App.AllowedOrigins = append(config.App.AllowedOrigins, trimmedOrigin)
			}
		}
	}

	if err := viper.Unmarshal(&config.Database); err != nil {
		return nil, err
	}
	
	viper.SetDefault("REFRESH_COOKIE_SAMESITE", "lax")
	viper.SetDefault("REFRESH_COOKIE_DOMAIN", "")
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
