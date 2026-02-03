package engine

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/contactos/executor/internal/phases"
)

func RunPhase03(ctx context.Context, db *sql.DB, executionID string, request json.RawMessage) error {
	result, err := phases.RunPhase03(ctx, db, executionID, request)
	if err != nil {
		return err
	}

	outputBytes, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("marshal phase03 output: %w", err)
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO phase_runs (execution_id, phase, attempt, status, input, output)
		VALUES ($1, 3, 1, 'succeeded', $2, $3)
	`, executionID, request, outputBytes)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, `
		UPDATE executions
		SET context = COALESCE(context, '{}'::jsonb) || jsonb_build_object('phase03', $2::jsonb),
		    phase = 3
		WHERE id = $1
	`, executionID, outputBytes)
	if err != nil {
		return err
	}

	if err := RunPhaseGuards(ctx, db, executionID, 3, request, outputBytes); err != nil {
		return err
	}
	return nil
}
