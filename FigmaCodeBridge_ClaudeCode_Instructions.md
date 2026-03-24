# FigmaCodeBridge — Claude Code 프로젝트 명세서

## 프로젝트를 이 명세서대로 처음부터 세팅하고 구축해줘.

---

## 1. 프로젝트 개요

**FigmaCodeBridge**는 Figma 디자인과 AI 코드 수정을 하나의 웹 인터페이스에서 통합하는 플랫폼이다.

**핵심 유저 플로우:**
1. 유저가 Figma 파일 URL을 붙여넣는다
2. 플랫폼이 Figma REST API로 노드 트리 + 프레임 이미지를 로드한다
3. 플랫폼 내 비주얼 뷰어에서 유저가 엘리먼트를 클릭하여 선택한다
4. 하단 채팅창에 명령을 입력한다 (예: "색상 빨간색으로 바꿔")
5. 매핑 엔진이 Figma 노드 → 코드 파일을 자동 매칭한다
6. Claude API가 코드 diff를 생성한다
7. 유저가 diff를 미리보기하고 "적용"을 클릭한다
8. GitHub API로 원클릭 커밋 + 푸시한다

**핵심 원칙:**
- Figma Plugin 없음. REST API만 사용.
- WebSocket 서버 없음. Vercel 단일 배포.
- 온보딩 30초: URL 붙여넣기 → 바로 사용

---

## 2. 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| Framework | Next.js (App Router) | 15 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS + shadcn/ui | 4.x + latest |
| State | Zustand + @tanstack/react-query | latest |
| API Layer | tRPC | v11 |
| Database | Supabase (Postgres + Auth) | latest |
| AI | Anthropic Messages API | claude-sonnet-4-6 |
| Git | GitHub REST API (Octokit) | latest |
| Design API | Figma REST API | v1 |
| Payments | Lemon Squeezy (Phase 4) | - |
| Deploy | Vercel | - |
| Package Manager | pnpm | latest |
| Monorepo | Turborepo | latest |

---

## 3. 프로젝트 구조

