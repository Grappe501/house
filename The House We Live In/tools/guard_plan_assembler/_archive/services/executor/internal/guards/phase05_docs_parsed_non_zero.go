package guards

import (
"context"
"database/sql"
"encoding/json"
"fmt"
)

type Phase05DocsParsedNonZero struct{}

func (g *Phase05DocsParsedNonZero) Name() string { return "phase05_docs_parsed_non_zero" }

func (g *Phase05DocsParsedNonZero) Evaluate(_ context.Context, _ *sql.DB, _ string, _ int, _ json.RawMessage, output json.RawMessage) (*Result, error) {
var out struct {
DocCount int `json:"doc_count"`
}
if err := json.Unmarshal(output, &out); err != nil {
d := fmt.Sprintf(`{"reason":"invalid_phase05_output","error":%q}`, err.Error())
return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(d)}, nil
}
if out.DocCount <= 0 {
return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"doc_count_must_be_gt_zero"}`)}, nil
}
return &Result{GuardName: g.Name(), Status: StatusPass, Details: json.RawMessage(`{"ok":true}`)}, nil
}
