package engine

import (
"context"
"database/sql"
"encoding/json"
)

// RunExecution is the worker entrypoint.
// TODO: wire to the actual execution runner once identified.
func RunExecution(ctx context.Context, db *sql.DB, executionID string, request json.RawMessage) error {
_ = ctx
_ = db
_ = executionID
_ = request
return nil
}
