package guards

import "encoding/json"

type Status string

const (
	StatusPass Status = "pass"
	StatusWarn Status = "warn"
	StatusFail Status = "fail"
)

type Result struct {
	GuardName string          `json:"guard_name"`
	Status    Status          `json:"status"`
	Details   json.RawMessage `json:"details,omitempty"`
}
