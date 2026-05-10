package config

import (
	"strings"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/spf13/viper"
)

type Env string

const (
	EnvLocal      Env = "local"
	EnvDevelopment Env = "development"
	EnvStaging    Env = "staging"
	EnvProduction Env = "production"
)

type Config struct {
	Env      Env            `mapstructure:"env"`
	Server   ServerConfig   `mapstructure:"server"`
	Postgres PostgresConfig `mapstructure:"postgres"`
	Mongo    MongoConfig    `mapstructure:"mongo"`
	Neo4j    Neo4jConfig    `mapstructure:"neo4j"`
	Redis    RedisConfig    `mapstructure:"redis"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	Logger   LoggerConfig   `mapstructure:"logger"`
	Features FeaturesConfig `mapstructure:"features"`
}

// FeaturesConfig controls feature toggles for optional Redis caching behaviors.
// Each flag can be overridden via an environment variable using double-underscore
// as the separator, e.g. FEATURES_REDIS_BOOK_CACHE=false.
type FeaturesConfig struct {
	RedisBookCache           bool `mapstructure:"redis_book_cache"`            // NV-B2: book detail cache
	RedisNewestBooksCache    bool `mapstructure:"redis_newest_books"`          // NV-B3: newest books cache
	RedisStockCache          bool `mapstructure:"redis_stock_cache"`           // NV-F3: stock quantity cache
	RedisCartCache           bool `mapstructure:"redis_cart_cache"`            // NV-C1/C2: Redis cart cache layer
	RedisBestSellers         bool `mapstructure:"redis_best_sellers"`          // NV-E2: bestseller JSON cache (refreshed daily by worker)
	RedisOrderHistory        bool `mapstructure:"redis_order_history"`         // NV-D2: order history list cache (TTL 30 min)
	RedisMostViewedDaily     bool `mapstructure:"redis_most_viewed_daily"`     // NV-E3: daily view count sorted set + data cache
	RedisMostViewed30D       bool `mapstructure:"redis_most_viewed_30d"`       // NV-E3: 30-day aggregated most viewed cache
	RedisCategoryCache       bool `mapstructure:"redis_category_cache"`       // NV-F4: category list cache
}

type ServerConfig struct {
	Port string `mapstructure:"port"`
}

type PostgresConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	DB       string `mapstructure:"db"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	SSLMode  string `mapstructure:"sslmode"`
}

func (c PostgresConfig) DSN() string {
	return "host=" + c.Host +
		" port=" + c.Port +
		" dbname=" + c.DB +
		" user=" + c.User +
		" password=" + c.Password +
		" sslmode=" + c.SSLMode
}

type MongoConfig struct {
	URI string `mapstructure:"uri"`
	DB  string `mapstructure:"db"`
}

type Neo4jConfig struct {
	URI      string `mapstructure:"uri"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
}

type RedisConfig struct {
	Addr     string `mapstructure:"addr"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type JWTConfig struct {
	Secret    string        `mapstructure:"secret"`
	AccessTTL time.Duration `mapstructure:"access_ttl"`
}

type LoggerConfig struct {
	Level string `mapstructure:"level"`
}

// Load reads configuration from embedded defaults, then overlays environment variables.
// Env vars map to config keys using double-underscore as separator
// (e.g. POSTGRES_HOST overrides postgres.host).
func Load() *Config {
	v := viper.New()

	v.SetConfigType("yaml")
	if err := v.ReadConfig(strings.NewReader(defaultConfig)); err != nil {
		panic("failed to read default config: " + err.Error())
	}

	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	cfg := &Config{}
	if err := v.Unmarshal(cfg, func(dc *mapstructure.DecoderConfig) {
		dc.TagName = "mapstructure"
	}); err != nil {
		panic("failed to unmarshal config: " + err.Error())
	}

	return cfg
}
