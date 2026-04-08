-- Add OAuth token columns for MCP service integrations
-- Vercel, Linear, Notion, Slack, Sentry, Gmail, Canva

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS vercel_access_token TEXT,
  ADD COLUMN IF NOT EXISTS linear_access_token TEXT,
  ADD COLUMN IF NOT EXISTS notion_access_token TEXT,
  ADD COLUMN IF NOT EXISTS slack_access_token TEXT,
  ADD COLUMN IF NOT EXISTS sentry_access_token TEXT,
  ADD COLUMN IF NOT EXISTS sentry_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
  ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS canva_access_token TEXT,
  ADD COLUMN IF NOT EXISTS canva_refresh_token TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.vercel_access_token IS 'Vercel OAuth access token';
COMMENT ON COLUMN users.linear_access_token IS 'Linear OAuth access token';
COMMENT ON COLUMN users.notion_access_token IS 'Notion OAuth access token';
COMMENT ON COLUMN users.slack_access_token IS 'Slack OAuth bot/user access token';
COMMENT ON COLUMN users.sentry_access_token IS 'Sentry OAuth access token';
COMMENT ON COLUMN users.sentry_refresh_token IS 'Sentry OAuth refresh token';
COMMENT ON COLUMN users.gmail_access_token IS 'Google/Gmail OAuth access token';
COMMENT ON COLUMN users.gmail_refresh_token IS 'Google/Gmail OAuth refresh token';
COMMENT ON COLUMN users.canva_access_token IS 'Canva OAuth access token';
COMMENT ON COLUMN users.canva_refresh_token IS 'Canva OAuth refresh token';
