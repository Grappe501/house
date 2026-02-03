package guards

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

const DefaultMaxRequestBytes = 262144 // 256 KiB

type RequestSizeLimit struct {
	MaxBytes int
}

func (g *RequestSizeLimit) Name() string { return "request_size_limit" }

func (g *RequestSizeLimit) Evaluate(ctx context.Context, db *sql.DB, executionID string, phase int, input json.RawMessage, output json.RawMessage) (*Result, error) {
	max := g.MaxBytes
	if max <= 0 {
		max = DefaultMaxRequestBytes
	}

	n := len(input)
	if n > max {
		d := fmt.Sprintf(`{"reason":"too_large","bytes":%d,"max_bytes":%d}`, n, max)
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(d)}, nil
	}
	d := fmt.Sprintf(`{"bytes":%d,"max_bytes":%d}`, n, max)
	return &Result{GuardName: g.Name(), Status: StatusPass, Details: json.RawMessage(d)}, nil
}
