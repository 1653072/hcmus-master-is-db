// @title           HCMUS Bookstore API
// @version         2.0
// @description     Polyglot persistence bookstore backend — PostgreSQL · MongoDB · Neo4j · Redis.
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.email  support@bookstore.local

// @license.name  MIT
// @license.url   https://opensource.org/licenses/MIT

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer " followed by your JWT token.

package main

import (
	"bookstore/backend/cmd"
	"os"
)

func main() {
	cmd.Run(os.Args)
}
