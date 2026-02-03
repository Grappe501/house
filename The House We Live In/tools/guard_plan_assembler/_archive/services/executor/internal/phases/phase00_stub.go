package phases

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Phase00Stub struct{}

func (Phase00Stub) Number() int { return 0 }
func (Phase00Stub) Name() string { return "phase00_stub" }

func (Phase00Stub) Run(ctx context.Context, deps any, input PhaseInput) (map[string]any, error) {
	// In v0: prove end-to-end determinism/logging with a simple stub phase.
	_ = deps.(*pgxpool.Pool) // reserved for later
	time.Sleep(350 * time.Millisecond)
	return map[string]any{
		"phase00": map[string]any{
			"ok": true,
			"message": "phase00 stub completed",
		},
	}, nil
}
