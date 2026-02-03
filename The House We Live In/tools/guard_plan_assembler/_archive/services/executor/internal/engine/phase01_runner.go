package engine

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/contactos/executor/internal/phases"
)

func RunPhase01(ctx context.Context, db *sql.DB, executionID string, request json.RawMessage) error {
	result, err := phases.RunPhase01(ctx, db, executionID, request)
	if err != nil {
		return err
	}

	outputBytes, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("marshal phase01 output: %w", err)
	}

	// Record phase run (input + output) to support deterministic guard evaluation.
	_, err = db.ExecContext(ctx, `
		INSERT INTO phase_runs (execution_id, phase, attempt, status, input, output)
		VALUES ($1, 1, 1, 'succeeded', $2, $3)
	`, executionID, request, outputBytes)
	if err != nil {
		return err
	}

	// Run guards for Phase 01 boundary.
	if err := RunPhaseGuards(ctx, db, executionID, 1, request, outputBytes); err != nil {
		return err
	}

	return nil
}