```
figma-code-bridge/
├── apps/
│   └── web/                          # Next.js 웹앱 (메인 플랫폼)
│       ├── app/
│       │   ├── layout.tsx            # Root layout (providers 감싸기)
│       │   ├── page.tsx              # Landing → 로그인 or 대시보드 리다이렉트
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx    # GitHub OAuth + Figma OAuth 로그인
│       │   │   └── callback/
│       │   │       ├── github/page.tsx
│       │   │       └── figma/page.tsx
│       │   ├── dashboard/
│       │   │   └── page.tsx          # 프로젝트 목록, 새 프로젝트 생성
│       │   ├── project/[id]/
│       │   │   └── page.tsx          # ★ 메인 워크스페이스 (아래 상세)
│       │   └── api/
│       │       └── trpc/[trpc]/route.ts
│       ├── components/
│       │   ├── figma-viewer/
│       │   │   ├── FigmaViewer.tsx       # ★ 핵심: 이미지 + 클릭 오버레이
│       │   │   ├── NodeOverlay.tsx       # 개별 노드 클릭 영역
│       │   │   ├── NodeTree.tsx          # 좌측 노드 트리 (검색 가능)
│       │   │   ├── NodeProperties.tsx    # 선택된 노드 속성 패널
│       │   │   └── SyncButton.tsx        # Figma 동기화 버튼
│       │   ├── chat/
│       │   │   ├── ChatInput.tsx         # ★ 하단 고정 채팅 입력창
│       │   │   ├── ChatMessages.tsx      # AI 응답 메시지 목록
│       │   │   └── CommandSuggestions.tsx # 자동완성 명령 제안
│       │   ├── diff-viewer/
│       │   │   ├── DiffViewer.tsx        # 코드 변경 미리보기
│       │   │   └── ApplyButton.tsx       # 적용/취소 버튼
│       │   ├── git-panel/
│       │   │   ├── GitPanel.tsx          # Git 상태 표시
│       │   │   ├── CommitDialog.tsx      # 커밋 메시지 + 푸시
│       │   │   └── BranchSelector.tsx    # 브랜치 선택
│       │   ├── layout/
│       │   │   ├── WorkspaceLayout.tsx   # 메인 3-panel 레이아웃
│       │   │   └── Sidebar.tsx           # 좌측 사이드바
│       │   └── onboarding/
│       │       ├── OnboardingFlow.tsx    # 인라인 온보딩 3단계
│       │       └── DemoMode.tsx          # 데모 모드 (샘플 프로젝트)
│       ├── lib/
│       │   ├── figma/
│       │   │   ├── client.ts            # Figma REST API 클라이언트
│       │   │   ├── parser.ts            # 노드 트리 파싱 + 좌표 계산
│       │   │   └── types.ts             # Figma 노드 타입 정의
│       │   ├── anthropic/
│       │   │   ├── client.ts            # Anthropic API 클라이언트
│       │   │   └── prompts.ts           # 프롬프트 템플릿
│       │   ├── github/
│       │   │   ├── client.ts            # GitHub API 클라이언트 (Octokit)
│       │   │   └── operations.ts        # 파일 읽기/쓰기/커밋/푸시
│       │   ├── mapping/
│       │   │   ├── engine.ts            # 매핑 엔진 (네이밍 + AI)
│       │   │   ├── naming.ts            # 네이밍 컨벤션 매칭
│       │   │   ├── ai-infer.ts          # AI 추론 매핑
│       │   │   └── cache.ts             # 매핑 캐시 (Supabase)
│       │   ├── supabase/
│       │   │   ├── client.ts            # Supabase 클라이언트
│       │   │   └── types.ts             # DB 타입
│       │   ├── trpc/
│       │   │   ├── client.ts            # tRPC 클라이언트
│       │   │   ├── server.ts            # tRPC 서버
│       │   │   └── routers/
│       │   │       ├── figma.ts         # Figma 관련 라우터
│       │   │       ├── ai.ts            # AI 코드 수정 라우터
│       │   │       ├── git.ts           # GitHub 라우터
│       │   │       └── project.ts       # 프로젝트 CRUD 라우터
│       │   └── store/
│       │       ├── figma-store.ts       # Figma 상태 (노드 트리, 선택)
│       │       ├── chat-store.ts        # 채팅 상태
│       │       └── project-store.ts     # 프로젝트 상태
│       ├── styles/
│       │   └── globals.css
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── types.ts                     # 공유 타입 (FigmaNode, CodeMapping 등)
│       └── constants.ts                 # 공유 상수
│
├── supabase/
│   └── migrations/
│       └── 001_initial.sql              # 초기 스키마
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .gitignore
└── CLAUDE.md                            # 이 파일
```

---

## 4. 데이터베이스 스키마 (Supabase)

```sql
-- 001_initial.sql

-- Users (GitHub OAuth 기반)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id BIGINT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  figma_access_token TEXT,          -- Figma OAuth 토큰 (암호화)
  figma_refresh_token TEXT,
  github_access_token TEXT,         -- GitHub OAuth 토큰 (암호화)
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (Figma 파일 + GitHub 레포 연결)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  figma_file_key TEXT NOT NULL,     -- Figma 파일 키 (URL에서 추출)
  figma_file_name TEXT,
  github_owner TEXT,                -- GitHub 레포 owner
  github_repo TEXT,                 -- GitHub 레포 이름
  github_branch TEXT DEFAULT 'main',
  github_base_path TEXT DEFAULT '', -- 코드 기본 경로 (예: "src/")
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Node-to-Code Mappings (캐시)
CREATE TABLE mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  figma_node_id TEXT NOT NULL,      -- Figma 노드 ID (예: "42:187")
  figma_node_name TEXT,
  code_file_path TEXT NOT NULL,     -- 코드 파일 경로 (예: "src/components/Button.tsx")
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
  user_command TEXT,                 -- 유저가 입력한 명령
  ai_explanation TEXT,               -- AI가 생성한 설명
  commit_sha TEXT,                   -- GitHub 커밋 SHA (푸시된 경우)
  status TEXT DEFAULT 'applied' CHECK (status IN ('preview', 'applied', 'pushed', 'reverted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_mappings_project ON mappings(project_id);
CREATE INDEX idx_mappings_node ON mappings(project_id, figma_node_id);
CREATE INDEX idx_history_project ON edit_history(project_id);
```

