package guards

import (
"context"
"database/sql"
"encoding/json"
"fmt"
"os"
)

type Phase03ZipRootPathExists struct{}

func (g *Phase03ZipRootPathExists) Name() string { return "phase03_zip_root_path_exists" }

func (g *Phase03ZipRootPathExists) Evaluate(_ context.Context, _ *sql.DB, _ string, _ int, _ json.RawMessage, output json.RawMessage) (*Result, error) {
var out struct {
ZipRootPath string `json:"zip_root_path"`
}
if err := json.Unmarshal(output, &out); err != nil {
d := fmt.Sprintf(`{"reason":"invalid_phase03_output","error":%q}`, err.Error())
return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(d)}, nil
}
if out.ZipRootPath == "" {
return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"zip_root_path_missing"}`)}, nil
}

st, err := os.Stat(out.ZipRootPath)
if err != nil {
d := fmt.Sprintf(`{"reason":"zip_root_path_not_accessible","error":%q}`, err.Error())
return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(d)}, nil
}
if !st.IsDir() {
return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"zip_root_path_not_directory"}`)}, nil
}

return &Result{GuardName: g.Name(), Status: StatusPass, Details: json.RawMessage(`{"ok":true}`)}, nil
}
