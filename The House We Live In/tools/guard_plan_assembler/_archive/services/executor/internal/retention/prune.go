package retention

import (
	"context"
	"database/sql"
	"log"
	"time"
)

func Prune(ctx context.Context, db *sql.DB, p Policy) (int, error) {
	cutoff := time.Now().Add(-p.MaxAge)

	res, err := db.ExecContext(ctx, `
		DELETE FROM artifacts WHERE created_at < $1;
		DELETE FROM guard_results WHERE created_at < $1;
		DELETE FROM phase_runs WHERE created_at < $1;
		DELETE FROM executions WHERE created_at < $1;
	`, cutoff)
	if err != nil {
		return 0, err
	}
	_ = res
	return 1, nil
}

func StartPruner(ctx context.Context, db *sql.DB) {
	p := FromEnv()
	ticker := time.NewTicker(6 * time.Hour)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if _, err := Prune(ctx, db, p); err != nil {
					log.Printf("retention prune error: %v", err)
				} else {
					log.Printf("retention prune complete")
				}
			}
		}
	}()
}
