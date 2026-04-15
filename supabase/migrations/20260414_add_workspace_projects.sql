-- Migration: Workspace project + chat message persistence
-- Date: 2026-04-14
-- Purpose: Persist the user's /project/workspace chat history so clicking
--          a recent project in the sidebar restores the full conversation.
--
-- Notes:
-- - This is NEW — separate from the existing Figma-based `projects` table
--   (which requires a figma_file_key and is not suitable for AI-generated
--   web app projects).
-- - Messages live in their own table so we can append without rewriting
--   a giant JSONB blob on every save.

-- ============================================================
-- 1. workspace_projects — one row per user "project" in /project/workspace
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Human title. Defaults to the first user prompt (trimmed) or "Untitled
  -- project" when no prompt has been sent yet.
  name           TEXT NOT NULL DEFAULT 'Untitled project',

  -- First user prompt verbatim — useful for showing a preview in the sidebar.
  first_prompt   TEXT,

  -- Optional hint fields mirroring what the workspace already tracks in
  -- local state so restoration is seamless.
  category       TEXT,
  framework      TEXT,

  -- Last dev server URL (E2B sandbox public host). Null until the agent
  -- starts a dev server.
  last_preview_url TEXT,

  is_archived    BOOLEAN NOT NULL DEFAULT FALSE,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- The time of the most recent user interaction — used for "last opened"
  -- sorting in the sidebar. Kept separate from updated_at which changes
  -- on any write (including auto-save).
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_projects_user_id
  ON workspace_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_projects_user_recent
  ON workspace_projects(user_id, last_opened_at DESC)
  WHERE is_archived = FALSE;

-- ============================================================
-- 2. workspace_messages — chat messages per project
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES workspace_projects(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  role           TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content        TEXT NOT NULL,

  -- Client-generated stable id so the UI can dedupe after re-saves.
  client_id      TEXT NOT NULL,

  -- Wall-clock ms timestamp the client recorded when the message was
  -- composed. Kept alongside created_at so ordering survives clock skew.
  client_ts      BIGINT NOT NULL,

  -- Optional duration (ms) for assistant replies — how long the agent took.
  duration_ms    INTEGER,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (project_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_messages_project
  ON workspace_messages(project_id, client_ts ASC);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_user
  ON workspace_messages(user_id);

-- ============================================================
-- 3. updated_at trigger (reuses helper from earlier migrations)
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workspace_projects_updated_at ON workspace_projects;
CREATE TRIGGER trg_workspace_projects_updated_at
  BEFORE UPDATE ON workspace_projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