---

## 5. 핵심 컴포넌트 상세 명세

### 5.1 FigmaViewer (★ 가장 중요한 컴포넌트)

**목적:** Figma 프레임을 이미지로 표시하고, 각 노드 위치에 투명 클릭 영역을 올려서 유저가 엘리먼트를 선택할 수 있게 한다.

**구현 방법:**
```
1. Figma REST API GET /v1/files/:key 로 전체 노드 트리 가져옴
2. GET /v1/images/:key?ids=FRAME_IDS&format=png&scale=2 로 프레임 이미지 가져옴
3. 프레임 이미지를 <img>로 표시
4. 노드 트리에서 각 노드의 absoluteBoundingBox (x, y, width, height) 추출
5. 이미지 위에 각 노드 크기/위치에 맞는 투명한 <div>를 absolute position으로 배치
6. 클릭하면 해당 노드가 선택됨 → Zustand store에 selectedNode 업데이트
7. 선택된 노드는 파란색 테두리(2px solid #2E86C1)로 표시
8. 마우스 호버 시 연한 파란색 배경(rgba(46,134,193,0.1))
```

**주의사항:**
- Figma의 absoluteBoundingBox는 캔버스 좌표 기준이므로, 프레임 내부 상대 좌표로 변환 필요
- 변환 공식: `relativeX = node.absoluteBoundingBox.x - frame.absoluteBoundingBox.x`
- 이미지 스케일과 실제 좌표를 맞추기 위해 scale factor 계산 필요
- 줌 인/아웃 지원: CSS transform scale 사용
- 작은 엘리먼트는 클릭하기 어려우므로 NodeTree 검색도 제공

### 5.2 ChatInput (하단 고정 채팅창)

**위치:** 화면 최하단에 항상 고정 (sticky bottom)

**동작:**
- 선택된 노드가 없을 때: placeholder = "먼저 Figma 뷰어에서 엘리먼트를 선택하세요"
- 선택된 노드가 있을 때: placeholder = "[CTA Button]에 대해 명령하세요..."
- Enter 입력 → tRPC mutation 호출 → AI 응답 대기 → DiffViewer에 결과 표시
- 로딩 중: 스켈레톤 애니메이션 + "코드 수정 중..." 표시

### 5.3 DiffViewer (코드 변경 미리보기)

**라이브러리:** react-diff-viewer-continued 사용

**동작:**
- AI 응답에서 original / modified를 받아서 side-by-side diff 표시
- "적용" 버튼: 변경사항을 GitHub Contents API로 파일 업데이트 → edit_history에 기록
- "취소" 버튼: diff 닫기
- "자동 적용" 토글: 켜면 확인 없이 바로 적용

### 5.4 WorkspaceLayout (메인 레이아웃)

**3-Panel 구조:**
```
┌──────────────┬──────────────────────────────┬──────────────┐
│  좌측 패널    │       중앙 메인 영역          │  우측 패널    │
│  (280px)     │    (flex-1, 가변)             │  (320px)     │
│              │                              │              │
│  NodeTree    │    FigmaViewer               │  Node속성     │
│  (트리 검색)  │    (이미지 + 클릭 오버레이)    │  DiffViewer  │
│              │                              │  GitPanel    │
│              │                              │              │
├──────────────┴──────────────────────────────┴──────────────┤
│  ChatInput (하단 고정, 전체 너비)                            │
│  [CTA Button] 색상 빨간색으로 바꿔                    [Send] │
└──────────────────────────────────────────────────────────────┘
```

