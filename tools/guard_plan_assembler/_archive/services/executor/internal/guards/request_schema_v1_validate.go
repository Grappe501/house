package guards

import (
	"context"
	"database/sql"
	"encoding/json"
)

type RequestSchemaV1Validate struct{}

func (g *RequestSchemaV1Validate) Name() string { return "request_schema_v1_validate" }

func (g *RequestSchemaV1Validate) Evaluate(ctx context.Context, db *sql.DB, executionID string, phase int, input json.RawMessage, output json.RawMessage) (*Result, error) {
	var req struct {
		SchemaVersion string `json:"schema_version"`
		Kind          string `json:"kind"`
	}
	if err := json.Unmarshal(input, &req); err != nil {
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"invalid_json"}`)}, nil
	}
	if req.SchemaVersion != "v1" {
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"unsupported_schema_version"}`)}, nil
	}
	if req.Kind == "" {
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"missing_kind"}`)}, nil
	}
	return &Result{GuardName: g.Name(), Status: StatusPass, Details: json.RawMessage(`{"schema":"v1"}`)}, nil
}
