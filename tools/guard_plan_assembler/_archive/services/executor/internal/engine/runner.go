package engine

import (
"database/sql"
)

// Runner is a thin wrapper used by db_ops.go.
// db_ops.go expects a field named `pool`.
type Runner struct {
pool *sql.DB
*sql.DB
}

// NewRunner creates a Runner backed by a *sql.DB.
func NewRunner(db *sql.DB) *Runner {
return &Runner{
pool: db,
DB:   db,
}
}
