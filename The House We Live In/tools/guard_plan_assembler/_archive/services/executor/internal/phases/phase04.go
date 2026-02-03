package phases

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

type ManifestEntry struct {
	Path        string `json:"path"`
	Sha256      string `json:"sha256"`
	Bytes       int64  `json:"bytes"`
	ModifiedUTC string `json:"modified_utc"`
}

type Phase04Result struct {
	GeneratedAtUTC string          `json:"generated_at_utc"`
	ZipRootPath    string          `json:"zip_root_path"`
	Entries        []ManifestEntry `json:"entries"`
	EntryCount     int             `json:"entry_count"`
}

func sha256File(p string) (string, int64, string, error) {
	f, err := os.Open(p)
	if err != nil {
		return "", 0, "", err
	}
	defer f.Close()

	h := sha256.New()
	buf := make([]byte, 1024*64)
	var n int64

	for {
		k, rerr := f.Read(buf)
		if k > 0 {
			n += int64(k)
			_, _ = h.Write(buf[:k])
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			return "", 0, "", rerr
		}
	}

	st, err := os.Stat(p)
	if err != nil {
		return "", 0, "", err
	}
	return hex.EncodeToString(h.Sum(nil)), n, st.ModTime().UTC().Format(time.RFC3339), nil
}

func RunPhase04(_ context.Context, _ *sql.DB, _ string, request json.RawMessage, phase03 json.RawMessage) (*Phase04Result, error) {
	var p3 struct {
		ZipRootPath   string   `json:"zip_root_path"`
		MarkdownFiles []string `json:"markdown_files"`
	}
	if err := json.Unmarshal(phase03, &p3); err != nil {
		return nil, fmt.Errorf("phase04: invalid phase03 context: %w", err)
	}

	if p3.ZipRootPath == "" {
		// fallback: parse from request
		var req struct{ Meta map[string]any `json:"meta"` }
		_ = json.Unmarshal(request, &req)
		if v, ok := req.Meta["zip_root_path"].(string); ok {
			p3.ZipRootPath = v
		}
	}
	if p3.ZipRootPath == "" {
		return nil, fmt.Errorf("phase04: zip_root_path missing")
	}

	entries := make([]ManifestEntry, 0, len(p3.MarkdownFiles))
	for _, rel := range p3.MarkdownFiles {
		abs := filepath.Join(p3.ZipRootPath, filepath.FromSlash(rel))
		sum, bytes, mod, err := sha256File(abs)
		if err != nil {
			return nil, fmt.Errorf("phase04: hash %s: %w", rel, err)
		}
		entries = append(entries, ManifestEntry{
			Path:        rel,
			Sha256:      sum,
			Bytes:       bytes,
			ModifiedUTC: mod,
		})
	}

	return &Phase04Result{
		GeneratedAtUTC: time.Now().UTC().Format(time.RFC3339),
		ZipRootPath:    p3.ZipRootPath,
		Entries:        entries,
		EntryCount:     len(entries),
	}, nil
}
