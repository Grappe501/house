package retention

import (
	"os"
	"strconv"
	"time"
)

type Policy struct {
	MaxAge time.Duration
}

func FromEnv() Policy {
	// Default: keep 30 days
	days := 30
	if v := os.Getenv("CONTACTOS_RETENTION_DAYS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			days = n
		}
	}
	return Policy{MaxAge: time.Duration(days) * 24 * time.Hour}
}
