package engine

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/contactos/executor/internal/phases"
)

func RunPhase04(ctx context.Context, db *sql.DB, executionID string, request json.RawMessage) error {
	var phase03Bytes []byte
	if err := db.QueryRowContext(ctx, `
		SELECT COALESCE(context->'phase03','{}'::jsonb) FROM executions WHERE id = $1
	`, executionID).Scan(&phase03Bytes); err != nil {
		return fmt.Errorf("phase04: load context: %w", err)
	}

	result, err := phases.RunPhase04(ctx, db, executionID, request, json.RawMessage(phase03Bytes))
	if err != nil {
		return err
	}

	outputBytes, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("marshal phase04 output: %w", err)
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO phase_runs (execution_id, phase, attempt, status, input, output)
		VALUES ($1, 4, 1, 'succeeded', $2, $3)
	`, executionID, request, outputBytes)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, `
		UPDATE executions
		SET context = COALESCE(context, '{}'::jsonb) || jsonb_build_object('phase04', $2::jsonb),
		    phase = 4
		WHERE id = $1
	`, executionID, outputBytes)
	if err != nil {
		return err
	}

	if err := RunPhaseGuards(ctx, db, executionID, 4, request, outputBytes); err != nil {
		return err
	}
	return nil
}
