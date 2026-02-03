package guards

import (
	"context"
	"database/sql"
	"encoding/json"
)

type Phase06ArtifactsWritten struct{}

func (g *Phase06ArtifactsWritten) Name() string { return "phase06_artifacts_written" }

func (g *Phase06ArtifactsWritten) Evaluate(ctx context.Context, db *sql.DB, executionID string, phase int, input json.RawMessage, output json.RawMessage) (*Result, error) {
	var p6 struct {
		ManifestURI string `json:"manifest_uri"`
		DocsURI     string `json:"docs_uri"`
	}
	if err := json.Unmarshal(output, &p6); err != nil {
		return &Result{GuardName: g.Name(), Status: StatusFail, Details: json.RawMessage(`{"reason":"invalid_phase06_output"}`)}, nil
	}
	if p6.ManifestURI == "" || p6.DocsURI == "" {
		return &Result{GuardName: g.Name(), Status: StatusWarn, Details: json.RawMessage(`{"reason":"missing_artifact_uri"}`)}, nil
	}
	return &Result{GuardName: g.Name(), Status: StatusPass, Details: json.RawMessage(`{"ok":true}`)}, nil
}
