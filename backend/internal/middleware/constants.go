package middleware

const (
	// CtxUserAliasID is the Gin context key that holds the authenticated user's alias_id
	// UUID string — safe to expose externally (used for Redis cache keys and API responses).
	CtxUserAliasID = "userAliasID"
	// CtxUserInternalID is the Gin context key that holds the authenticated user's internal
	// BIGSERIAL int64 — used exclusively for PostgreSQL FK operations, never sent to clients.
	CtxUserInternalID = "userInternalID"
	// CtxUserRole is the Gin context key that holds the authenticated user's role.
	CtxUserRole = "userRole"
	// CtxToken is the Gin context key that holds the raw JWT string for blacklist checks.
	CtxToken = "token"

	// HeaderAuthorization is the HTTP header name for Bearer tokens.
	HeaderAuthorization = "Authorization"
	// BearerPrefix is the prefix stripped from the Authorization header value.
	BearerPrefix = "Bearer "
)
