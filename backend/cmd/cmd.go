package cmd

import (
	"bookstore/backend/config"
	"bookstore/backend/utils/log"
	"fmt"
	"os"

	_ "bookstore/backend/docs" // register Swagger docs
	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
)

// Run is the entrypoint called from main. It loads the .env file (if present),
// initialises configuration, wires dependencies, and executes the Cobra command tree.
func Run(args []string) {
	// Load .env file if it exists (ignored in production where real env vars are set)
	_ = godotenv.Load()

	cfg := config.Load()
	logger := log.New(cfg.Logger)

	rootCmd := &cobra.Command{
		Use:   "bookstore",
		Short: "Online Bookstore API — polyglot persistence backend",
		Long: `bookstore is a REST API server for the Online Bookstore system.
It connects to PostgreSQL, MongoDB, Neo4j, and Redis to serve
book catalog, cart, orders, and recommendation features.`,
	}

	rootCmd.AddCommand(newServerCmd(cfg, logger))
	rootCmd.SetArgs(args[1:])

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
