package phases

import (
	"context"
	"os"

	"github.com/contactos/executor/internal/store"
)

// newArtifactStore creates the artifact store based on env.
// Defaults to local filesystem under CONTACTOS_ARTIFACTS_DIR (or "artifacts").
func newArtifactStore() (store.ArtifactStore, error) {
	cfg, err := store.FromEnv()
	if err != nil {
		return nil, err
	}

	// Ensure local store still respects CONTACTOS_ARTIFACTS_DIR for compatibility with web downloader.
	if cfg.Kind == store.KindLocal {
		if cfg.BaseDir == "" {
			cfg.BaseDir = os.Getenv("CONTACTOS_ARTIFACTS_DIR")
		}
		if cfg.BaseDir == "" {
			cfg.BaseDir = "artifacts"
		}
	}

	return store.New(cfg)
}

func putArtifactBytes(ctx context.Context, st store.ArtifactStore, executionID, rel string, b []byte) (store.PutResult, error) {
	return st.PutBytes(ctx, executionID, rel, b)
}
