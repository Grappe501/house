package engine

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/contactos/executor/internal/phases"
)

func RunPhase05(ctx context.Context, db *sql.DB, executionID string, request json.RawMessage) error {
	var phase03Bytes []byte
	var phase04Bytes []byte
	if err := db.QueryRowContext(ctx, `
		SELECT COALESCE(context->'phase03','{}'::jsonb), COALESCE(context->'phase04','{}'::jsonb)
		FROM executions WHERE id = $1
	`, executionID).Scan(&phase03Bytes, &phase04Bytes); err != nil {
		return fmt.Errorf("phase05: load context: %w", err)
	}

	result, err := phases.RunPhase05(ctx, db, executionID, request, json.RawMessage(phase03Bytes), json.RawMessage(phase04Bytes))
	if err != nil {
		return err
	}

	outputBytes, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("marshal phase05 output: %w", err)
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO phase_runs (execution_id, phase, attempt, status, input, output)
		VALUES ($1, 5, 1, 'succeeded', $2, $3)
	`, executionID, request, outputBytes)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, `
		UPDATE executions
		SET context = COALESCE(context, '{}'::jsonb) || jsonb_build_object('phase05', $2::jsonb),
		    phase = 5
		WHERE id = $1
	`, executionID, outputBytes)
	if err != nil {
		return err
	}

	if err := RunPhaseGuards(ctx, db, executionID, 5, request, outputBytes); err != nil {
		return err
	}
	return nil
}
