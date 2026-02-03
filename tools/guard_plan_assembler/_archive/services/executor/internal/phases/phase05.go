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

type DocIndexEntry struct {
	Path        string            `json:"path"`
	Title       string            `json:"title,omitempty"`
	Headings    []string          `json:"headings,omitempty"`
	Frontmatter map[string]string `json:"frontmatter,omitempty"`
}

type Phase05Result struct {
	ParsedAtUTC  string          `json:"parsed_at_utc"`
	ZipRootPath  string          `json:"zip_root_path"`
	Docs         []DocIndexEntry `json:"docs"`
	DocCount     int             `json:"doc_count"`
}

func parseFrontmatter(lines []string) (map[string]string, int) {
	// very small YAML-ish frontmatter parser: key: value lines until closing ---
	if len(lines) < 3 || strings.TrimSpace(lines[0]) != "---" {
		return nil, 0
	}
	fm := map[string]string{}
	for i := 1; i < len(lines); i++ {
		ln := strings.TrimSpace(lines[i])
		if ln == "---" {
			return fm, i + 1
		}
		if ln == "" || strings.HasPrefix(ln, "#") {
			continue
		}
		parts := strings.SplitN(ln, ":", 2)
		if len(parts) != 2 {
			continue
		}
		k := strings.TrimSpace(parts[0])
		v := strings.TrimSpace(parts[1])
		if k != "" {
			fm[k] = v
		}
	}
	return fm, 0
}

func parseMarkdown(path string, content string) DocIndexEntry {
	lines := strings.Split(content, "\n")
	fm, start := parseFrontmatter(lines)
	if start == 0 {
		fm = nil
		start = 0
	}

	title := ""
	headings := []string{}
	for i := start; i < len(lines); i++ {
		ln := strings.TrimSpace(lines[i])
		if ln == "" {
			continue
		}
		if strings.HasPrefix(ln, "# ") && title == "" {
			title = strings.TrimSpace(strings.TrimPrefix(ln, "# "))
			continue
		}
		if strings.HasPrefix(ln, "## ") {
			headings = append(headings, strings.TrimSpace(strings.TrimPrefix(ln, "## ")))
			continue
		}
		if strings.HasPrefix(ln, "### ") {
			headings = append(headings, strings.TrimSpace(strings.TrimPrefix(ln, "### ")))
			continue
		}
	}

	return DocIndexEntry{
		Path:        filepath.ToSlash(path),
		Title:       title,
		Headings:    headings,
		Frontmatter: fm,
	}
}

func RunPhase05(_ context.Context, _ *sql.DB, _ string, _ json.RawMessage, phase03 json.RawMessage, _ json.RawMessage) (*Phase05Result, error) {
	var p3 struct {
		ZipRootPath   string   `json:"zip_root_path"`
		MarkdownFiles []string `json:"markdown_files"`
	}
	if err := json.Unmarshal(phase03, &p3); err != nil {
		return nil, fmt.Errorf("phase05: invalid phase03 context: %w", err)
	}
	if p3.ZipRootPath == "" {
		return nil, fmt.Errorf("phase05: zip_root_path missing")
	}

	docs := make([]DocIndexEntry, 0, len(p3.MarkdownFiles))
	for _, rel := range p3.MarkdownFiles {
		abs := filepath.Join(p3.ZipRootPath, filepath.FromSlash(rel))
		b, err := os.ReadFile(abs)
		if err != nil {
			return nil, fmt.Errorf("phase05: read %s: %w", rel, err)
		}
		docs = append(docs, parseMarkdown(rel, string(b)))
	}

	return &Phase05Result{
		ParsedAtUTC: time.Now().UTC().Format(time.RFC3339),
		ZipRootPath: p3.ZipRootPath,
		Docs:        docs,
		DocCount:    len(docs),
	}, nil
}
