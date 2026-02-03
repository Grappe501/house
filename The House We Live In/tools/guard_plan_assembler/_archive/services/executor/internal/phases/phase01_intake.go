package phases

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Phase01Intake struct{}

func (Phase01Intake) Number() int  { return 1 }
func (Phase01Intake) Name() string { return "phase01_intake_validate" }

func (Phase01Intake) Run(ctx context.Context, deps any, input PhaseInput) (map[string]any, error) {
	_ = deps.(*pgxpool.Pool) // reserved for later, keeps signature stable

	// Deterministic, side-effect-free intake validation.
	if input.Request == nil || len(input.Request) == 0 {
		return nil, errors.New("phase01: execution request is empty")
	}

	// Example: ensure request carries a stable "kind" (optional in v0, but recommended).
	// We don't hard-fail on missing kind yet; we record a warning flag for the UI.
	kind, _ := input.Request["kind"].(string)
	warnMissingKind := false
	if kind == "" {
		warnMissingKind = true
		kind = "unspecified"
	}

	// Reserved: validate schema version if provided.
	schemaVersion, _ := input.Request["schema_version"].(string)
	if schemaVersion != "" && schemaVersion != "v0" && schemaVersion != "v1" {
		return nil, fmt.Errorf("phase01: unsupported schema_version %q", schemaVersion)
	}

	return map[string]any{
		"phase01": map[string]any{
			"ok":                true,
			"kind":              kind,
			"warn_missing_kind": warnMissingKind,
			"validated": map[string]any{
				"has_request": true,
			},
		},
	}, nil
}
