package phases

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Phase06Artifacts struct {
	EmittedAt   time.Time `json:"emitted_at"`
	BaseDir     string    `json:"base_dir"`
	ManifestURI string    `json:"manifest_uri"`
	DocsURI     string    `json:"docs_uri"`
	CleanedUp   bool      `json:"cleaned_up"`
	Notes       string    `json:"notes,omitempty"`
}

type ArtifactWriter struct {
	BaseDir string
}

func (w *ArtifactWriter) ensureDir(executionID string) (string, error) {
	dir := filepath.Join(w.BaseDir, executionID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

func (w *ArtifactWriter) WriteJSON(executionID string, name string, payload json.RawMessage) (string, error) {
	dir, err := w.ensureDir(executionID)
	if err != nil {
		return "", err
	}
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, payload, 0o644); err != nil {
		return "", err
	}
	return path, nil
}

// uploadsBaseDir returns where web uploads are stored.
// Keep consistent with the web app default: ${CONTACTOS_UPLOADS_DIR:-${CONTACTOS_ARTIFACTS_DIR:-artifacts}/_uploads}
func uploadsBaseDir() string {
	if v := os.Getenv("CONTACTOS_UPLOADS_DIR"); v != "" {
		return v
	}
	art := os.Getenv("CONTACTOS_ARTIFACTS_DIR")
	if art == "" {
		art = "artifacts"
	}
	return filepath.Join(art, "_uploads")
}

// safeRemoveUploadWorkspace deletes `${uploadsBaseDir()}/<upload_id>` only when it matches the expected structure.
func safeRemoveUploadWorkspace(uploadID string) bool {
	if uploadID == "" {
		return false
	}
	base := filepath.Clean(uploadsBaseDir())
	target := filepath.Clean(filepath.Join(base, uploadID))

	// Basic safety: require target to be a direct child of base.
	if !strings.HasPrefix(target, base+string(os.PathSeparator)) {
		return false
	}
	_ = os.RemoveAll(target)
	return true
}

func RunPhase06(ctx context.Context, db *sql.DB, executionID string, request json.RawMessage, phase04 json.RawMessage, phase05 json.RawMessage) (*Phase06Artifacts, error) {
	// Base dir configurable via env; default relative.
	base := os.Getenv("CONTACTOS_ARTIFACTS_DIR")
	if base == "" {
		base = "artifacts"
	}
	w := &ArtifactWriter{BaseDir: base}

	manifestPath, err := w.WriteJSON(executionID, "manifest.phase04.json", phase04)
	if err != nil {
		return nil, fmt.Errorf("phase06: write phase04 manifest: %w", err)
	}
	docsPath, err := w.WriteJSON(executionID, "docs.phase05.json", phase05)
	if err != nil {
		return nil, fmt.Errorf("phase06: write phase05 docs: %w", err)
	}

	  // Emit additional deployment-grade artifacts (local)
  // 1) execution_summary.json
  summary := map[string]any{
    "schema_version": "execution_summary_v1",
    "execution_id": executionID,
    "emitted_at_utc": time.Now().UTC().Format(time.RFC3339Nano),
    "manifest_uri": manifestPath,
    "docs_uri": docsPath,
  }
  sumBytes, _ := json.MarshalIndent(summary, "", "  ")
  _, _ = w.WriteJSON(executionID, "execution_summary.json", json.RawMessage(sumBytes))

  // 2) phase_runs.json (snapshot)
  type phaseRunRow struct {
    Phase     int        `json:"phase"`
    Status    string     `json:"status"`
    StartedAt *time.Time `json:"started_at"`
    EndedAt   *time.Time `json:"ended_at"`
    Error     string     `json:"error,omitempty"`
  }
  prRows := []phaseRunRow{}
  rows, qerr := db.QueryContext(ctx, `SELECT phase, status, started_at, ended_at, error FROM phase_runs WHERE execution_id=$1 ORDER BY phase ASC`, executionID)
  if qerr == nil {
    defer rows.Close()
    for rows.Next() {
      var r phaseRunRow
      _ = rows.Scan(&r.Phase, &r.Status, &r.StartedAt, &r.EndedAt, &r.Error)
      prRows = append(prRows, r)
    }
    prBytes, _ := json.MarshalIndent(map[string]any{
      "schema_version": "phase_runs_snapshot_v1",
      "execution_id": executionID,
      "rows": prRows,
    }, "", "  ")
    _, _ = w.WriteJSON(executionID, "phase_runs.json", json.RawMessage(prBytes))
  }

  // 3) guard_results.json (snapshot)
  rows2, qerr2 := db.QueryContext(ctx, `SELECT phase, guard, status, message, details, created_at FROM guard_results WHERE execution_id=$1 ORDER BY created_at ASC`, executionID)
  if qerr2 == nil {
    defer rows2.Close()
    type guardRow struct {
      Phase     int       `json:"phase"`
      Guard     string    `json:"guard"`
      Status    string    `json:"status"`
      Message   string    `json:"message"`
      Details   any       `json:"details"`
      CreatedAt time.Time `json:"created_at"`
    }
    gs := []guardRow{}
    for rows2.Next() {
      var g guardRow
      var detailsBytes []byte
      _ = rows2.Scan(&g.Phase, &g.Guard, &g.Status, &g.Message, &detailsBytes, &g.CreatedAt)
      if len(detailsBytes) > 0 {
        var v any
        _ = json.Unmarshal(detailsBytes, &v)
        g.Details = v
      }
      gs = append(gs, g)
    }
    gb, _ := json.MarshalIndent(map[string]any{
      "schema_version": "guard_results_snapshot_v1",
      "execution_id": executionID,
      "rows": gs,
    }, "", "  ")
    _, _ = w.WriteJSON(executionID, "guard_results.json", json.RawMessage(gb))
  }
out := &Phase06Artifacts{
		EmittedAt:   time.Now().UTC(),
		BaseDir:     base,
		ManifestURI: manifestPath,
		DocsURI:     docsPath,
		CleanedUp:   false,
		Notes:       "Wrote local JSON artifacts and recorded artifact rows.",
	}

	// Optional cleanup of uploaded zip workspace after successful emission.
	// Enable with CONTACTOS_UPLOAD_RETENTION=cleanup_on_success
	if os.Getenv("CONTACTOS_UPLOAD_RETENTION") == "cleanup_on_success" {
		var req struct {
			Meta map[string]any `json:"meta"`
		}
		if err := json.Unmarshal(request, &req); err == nil && req.Meta != nil {
			if v, ok := req.Meta["upload_id"].(string); ok {
				if safeRemoveUploadWorkspace(v) {
					out.CleanedUp = true
					out.Notes = out.Notes + " Upload workspace cleaned."
				}
			}
		}
	}
	return out, nil
}


