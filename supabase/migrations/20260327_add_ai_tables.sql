-- Migration: Add ai_usage and training_data tables
-- Date: 2026-03-27
-- Purpose: Track per-user AI token usage and collect fine-tuning data

-- ============================================================
-- 1. ai_usage - per-user AI token usage tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model       TEXT NOT NULL,               -- e.g. "claude-sonnet-4", "qwen3-coder"
  provider    TEXT NOT NULL,               -- "anthropic", "qwen", "openai"
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd    NUMERIC(10, 6) NOT NULL DEFAULT 0, -- estimated cost (6 decimal precision)
  endpoint    TEXT NOT NULL,               -- "edit-code", "chat", "design-system"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at);
CREATE INDEX idx_ai_usage_user_date ON ai_usage(user_id, created_at DESC);

-- ============================================================
-- 2. training_data - fine-tuning data collection
-- ============================================================

CREATE TABLE IF NOT EXISTS training_data (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instruction     TEXT NOT NULL,            -- user command
  input_context   TEXT NOT NULL,            -- file code + element history + design system md
  output          TEXT NOT NULL,            -- AI response (JSON or text)
  model_used      TEXT NOT NULL,            -- which model generated this
  rating          SMALLINT CHECK (rating >= 1 AND rating <= 5), -- user feedback 1-5, null if none
  element_history TEXT,                     -- JSON array of selected elements
  design_system_md TEXT,                    -- DESIGN.md content used
  framework       TEXT,                     -- e.g. "react", "vue", "angular"
  file_path       TEXT,                     -- target file path
  tags            TEXT[],                   -- e.g. {"code-edit", "tailwind", "react"}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_training_data_user_id ON training_data(user_id);
CREATE INDEX idx_training_data_created_at ON training_data(created_at);
CREATE INDEX idx_training_data_rating ON training_data(rating) WHERE rating IS NOT NULL;
CREATE INDEX idx_training_data_tags ON training_data USING GIN(tags) WHERE tags IS NOT NULL;

-- ============================================================
-- 3. daily_ai_usage view - aggregated daily usage for rate limiting
-- ============================================================

CREATE OR REPLACE VIEW daily_ai_usage AS
SELECT
  user_id,
  DATE(created_at AT TIME ZONE 'UTC') AS usage_date,
  SUM(input_tokens)::INTEGER  AS total_input_tokens,
  SUM(output_tokens)::INTEGER AS total_output_tokens,
  SUM(cost_usd)::NUMERIC(10,6) AS total_cost_usd,
  COUNT(*)::INTEGER AS request_count
FROM ai_usage
GROUP BY user_id, DATE(created_at AT TIME ZONE 'UTC');

-- ============================================================
-- 4. get_daily_usage function - for rate limiting queries
-- ============================================================

CREATE OR REPLACE FUNCTION get_daily_usage(p_user_id UUID, p_date DATE)
RETURNS TABLE (
  total_input_tokens  INTEGER,
  total_output_tokens INTEGER,
  total_cost_usd      NUMERIC(10,6),
  request_count       INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(SUM(input_tokens), 0)::INTEGER,
    COALESCE(SUM(output_tokens), 0)::INTEGER,
    COALESCE(SUM(cost_usd), 0)::NUMERIC(10,6),
    COUNT(*)::INTEGER
  FROM ai_usage
  WHERE user_id = p_user_id
    AND DATE(created_at AT TIME ZONE 'UTC') = p_date;
$$;

-- ============================================================
-- 5. Row Level Security (RLS)
-- ============================================================

-- ai_usage RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own ai_usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai_usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- training_data RLS
ALTER TABLE training_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own training_data"
  ON training_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training_data"
  ON training_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training_data"
  ON training_data FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
