package guards

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type Phase01OutputStatusOK struct{}

func (g *Phase01OutputStatusOK) Name() string { return "phase01_output_status_ok" }

func (g *Phase01OutputStatusOK) Evaluate(ctx context.Context, db *sql.DB, executionID string, phase int, input json.RawMessage, output json.RawMessage) (*Result, error) {
	// Phase01 output should be a JSON object with {"status":"ok", ...}
	if len(output) == 0 {
		return &Result{
			GuardName: g.Name(),
			Status:    StatusFail,
			Details:   json.RawMessage(`{"reason":"missing_output"}`),
		}, nil
	}

	var payload struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(output, &payload); err != nil {
		d := fmt.Sprintf(`{"reason":"invalid_json","error":%q}`, err.Error())
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(d)}, nil
	}
	if payload.Status != "ok" {
		d := fmt.Sprintf(`{"reason":"unexpected_status","status":%q}`, payload.Status)
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(d)}, nil
	}

	return &Result{
		GuardName: g.Name(),
		Status:    StatusPass,
		Details:   json.RawMessage(`{"checked":"status"}`),
	}, nil
}
