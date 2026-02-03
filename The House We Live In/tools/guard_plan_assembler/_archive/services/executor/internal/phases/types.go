package phases

import "context"

type Phase interface {
	Number() int
	Name() string
	Run(ctx context.Context, deps any, input PhaseInput) (map[string]any, error)
}

type PhaseInput struct {
	ExecutionID string         `json:"execution_id"`
	Request     map[string]any `json:"request"`
	Context     map[string]any `json:"context"`
}
