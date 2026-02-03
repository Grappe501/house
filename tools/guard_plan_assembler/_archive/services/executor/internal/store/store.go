package store

import "context"

type PutResult struct {
	URI    string
	Bytes  int64
	SHA256 string
}

// ArtifactStore is an abstraction for writing build artifacts.
// Today it supports local filesystem paths; future stores can provide remote URIs.
type ArtifactStore interface {
	PutBytes(ctx context.Context, executionID, relativePath string, b []byte) (PutResult, error)
	PutFile(ctx context.Context, executionID, relativePath, srcPath string) (PutResult, error)
}
