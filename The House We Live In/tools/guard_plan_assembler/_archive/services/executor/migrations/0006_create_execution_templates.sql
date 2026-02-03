-- Execution templates (admin presets)
CREATE TABLE IF NOT EXISTS execution_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  request JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_templates_created_at ON execution_templates(created_at DESC);
