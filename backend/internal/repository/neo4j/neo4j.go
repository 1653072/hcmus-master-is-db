package neo4j

import (
	"context"
	"fmt"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// runQuery executes a single Cypher query inside an auto-commit session and
// returns the raw result records.  It is a convenience helper used by all
// repository methods to avoid boilerplate session management.
func runQuery(ctx context.Context, driver neo4j.DriverWithContext, cypher string, params map[string]any) ([]*neo4j.Record, error) {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.Run(ctx, cypher, params)
	if err != nil {
		return nil, fmt.Errorf("neo4j run: %w", err)
	}

	records, err := result.Collect(ctx)
	if err != nil {
		return nil, fmt.Errorf("neo4j collect: %w", err)
	}
	return records, nil
}

// writeQuery executes a write Cypher statement (CREATE/MERGE/DELETE/SET).
// The result is consumed so the driver fully executes the query before the
// session is closed — without Consume(), auto-commit writes may silently fail.
func writeQuery(ctx context.Context, driver neo4j.DriverWithContext, cypher string, params map[string]any) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	result, err := session.Run(ctx, cypher, params)
	if err != nil {
		return fmt.Errorf("neo4j write: %w", err)
	}

	if _, err := result.Consume(ctx); err != nil {
		return fmt.Errorf("neo4j write consume: %w", err)
	}
	return nil
}
