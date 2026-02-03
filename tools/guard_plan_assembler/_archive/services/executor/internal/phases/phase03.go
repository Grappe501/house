package phases

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Phase03Result struct {
	ScannedAtUTC   string   `json:"scanned_at_utc"`
	ZipRootPath    string   `json:"zip_root_path"`
	MarkdownFiles  []string `json:"markdown_files"`
	MarkdownCount  int      `json:"markdown_count"`
	Notes          string   `json:"notes,omitempty"`
}

func RunPhase03(_ context.Context, _ *sql.DB, _ string, request json.RawMessage) (*Phase03Result, error) {
	// Extract meta.zip_root_path
	var req struct {
		Meta map[string]any `json:"meta"`
	}
	if err := json.Unmarshal(request, &req); err != nil {
		return nil, fmt.Errorf("phase03: invalid request json: %w", err)
	}
	zipRoot, _ := req.Meta["zip_root_path"].(string)
	zipRoot = strings.TrimSpace(zipRoot)
	if zipRoot == "" {
		return nil, fmt.Errorf("phase03: meta.zip_root_path is required")
	}

	st, err := os.Stat(zipRoot)
	if err != nil {
		return nil, fmt.Errorf("phase03: zip_root_path not accessible: %w", err)
	}
	if !st.IsDir() {
		return nil, fmt.Errorf("phase03: zip_root_path is not a directory")
	}

	var md []string
	walkErr := filepath.WalkDir(zipRoot, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		name := d.Name()
		if d.IsDir() {
			// Skip common junk dirs
			switch name {
			case ".git", "node_modules", "build", ".next", ".plan_guard":
				return filepath.SkipDir
			}
			return nil
		}
		if strings.HasSuffix(strings.ToLower(name), ".md") {
			rel, _ := filepath.Rel(zipRoot, p)
			md = append(md, filepath.ToSlash(rel))
			// safety limit
			if len(md) > 20000 {
				return fmt.Errorf("phase03: too many markdown files (>20000)")
			}
		}
		return nil
	})
	if walkErr != nil {
		return nil, fmt.Errorf("phase03: walk failed: %w", walkErr)
	}

	return &Phase03Result{
		ScannedAtUTC:  time.Now().UTC().Format(time.RFC3339),
		ZipRootPath:   zipRoot,
		MarkdownFiles: md,
		MarkdownCount: len(md),
		Notes:         "Enumerated markdown files under zip_root_path.",
	}, nil
}
