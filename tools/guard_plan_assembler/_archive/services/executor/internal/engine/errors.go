package engine

import "errors"

// ErrCancelled indicates the execution was cancelled (context cancellation, shutdown, etc).
var ErrCancelled = errors.New("cancelled")
