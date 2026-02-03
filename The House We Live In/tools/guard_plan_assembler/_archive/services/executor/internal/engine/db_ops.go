package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/contactos/executor/internal/phases"
)

func (r *Runner) appendLog(ctx context.Context, executionID, level, event string, data map[string]any) error {
	b, _ := json.Marshal(data)
	_, err := r.pool.ExecContext(ctx, `
		insert into execution_logs (execution_id, ts, level, event, data)
		values ($1, now(), $2, $3, $4::jsonb)
	`, executionID, level, event, string(b))
	return err
}

func (r *Runner) insertPhaseRunStarted(ctx context.Context, executionID string, phase int, input phases.PhaseInput) (string, error) {
	inputBytes, _ := json.Marshal(input)
	var id string
	err := r.pool.QueryRowContext(ctx, `
		insert into phase_runs (execution_id, phase, attempt, status, started_at, input, idempotency_key)
		values ($1, $2, 1, 'started', now(), $3::jsonb, $4)
		returning id
	`, executionID, phase, string(inputBytes), fmt.Sprintf("%s:%02d:%d", executionID, phase, 1)).Scan(&id)
	if err != nil {
		return "", err
	}
	_ = r.appendLog(ctx, executionID, "info", fmt.Sprintf("phase_%02d_started", phase), map[string]any{"phase": phase})
	return id, nil
}

func (r *Runner) markPhaseRunSucceeded(ctx context.Context, phaseRunID string, output map[string]any) error {
	outBytes, _ := json.Marshal(output)
	_, err := r.pool.ExecContext(ctx, `
		update phase_runs
		   set status='succeeded', ended_at=now(), output=$2::jsonb
		 where id=$1
	`, phaseRunID, string(outBytes))
	return err
}

func (r *Runner) markPhaseRunFailed(ctx context.Context, phaseRunID string, perr error) error {
	errObj := map[string]any{"message": perr.Error()}
	errBytes, _ := json.Marshal(errObj)
	_, err := r.pool.ExecContext(ctx, `
		update phase_runs
		   set status='failed', ended_at=now(), error=$2::jsonb
		 where id=$1
	`, phaseRunID, string(errBytes))
	return err
}

func (r *Runner) mergeExecutionContext(ctx context.Context, executionID string, output map[string]any) error {
	// Simple merge strategy:
	// execution.context = jsonb || output (top-level overwrite).
	outBytes, _ := json.Marshal(output)
	_, err := r.pool.ExecContext(ctx, `
		update executions
		   set context = context || $2::jsonb,
		       updated_at = now(),
		       locked_at = now()
		 where id=$1
	`, executionID, string(outBytes))
	return err
}

func (r *Runner) setExecutionPhase(ctx context.Context, executionID string, phase int) error {
	_, err := r.pool.ExecContext(ctx, `
		update executions
		   set phase = $2,
		       updated_at = now(),
		       locked_at = now()
		 where id=$1
	`, executionID, phase)
	return err
}

func (r *Runner) failExecution(ctx context.Context, executionID string, phase int, perr error) error {
	errObj := map[string]any{
		"phase":   phase,
		"message": perr.Error(),
		"at":      time.Now().Format(time.RFC3339),
	}
	b, _ := json.Marshal(errObj)
	_, err := r.pool.ExecContext(ctx, `
		update executions
		   set state='failed',
		       error=$2::jsonb,
		       updated_at=now()
		 where id=$1
	`, executionID, string(b))
	_ = r.appendLog(ctx, executionID, "error", "execution_failed", errObj)
	return err
}

func (r *Runner) succeedExecution(ctx context.Context, executionID string) error {
	_, err := r.pool.ExecContext(ctx, `
		update executions
		   set state='succeeded',
		       updated_at=now()
		 where id=$1
	`, executionID)
	_ = r.appendLog(ctx, executionID, "info", "execution_succeeded", map[string]any{"execution_id": executionID})
	return err
}


