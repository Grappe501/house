package engine

import "os"

// Drain mode prevents workers from claiming new executions.
func DrainEnabled() bool {
	return os.Getenv("CONTACTOS_DRAIN_MODE") == "true"
}
