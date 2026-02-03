package guards

import (
	"context"
	"database/sql"
	"encoding/json"
)

type RequestSchemaVersionRequired struct{}

func (g *RequestSchemaVersionRequired) Name() string { return "request_schema_version_required" }

func (g *RequestSchemaVersionRequired) Evaluate(ctx context.Context, db *sql.DB, executionID string, phase int, input json.RawMessage, output json.RawMessage) (*Result, error) {
	var req map[string]interface{}
	if err := json.Unmarshal(input, &req); err != nil {
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"invalid_request_json"}`)}, nil
	}

	v, ok := req["schema_version"].(string)
	if !ok || v == "" {
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"missing_schema_version"}`)}, nil
	}

	return &Result{GuardName: g.Name(), Status: StatusPass, Details: json.RawMessage(`{"schema_version":"` + v + `"}`)}, nil
}
