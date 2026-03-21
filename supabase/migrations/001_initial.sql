-- Users (GitHub OAuth 기반)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id BIGINT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  figma_access_token TEXT,
  figma_refresh_token TEXT,
  github_access_token TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (Figma 파일 + GitHub 레포 연결)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  figma_file_key TEXT NOT NULL,
  figma_file_name TEXT,
  github_owner TEXT,
  github_repo TEXT,
  github_branch TEXT DEFAULT 'main',
  github_base_path TEXT DEFAULT '',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Node-to-Code Mappings (캐시)
CREATE TABLE mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  figma_node_id TEXT NOT NULL,
  figma_node_name TEXT,
  code_file_path TEXT NOT NULL,
  match_method TEXT CHECK (match_method IN ('naming', 'ai', 'manual')),
  confidence REAL DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, figma_node_id)
);

-- Edit History (undo/redo, 감사 로그)
CREATE TABLE edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  figma_node_id TEXT,
  figma_node_name TEXT,
  file_path TEXT NOT NULL,
  original_content TEXT,
  modified_content TEXT,
  user_command TEXT,
  ai_explanation TEXT,
  commit_sha TEXT,
  status TEXT DEFAULT 'applied' CHECK (status IN ('preview', 'applied', 'pushed', 'reverted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_mappings_project ON mappings(project_id);
CREATE INDEX idx_mappings_node ON mappings(project_id, figma_node_id);
CREATE INDEX idx_history_project ON edit_history(project_id);
