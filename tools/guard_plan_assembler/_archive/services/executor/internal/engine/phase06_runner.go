package engine

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/contactos/executor/internal/phases"
)

func RunPhase06(ctx context.Context, db *sql.DB, executionID string, request json.RawMessage) error {
	// Load phase04 and phase05 context
	var phase04Bytes []byte
	var phase05Bytes []byte
	if err := db.QueryRowContext(ctx, `
		SELECT COALESCE(context->'phase04','{}'::jsonb), COALESCE(context->'phase05','{}'::jsonb)
		FROM executions WHERE id = $1
	`, executionID).Scan(&phase04Bytes, &phase05Bytes); err != nil {
		return fmt.Errorf("phase06: load context: %w", err)
	}

	result, err := phases.RunPhase06(ctx, db, executionID, request, json.RawMessage(phase04Bytes), json.RawMessage(phase05Bytes))
	if err != nil {
		return err
	}

	outputBytes, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("marshal phase06 output: %w", err)
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO phase_runs (execution_id, phase, attempt, status, input, output)
		VALUES ($1, 6, 1, 'succeeded', $2, $3)
	`, executionID, request, outputBytes)
	if err != nil {
		return err
	}

	// Persist Phase06 result and advance phase.
	_, err = db.ExecContext(ctx, `
		UPDATE executions
		SET context = COALESCE(context, '{}'::jsonb) || jsonb_build_object('phase06', $2::jsonb),
		    phase = 6
		WHERE id = $1
	`, executionID, outputBytes)
	if err != nil {
		return err
	}

	// Record artifacts in DB (URIs from phase06 output).
	var p6 struct {
		ManifestURI string `json:"manifest_uri"`
		DocsURI     string `json:"docs_uri"`
	}
	_ = json.Unmarshal(outputBytes, &p6)

	if p6.ManifestURI != "" {
		_, _ = db.ExecContext(ctx, `
			INSERT INTO artifacts (execution_id, phase, kind, uri, meta)
			VALUES ($1, 6, 'manifest_json', $2, '{}'::jsonb)
		`, executionID, p6.ManifestURI)
	}
	if p6.DocsURI != "" {
		_, _ = db.ExecContext(ctx, `
			INSERT INTO artifacts (execution_id, phase, kind, uri, meta)
			VALUES ($1, 6, 'docs_index_json', $2, '{}'::jsonb)
		`, executionID, p6.DocsURI)
	}

	if err := RunPhaseGuards(ctx, db, executionID, 6, request, outputBytes); err != nil {
		return err
	}

	return nil
}
