package guards

import (
	"context"
	"database/sql"
	"encoding/json"
)

// Guard evaluates an execution at a specific phase boundary.
// Input and Output are the phase run JSON payloads (as stored in phase_runs.input/output).
type Guard interface {
	Name() string
	Evaluate(ctx context.Context, db *sql.DB, executionID string, phase int, input json.RawMessage, output json.RawMessage) (*Result, error)
}
