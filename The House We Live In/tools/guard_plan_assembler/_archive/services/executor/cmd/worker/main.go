package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/contactos/executor/internal/engine"
)

func envInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	pollMs := envInt("CONTACTOS_WORKER_POLL_MS", 750)
	maxRuns := envInt("CONTACTOS_WORKER_MAX_RUNS", 0) // 0 = infinite

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// graceful shutdown
	sigc := make(chan os.Signal, 2)
	signal.Notify(sigc, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigc
		cancel()
	}()

	log.Printf("contactos worker started poll=%dms max_runs=%d", pollMs, maxRuns)

	runs := 0
	for {
		if engine.DrainEnabled() {
			log.Printf("drain mode enabled; sleeping")
			time.Sleep(time.Second)
			continue
		}

		if ctx.Err() != nil {
			log.Printf("worker stopping")
			return
		}

		claimed, execID, req, claimErr := claimNext(ctx, db)
		if claimErr != nil {
			log.Printf("claim error: %v", claimErr)
			time.Sleep(time.Duration(pollMs) * time.Millisecond)
			continue
		}
		if !claimed {
			time.Sleep(time.Duration(pollMs) * time.Millisecond)
			continue
		}

		runs++
		log.Printf("running execution %s", execID)

		runErr := engine.RunExecution(ctx, db, execID, req)
		if runErr != nil {
			if runErr == engine.ErrCancelled {
				log.Printf("execution %s cancelled", execID)
				_ = markCancelled(ctx, db, execID)
				continue
			}

			log.Printf("execution %s failed: %v", execID, runErr)
			_ = markFailed(ctx, db, execID, runErr)
		} else {
			log.Printf("execution %s succeeded", execID)
			_ = markSucceeded(ctx, db, execID)
		}

		if maxRuns > 0 && runs >= maxRuns {
			log.Printf("worker reached max_runs=%d; exiting", maxRuns)
			return
		}
	}
}

func claimNext(ctx context.Context, db *sql.DB) (bool, string, json.RawMessage, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return false, "", nil, err
	}
	defer func() { _ = tx.Rollback() }()

	// Claim the oldest queued execution, safely under row lock.
	row := tx.QueryRowContext(ctx, `
		WITH c AS (
			SELECT id
			FROM executions
			WHERE state = 'queued' AND cancelled = FALSE
			ORDER BY created_at ASC
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE executions e
		SET state = 'running',
		    updated_at = NOW()
		FROM c
		WHERE e.id = c.id
		RETURNING e.id, e.request
	`)

	var id string
	var reqBytes []byte
	if scanErr := row.Scan(&id, &reqBytes); scanErr != nil {
		// no rows is expected when none queued
		if scanErr == sql.ErrNoRows {
			if err := tx.Commit(); err != nil {
				return false, "", nil, err
			}
			return false, "", nil, nil
		}
		return false, "", nil, scanErr
	}

	if err := tx.Commit(); err != nil {
		return false, "", nil, err
	}

	return true, id, json.RawMessage(reqBytes), nil
}

func markSucceeded(ctx context.Context, db *sql.DB, id string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE executions
		SET state = 'succeeded',
		    updated_at = NOW()
		WHERE id = $1
	`, id)
	return err
}

func markFailed(ctx context.Context, db *sql.DB, id string, runErr error) error {
	// Store error object in executions.error for UI
	_, err := db.ExecContext(ctx, `
		UPDATE executions
		SET state = 'failed',
		    error = jsonb_build_object('message', $2),
		    updated_at = NOW()
		WHERE id = $1
	`, id, runErr.Error())
	return err
}


func markCancelled(ctx context.Context, db *sql.DB, id string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE executions
		SET state = 'cancelled',
		    cancelled = TRUE,
		    updated_at = NOW()
		WHERE id = $1
	`, id)
	return err
}


