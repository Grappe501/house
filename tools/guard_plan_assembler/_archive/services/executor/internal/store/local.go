package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

type LocalStore struct {
	BaseDir string
}

func NewLocalStore(baseDir string) *LocalStore {
	return &LocalStore{BaseDir: baseDir}
}

func (s *LocalStore) ensureDir(executionID string) (string, error) {
	root := filepath.Join(s.BaseDir, executionID)
	if err := os.MkdirAll(root, 0o755); err != nil {
		return "", err
	}
	return root, nil
}

func (s *LocalStore) PutBytes(ctx context.Context, executionID, relativePath string, b []byte) (PutResult, error) {
	_ = ctx
	root, err := s.ensureDir(executionID)
	if err != nil {
		return PutResult{}, err
	}
	dst := filepath.Join(root, filepath.FromSlash(relativePath))
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return PutResult{}, err
	}

	sum := sha256.Sum256(b)
	if err := os.WriteFile(dst, b, 0o644); err != nil {
		return PutResult{}, err
	}

	abs, _ := filepath.Abs(dst)
	return PutResult{
		URI:    abs,
		Bytes:  int64(len(b)),
		SHA256: hex.EncodeToString(sum[:]),
	}, nil
}

func (s *LocalStore) PutFile(ctx context.Context, executionID, relativePath, srcPath string) (PutResult, error) {
	_ = ctx
	root, err := s.ensureDir(executionID)
	if err != nil {
		return PutResult{}, err
	}
	dst := filepath.Join(root, filepath.FromSlash(relativePath))
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return PutResult{}, err
	}

	in, err := os.Open(srcPath)
	if err != nil {
		return PutResult{}, err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return PutResult{}, err
	}
	defer func() { _ = out.Close() }()

	h := sha256.New()
	mw := io.MultiWriter(out, h)

	if _, err := io.Copy(mw, in); err != nil {
		return PutResult{}, err
	}

	if err := out.Sync(); err != nil {
		return PutResult{}, err
	}

	abs, _ := filepath.Abs(dst)
	return PutResult{
		URI:    abs,
		Bytes:  fileSize(dst),
		SHA256: hex.EncodeToString(h.Sum(nil)),
	}, nil
}

func fileSize(p string) int64 {
	st, err := os.Stat(p)
	if err != nil {
		return 0
	}
	return st.Size()
}

func (s *LocalStore) String() string {
	return fmt.Sprintf("LocalStore(%s)", s.BaseDir)
}
