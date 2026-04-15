-- Migration: Harness agent-making tables
-- Date: 2026-04-14
-- Purpose: Persist user-authored harness agent definitions + per-run sessions
--          produced by the 3-agent (Planner/Generator/Evaluator) pipeline.
--
-- IMPORTANT: these tables live alongside the existing ai_usage / projects /
-- agents domain and do NOT replace anything. The legacy /project/workspace
-- flow continues to use its in-memory Map + events route untouched.

-- ============================================================
-- 1. harness_agents — user-authored agent definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS harness_agents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',

  -- The full HarnessConfig envelope (model, tools, sandbox, session,
  -- orchestration) serialized as JSON. Shape is validated by lib/harness.
  config         JSONB NOT NULL,

  -- Denormalized fields for fast listing / filtering without parsing JSONB.
  model_id       TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  pipeline       TEXT NOT NULL DEFAULT 'three-agent'
                   CHECK (pipeline IN ('single-loop', 'three-agent')),
  tool_ids       TEXT[] NOT NULL DEFAULT '{}',
  mcp_server_ids TEXT[] NOT NULL DEFAULT '{}',

  is_archived    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_harness_agents_user_id
  ON harness_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_harness_agents_user_updated
  ON harness_agents(user_id, updated_at DESC);

-- ============================================================
-- 2. harness_sessions — one row per pipeline run
-- ============================================================

CREATE TABLE IF NOT EXISTS harness_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id       UUID REFERENCES harness_agents(id) ON DELETE SET NULL,

  prompt         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'running'
                   CHECK (status IN ('pending', 'running', 'completed', 'error', 'cancelled')),

  -- Appended event stream. The harness emits { type, timestamp, ... }
  -- structured events; the UI consumes them in order.
  events         JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Pipeline metadata (which child sessions, verdict, contract, etc.)
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_harness_sessions_user_id
  ON harness_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_harness_sessions_agent_id
  ON harness_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_harness_sessions_user_created
  ON harness_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_harness_sessions_status
  ON harness_sessions(status) WHERE status IN ('pending', 'running');

-- ============================================================
-- 3. harness_session_events — optional append-only event log
-- ============================================================
-- Used when we want to stream events row-by-row instead of rewriting
-- the whole JSONB array on every append. Phase 3 writes both locations
-- so the UI can tail via (seq > cursor) and the single-row read is also
-- cheap.

CREATE TABLE IF NOT EXISTS harness_session_events (
  id             BIGSERIAL PRIMARY KEY,
  session_id     UUID NOT NULL REFERENCES harness_sessions(id) ON DELETE CASCADE,
  seq            INTEGER NOT NULL,
  type           TEXT NOT NULL,
  payload        JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (session_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_harness_events_session_seq
  ON harness_session_events(session_id, seq);

-- ============================================================
-- 4. updated_at trigger
-- ============================================================
-- Reuse the pattern from earlier migrations. If the helper already
-- exists from 001_initial.sql it's idempotent.

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_harness_agents_updated_at ON harness_agents;
CREATE TRIGGER trg_harness_agents_updated_at
  BEFORE UPDATE ON harness_agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_harness_sessions_updated_at ON harness_sessions;
CREATE TRIGGER trg_harness_sessions_updated_at
  BEFORE UPDATE ON harness_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
