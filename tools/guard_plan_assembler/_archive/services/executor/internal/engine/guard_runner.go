package engine

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/contactos/executor/internal/guards"
)

// RunPhaseGuards evaluates and records guard results for a completed phase.
// Policy: FAIL aborts execution; WARN records but continues.
func RunPhaseGuards(ctx context.Context, db *sql.DB, executionID string, phase int, input json.RawMessage, output json.RawMessage) error {
	list := guards.PhaseGuards(phase)
	for _, g := range list {
		res, err := g.Evaluate(ctx, db, executionID, phase, input, output)
		if err != nil {
			return fmt.Errorf("guard %s evaluate: %w", g.Name(), err)
		}

		details := res.Details
		if len(details) == 0 {
			details = json.RawMessage(`{}`)
		}

		// Record guard result
		_, insErr := db.ExecContext(ctx, `
			INSERT INTO guard_results (execution_id, phase, guard_name, status, details, created_at)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, executionID, phase, res.GuardName, string(res.Status), details, time.Now().UTC())
		if insErr != nil {
			return fmt.Errorf("insert guard_results: %w", insErr)
		}

		// Enforce policy
		if res.Status == guards.StatusFail {
			return fmt.Errorf("guard_failed:%s", res.GuardName)
		}
	}
	return nil
}