- 좌측: NodeTree (Figma 노드 트리 + 검색)
- 중앙: FigmaViewer (이미지 + 클릭 오버레이, 줌/팬 지원)
- 우측: 선택된 노드 속성 + DiffViewer + GitPanel
- 하단: ChatInput (항상 고정)
- 반응형: 모바일에서는 탭으로 전환

---

## 6. API 명세

### 6.1 Figma REST API 사용

```typescript
// lib/figma/client.ts

const FIGMA_BASE = "https://api.figma.com/v1";

// 파일 전체 노드 트리 가져오기
async function getFile(fileKey: string, token: string) {
  const res = await fetch(`${FIGMA_BASE}/files/${fileKey}`, {
    headers: { "X-Figma-Token": token }
  });
  return res.json();
  // 반환: { document: { children: [pages] }, ... }
  // 각 노드: { id, name, type, absoluteBoundingBox, fills, strokes, effects, ... }
}

// 프레임 이미지 렌더링
async function getImages(fileKey: string, nodeIds: string[], token: string) {
  const ids = nodeIds.join(",");
  const res = await fetch(
    `${FIGMA_BASE}/images/${fileKey}?ids=${ids}&format=png&scale=2`,
    { headers: { "X-Figma-Token": token } }
  );
  return res.json();
  // 반환: { images: { "nodeId": "https://..." } }
}

// URL에서 파일 키 추출
function extractFileKey(url: string): string {
  // https://www.figma.com/design/ABC123/FileName → ABC123
  const match = url.match(/figma\.com\/(design|file)\/([a-zA-Z0-9]+)/);
  return match?.[2] ?? "";
}
```

### 6.2 Anthropic API 사용

```typescript
// lib/anthropic/client.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateCodeEdit(
  figmaNode: FigmaNodeData,
  codeFileContent: string,
  codeFilePath: string,
  userCommand: string
) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are a precise code editor for a Figma-to-Code bridge platform.

RULES:
- Given a Figma element's properties and a code file, apply the user's requested change.
- Return ONLY valid JSON (no markdown, no backticks, no explanation outside the JSON).
- The JSON must have this exact structure:
  {
    "filePath": "exact file path",
    "original": "exact string to find in the file",
    "modified": "replacement string",
    "explanation": "1-sentence summary in the user's language"
  }
- "original" must be an EXACT substring of the provided code file.
- Make minimal changes. Only modify what the user asked for.
- Preserve all existing formatting, indentation, and surrounding code.`,
    messages: [{
      role: "user",
      content: `## Figma Element
${JSON.stringify(figmaNode, null, 2)}

## Code File (${codeFilePath})
\`\`\`
${codeFileContent}
\`\`\`

## User Command
${userCommand}`
    }]
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text);
}
```

### 6.3 GitHub API 사용

```typescript
// lib/github/operations.ts
import { Octokit } from "@octokit/rest";

// 파일 내용 가져오기
async function getFileContent(octokit: Octokit, owner: string, repo: string, path: string, ref: string) {
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
  if ("content" in data) {
    return {
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      sha: data.sha
    };
  }
  throw new Error("Not a file");
}

// 파일 수정 + 커밋
async function updateFile(
  octokit: Octokit,
  owner: string, repo: string,
  path: string, content: string, sha: string,
  message: string, branch: string
) {
  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner, repo, path, branch,
    message,
    content: Buffer.from(content).toString("base64"),
    sha
  });
  return data.commit.sha;
}

// 레포 파일 트리 가져오기 (매핑에 사용)
async function getRepoTree(octokit: Octokit, owner: string, repo: string, branch: string) {
  const { data } = await octokit.git.getTree({
    owner, repo,
    tree_sha: branch,
    recursive: "true"
  });
  return data.tree.filter(item => item.type === "blob").map(item => item.path);
}
```

### 6.4 tRPC 라우터

```typescript
// lib/trpc/routers/figma.ts
export const figmaRouter = router({
  // Figma 파일 로드
  loadFile: protectedProcedure
    .input(z.object({ figmaUrl: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const fileKey = extractFileKey(input.figmaUrl);
      const fileData = await getFile(fileKey, ctx.user.figmaAccessToken);
      // 노드 트리 파싱 + 프레임 이미지 URL 가져오기
      // 결과 반환
    }),

  // Figma 동기화 (Sync 버튼)
  sync: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Figma REST API 재호출 → 최신 노드 트리 + 이미지 반환
    }),
});

