package server

import (
	"bookstore/backend/config"
	"bookstore/backend/internal/middleware"
	"net/http"

	"github.com/gin-gonic/gin"
	ginSwagger "github.com/swaggo/gin-swagger"
	swaggerFiles "github.com/swaggo/files"
	"go.uber.org/zap"
)

// NewServer builds the Gin engine with all route groups registered.
func NewServer(svc *Service, cfg *config.Config, logger *zap.Logger) *gin.Engine {
	if cfg.Env == config.EnvProduction {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(zapLogger(logger))
	r.Use(corsMiddleware())

	// Health check — always public
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Swagger UI
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Middleware factories (pre-bound to shared deps)
	requireAuth  := middleware.RequireAuth(svc.sessionRepo, cfg.JWT.Secret)
	requireUser  := middleware.RequireUser(svc.sessionRepo, cfg.JWT.Secret)
	requireAdmin := middleware.RequireAdmin(svc.sessionRepo, cfg.JWT.Secret)

	v1 := r.Group("/api/v1")

	// ── PUBLIC ────────────────────────────────────────────────────────────
	pub := v1.Group("")
	{
		pub.POST("/auth/register", svc.Register)
		pub.POST("/auth/login", svc.Login)

		pub.GET("/books", svc.SearchBooks)
		pub.GET("/books/new", svc.GetNewBooks)
		pub.GET("/books/:id", svc.GetBookDetail)
		pub.GET("/books/:id/similar", svc.GetSimilarBooks)
		pub.GET("/books/:id/series", svc.GetSeriesBooks)

		pub.GET("/categories", svc.GetCategories)

		pub.GET("/best-sellers", svc.GetBestSellers)
		pub.GET("/most-viewed/daily", svc.GetTopDailyViewed)
		pub.GET("/most-viewed/30days", svc.GetTopMostViewed30Days)
	}

	// ── SHARED AUTH (any valid JWT — used for logout) ─────────────────────
	auth := v1.Group("", requireAuth)
	{
		auth.POST("/auth/logout", svc.Logout)
	}

	// ── CUSTOMER (role: "user" only) ──────────────────────────────────────
	user := v1.Group("", requireUser)
	{
		user.GET("/users/me", svc.GetProfile)
		user.PUT("/users/me", svc.UpdateProfile)

		user.GET("/cart", svc.GetCart)
		user.POST("/cart", svc.AddToCart)
		user.PUT("/cart/:bookId", svc.UpdateCartItem)
		user.DELETE("/cart/:bookId", svc.RemoveCartItem)

		user.POST("/orders/checkout", svc.Checkout)
		user.POST("/orders/buy-now", svc.BuyNow)
		user.GET("/orders", svc.GetOrderHistory)
		user.GET("/orders/:id", svc.GetOrderDetail)

		user.POST("/books/:id/view", svc.ViewBook)
	}

	// ── ADMIN (role: "admin" only) ────────────────────────────────────────
	admin := v1.Group("/admin", requireAdmin)
	{
		// Book & Catalog management
		admin.GET("/books", svc.AdminListBooks)
		admin.POST("/books", svc.AdminCreateBook)
		admin.PUT("/books/:id", svc.AdminUpdateBook)
		admin.DELETE("/books/:id", svc.AdminDeleteBook)
		admin.PATCH("/books/:id/stock", svc.AdminUpdateStock)

		// Category management (MongoDB-backed)
		admin.GET("/categories", svc.AdminListCategories)
		admin.POST("/categories", svc.AdminCreateCategory)
		admin.PUT("/categories/:id", svc.AdminUpdateCategory)
		admin.DELETE("/categories/:id", svc.AdminDeleteCategory)

		// Order management
		admin.GET("/orders", svc.AdminListOrders)
		admin.GET("/orders/:id", svc.AdminGetOrder)
		admin.PATCH("/orders/:id/status", svc.AdminUpdateOrderStatus)
		admin.GET("/orders/:id/history", svc.AdminGetOrderHistory)

		// User management
		admin.GET("/users", svc.AdminListUsers)
		admin.GET("/users/:id", svc.AdminGetUser)
		admin.PATCH("/users/:id/deactivate", svc.AdminDeactivateUser)

		// Analytics
		admin.GET("/analytics/best-sellers", svc.AdminGetBestSellers)
		admin.GET("/analytics/sales", svc.AdminGetSales)
	}

	return r
}

// zapLogger is a minimal Gin middleware that logs each request via Zap.
func zapLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		logger.Info("request",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.String("ip", c.ClientIP()),
		)
	}
}

// corsMiddleware sets permissive CORS headers for development.
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
