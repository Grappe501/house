package guards

import (
"context"
"database/sql"
"encoding/json"
"fmt"
)

type Phase04ManifestNonEmpty struct{}

func (g *Phase04ManifestNonEmpty) Name() string { return "phase04_manifest_non_empty" }

func (g *Phase04ManifestNonEmpty) Evaluate(_ context.Context, _ *sql.DB, _ string, _ int, _ json.RawMessage, output json.RawMessage) (*Result, error) {
var out struct {
EntryCount int `json:"entry_count"`
}
if err := json.Unmarshal(output, &out); err != nil {
d := fmt.Sprintf(`{"reason":"invalid_phase04_output","error":%q}`, err.Error())
return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(d)}, nil
}
if out.EntryCount <= 0 {
return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"entry_count_must_be_gt_zero"}`)}, nil
}
return &Result{GuardName: g.Name(), Status: StatusPass, Details: json.RawMessage(`{"ok":true}`)}, nil
}