// lib/trpc/routers/ai.ts
export const aiRouter = router({
  // 코드 수정 요청
  editCode: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      figmaNodeId: z.string(),
      command: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. 매핑 엔진으로 코드 파일 찾기
      // 2. GitHub API로 코드 파일 내용 가져오기
      // 3. Claude API 호출
      // 4. diff 반환
    }),
});

// lib/trpc/routers/git.ts
export const gitRouter = router({
  // 코드 변경 적용 + 커밋 + 푸시
  commitAndPush: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      filePath: z.string(),
      original: z.string(),
      modified: z.string(),
      commitMessage: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. GitHub API로 파일 업데이트
      // 2. edit_history에 기록
      // 3. 커밋 SHA 반환
    }),
});
```

---

## 7. 매핑 엔진 상세

Figma 노드를 코드 파일에 매핑하는 3단계 시스템:

```typescript
// lib/mapping/engine.ts

async function findCodeFile(
  node: FigmaNodeData,
  projectFiles: string[],  // GitHub 레포의 파일 트리
  projectId: string
): Promise<MappingResult> {

  // Step 1: 캐시 확인
  const cached = await getCachedMapping(projectId, node.id);
  if (cached) return { ...cached, method: "cache" };

  // Step 2: 네이밍 컨벤션 매칭
  const byNaming = matchByNaming(node, projectFiles);
  if (byNaming && byNaming.confidence > 0.7) {
    await saveMapping(projectId, node.id, byNaming.filePath, "naming", byNaming.confidence);
    return byNaming;
  }

  // Step 3: AI 추론 매칭
  const byAI = await inferByAI(node, projectFiles);
  if (byAI) {
    await saveMapping(projectId, node.id, byAI.filePath, "ai", byAI.confidence);
    return byAI;
  }

  return null; // 매핑 실패 → 유저에게 수동 매핑 요청
}
```

### 네이밍 매칭 규칙:

```typescript
// lib/mapping/naming.ts

