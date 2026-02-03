package store

import (
	"fmt"
	"os"
)

type Kind string

const (
	KindLocal Kind = "local"
	KindS3    Kind = "s3"
)

type Config struct {
	Kind    Kind
	BaseDir string // local
}

func FromEnv() (Config, error) {
	kind := Kind(os.Getenv("CONTACTOS_ARTIFACT_STORE"))
	if kind == "" {
		kind = KindLocal
	}
	base := os.Getenv("CONTACTOS_ARTIFACTS_DIR")
	if base == "" {
		base = "artifacts"
	}
	return Config{Kind: kind, BaseDir: base}, nil
}

func New(cfg Config) (ArtifactStore, error) {
	switch cfg.Kind {
	case KindLocal:
		return NewLocalStore(cfg.BaseDir), nil
	case KindS3:
		return NewS3FromEnv()
	default:
		return nil, fmt.Errorf("unknown artifact store kind %q", string(cfg.Kind))
	}
}
