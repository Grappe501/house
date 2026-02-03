package guards

import (
	"context"
	"database/sql"
	"encoding/json"
)

type RequestKindRequired struct{}

func (g *RequestKindRequired) Name() string { return "request_kind_required" }

func (g *RequestKindRequired) Evaluate(ctx context.Context, db *sql.DB, executionID string, phase int, input json.RawMessage, output json.RawMessage) (*Result, error) {
	var req map[string]interface{}
	if err := json.Unmarshal(input, &req); err != nil {
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"invalid_request_json"}`)}, nil
	}

	v, ok := req["kind"].(string)
	if !ok || v == "" {
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"missing_kind"}`)}, nil
	}

	return &Result{GuardName: g.Name(), Status: StatusPass, Details: json.RawMessage(`{"kind":"` + v + `"}`)}, nil
}
