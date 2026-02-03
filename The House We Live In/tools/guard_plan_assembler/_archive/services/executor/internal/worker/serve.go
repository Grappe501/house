package worker

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/contactos/executor/internal/engine"
)

// Serve polls for queued executions, locks one, runs the deterministic engine, then finalizes status.
func Serve(ctx context.Context, db *sql.DB, workerID string, pollInterval time.Duration) error {
	t := time.NewTicker(pollInterval)
	defer t.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
			execID, req, ok, err := lockNext(ctx, db, workerID)
			if err != nil {
				// keep looping; caller can restart on fatal conditions
				continue
			}
			if !ok {
				continue
			}

			runErr := engine.RunExecution(ctx, db, execID, req)

			if runErr != nil {
				_ = finalizeFailed(ctx, db, execID, runErr)
				continue
			}
			_ = finalizeSucceeded(ctx, db, execID)
		}
	}
}

// LoadRequest fetches executions.request for ad-hoc run mode.
func LoadRequest(ctx context.Context, db *sql.DB, executionID string) (json.RawMessage, error) {
	var req []byte
	err := db.QueryRowContext(ctx, `SELECT request FROM executions WHERE id = $1`, executionID).Scan(&req)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(req), nil
}

func lockNext(ctx context.Context, db *sql.DB, workerID string) (string, json.RawMessage, bool, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return "", nil, false, err
	}
	defer tx.Rollback()

	var id string
	var req []byte

	row := tx.QueryRowContext(ctx, `
		WITH next AS (
			SELECT id
			FROM executions
			WHERE state = 'queued'
			  AND (locked_by IS NULL)
			ORDER BY created_at ASC
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE executions
		SET state = 'running',
		    locked_by = $1,
		    locked_at = NOW()
		FROM next
		WHERE executions.id = next.id
		RETURNING executions.id, executions.request
	`, workerID)

	if err := row.Scan(&id, &req); err != nil {
		if err == sql.ErrNoRows {
			return "", nil, false, tx.Commit()
		}
		return "", nil, false, err
	}

	_, _ = tx.ExecContext(ctx, `
		INSERT INTO execution_logs (execution_id, ts, level, event, data)
		VALUES ($1, NOW(), 'info', 'execution_locked', $2::jsonb)
	`, id, fmt.Sprintf(`{"worker_id":%q}`, workerID))

	if err := tx.Commit(); err != nil {
		return "", nil, false, err
	}

	return id, json.RawMessage(req), true, nil
}

func finalizeSucceeded(ctx context.Context, db *sql.DB, executionID string) error {
	_, _ = db.ExecContext(ctx, `
		INSERT INTO execution_logs (execution_id, ts, level, event, data)
		VALUES ($1, NOW(), 'info', 'execution_succeeded', '{}'::jsonb)
	`, executionID)

	_, err := db.ExecContext(ctx, `
		UPDATE executions
		SET state = 'succeeded',
		    locked_by = NULL,
		    locked_at = NULL,
		    error = NULL
		WHERE id = $1
	`, executionID)
	return err
}

func finalizeFailed(ctx context.Context, db *sql.DB, executionID string, runErr error) error {
	errJSON := fmt.Sprintf(`{"message":%q}`, runErr.Error())

	_, _ = db.ExecContext(ctx, `
		INSERT INTO execution_logs (execution_id, ts, level, event, data)
		VALUES ($1, NOW(), 'error', 'execution_failed', $2::jsonb)
	`, executionID, errJSON)

	_, err := db.ExecContext(ctx, `
		UPDATE executions
		SET state = 'failed',
		    locked_by = NULL,
		    locked_at = NULL,
		    error = $2::jsonb
		WHERE id = $1
	`, executionID, errJSON)
	return err
}