function matchByNaming(node: FigmaNodeData, files: string[]): MappingResult | null {
  const patterns = [
    // Figma 컴포넌트 이름 → 파일 경로 변환
    // "Button/Primary" → "Button/Primary.tsx" 또는 "button-primary.tsx"
    node.name.replace(/\//g, "/"),                          // 슬래시 유지
    node.name.replace(/\s+/g, ""),                          // 공백 제거
    node.name.replace(/\s+/g, "-").toLowerCase(),           // kebab-case
    node.name.replace(/\s+/g, ""),                          // PascalCase
    node.componentName?.replace(/\//g, "/"),                 // 컴포넌트 이름
  ].filter(Boolean);

  for (const pattern of patterns) {
    const match = files.find(f =>
      f.toLowerCase().includes(pattern.toLowerCase()) &&
      (f.endsWith(".tsx") || f.endsWith(".jsx") || f.endsWith(".vue") || f.endsWith(".svelte"))
    );
    if (match) return { filePath: match, confidence: 0.85, method: "naming" };
  }

  return null;
}
```

---

## 8. 환경 변수

```env
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Figma OAuth
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
FIGMA_REDIRECT_URI=https://meld-psi.vercel.app/api/auth/figma

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=https://meld-psi.vercel.app/api/auth/github

# Anthropic
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://meld-psi.vercel.app
```

---

## 9. 구현 순서 (이 순서대로 진행할 것)

### Phase 1: 프로젝트 초기화 (Day 1)
1. pnpm + Turborepo monorepo 세팅
2. Next.js 15 앱 생성 (apps/web)
3. Tailwind CSS + shadcn/ui 설치 및 설정
4. Supabase 프로젝트 연결 + 초기 마이그레이션 실행
5. tRPC 세팅 (server + client)
6. 기본 레이아웃 + 라우팅 구조

### Phase 2: 인증 (Day 2)
1. GitHub OAuth 로그인 구현
2. Figma OAuth 로그인 구현
3. 토큰 저장 (Supabase users 테이블)
4. 보호된 라우트 미들웨어

### Phase 3: Figma 뷰어 (Day 3-5) ★ 가장 중요
1. Figma REST API 클라이언트 구현
2. 파일 URL 파싱 + 노드 트리 로드
3. 프레임 이미지 렌더링
4. **노드 좌표 → 클릭 오버레이 매핑** (핵심 로직)
5. 클릭 선택 + 호버 하이라이트
6. NodeTree (좌측 트리 뷰 + 검색)
7. NodeProperties (선택된 노드 속성 표시)
8. Sync 버튼

### Phase 4: AI 코드 수정 (Day 6-8)
1. GitHub 레포 연결 (OAuth + 레포 선택)
2. 매핑 엔진 구현 (네이밍 매칭)
3. Anthropic API 연동
4. 프롬프트 빌더
5. ChatInput UI
6. DiffViewer UI

### Phase 5: Git 연동 (Day 9-10)
1. GitHub Contents API로 파일 읽기/쓰기
2. 커밋 + 푸시
3. CommitDialog UI
4. edit_history 기록

### Phase 6: 통합 + 폴리시 (Day 11-14)
1. 전체 플로우 연결 테스트
2. 에러 핸들링
3. 로딩 상태 + 스켈레톤
4. 인라인 온보딩
5. 데모 모드 (샘플 Figma 파일 + 샘플 레포)
6. 반응형 레이아웃

---

## 10. 디자인 가이드

### 색상
- Primary: #2E86C1 (파란색 — 버튼, 선택 하이라이트)
- Background: 흰색 (#FFFFFF), 서페이스 (#F8F9FA)
- Text: #1C1C1C (primary), #6B7280 (secondary)
- Border: #E5E7EB
- Success: #059669
- Error: #DC2626

### 폰트
- sans-serif 시스템 폰트 (Inter 권장)
- 코드: JetBrains Mono 또는 Fira Code

### 원칙
- 최소 UI. 불필요한 장식 없음.
- 개발자 도구답게 정보 밀도 높게.
- 다크모드 지원 (shadcn/ui 기본 제공).
- 키보드 단축키: Cmd+Enter(명령 전송), Cmd+S(커밋), Escape(선택 해제)

---

## 11. 에러 핸들링

- Figma API 실패: "Figma 파일을 불러올 수 없습니다. URL을 확인하세요." + 재시도 버튼
- Figma rate limit: "잠시 후 다시 시도해주세요 (Figma API 제한)." + 자동 재시도 (30초 후)
- 매핑 실패: "이 엘리먼트와 매칭되는 코드 파일을 찾지 못했습니다." + 수동 매핑 UI (파일 선택)
- Claude API 실패: "코드 수정을 생성하지 못했습니다." + 재시도 버튼
- GitHub API 실패: "GitHub에 푸시할 수 없습니다." + 에러 상세 표시
- 네트워크 오류: toast 알림으로 간단히 표시

---

## 12. 성능 최적화

- Figma 데이터 캐시: React Query의 staleTime으로 불필요한 재호출 방지
- 이미지 캐시: Next.js Image 컴포넌트 + CDN 캐시
- 매핑 캐시: Supabase mappings 테이블 (한번 매핑 → 재사용)
- 노드 트리 가상화: 대형 파일의 수천 개 노드 → react-window로 가상 스크롤
- API 호출 최소화: 변경된 노드만 Sync (캐시 vs 최신 비교)

---

## 이 명세서를 기반으로 Phase 1부터 순서대로 구현을 시작해줘.
## 각 Phase를 완료할 때마다 진행 상황을 알려주고, 다음 단계로 넘어가.
