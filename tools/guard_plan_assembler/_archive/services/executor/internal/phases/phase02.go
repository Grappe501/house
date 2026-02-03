package phases

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

type Phase02Plan struct {
	PlannedAt     time.Time `json:"planned_at"`
	SchemaVersion string    `json:"schema_version"`
	Kind          string    `json:"kind"`
	ImportPlan    struct {
		Mode         string `json:"mode"`          // e.g. "zip_root"
		SourceCount  int    `json:"source_count"`  // if known
		Notes        string `json:"notes,omitempty"`
	} `json:"import_plan"`
}

func RunPhase02(ctx context.Context, db *sql.DB, executionID string, request json.RawMessage) (*Phase02Plan, error) {
	// Deterministic planning: interpret request JSON and produce a normalized plan.
	var req map[string]interface{}
	if err := json.Unmarshal(request, &req); err != nil {
		return nil, fmt.Errorf("phase02: invalid request json: %w", err)
	}

	schemaVersion, _ := req["schema_version"].(string)
	kind, _ := req["kind"].(string)

	plan := &Phase02Plan{
		PlannedAt:     time.Now().UTC(),
		SchemaVersion: schemaVersion,
		Kind:          kind,
	}
	plan.ImportPlan.Mode = "zip_root"
	plan.ImportPlan.SourceCount = 0
	plan.ImportPlan.Notes = "Phase 02 planning only (no import execution)."

	return plan, nil
}
