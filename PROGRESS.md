# FigmaCodeBridge 구현 진행 상황

## Phase 1: 프로젝트 초기화 및 기본 구조 ✅

**완료일**: 2026-03-21

### 체크리스트

| 항목 | 상태 |
|------|------|
| pnpm + Turborepo monorepo 세팅 | ✅ 완료 |
| Next.js 16 앱 생성 (apps/web, App Router) | ✅ 완료 |
| Tailwind CSS v4 설정 | ✅ 완료 |
| Supabase 초기 마이그레이션 (001_initial.sql) | ✅ 완료 |
| tRPC v11 세팅 (server + client + 4 routers) | ✅ 완료 |
| 기본 레이아웃 + 라우팅 구조 | ✅ 완료 |
| Zustand 스토어 3개 생성 | ✅ 완료 |
| Figma REST API 클라이언트 + 파서 | ✅ 완료 |
| 공유 패키지 (types, constants) | ✅ 완료 |
| TypeScript 타입 체크 통과 | ✅ 완료 |
| 프로덕션 빌드 성공 | ✅ 완료 |
| Dev 서버 정상 동작 (HTTP 200) | ✅ 완료 |

### 프로젝트 구조

```
figma-code-bridge/
├── apps/
│   └── web/                              # Next.js 16 (App Router)
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx            # Root layout (Providers 포함)
│       │   │   ├── page.tsx              # 랜딩 페이지
│       │   │   ├── (auth)/
│       │   │   │   ├── login/page.tsx
│       │   │   │   └── callback/
│       │   │   │       ├── github/page.tsx
│       │   │   │       └── figma/page.tsx
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── project/[id]/page.tsx  # 3-panel 워크스페이스
│       │   │   └── api/trpc/[trpc]/route.ts
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── Providers.tsx      # tRPC + React Query
│       │   │   │   ├── WorkspaceLayout.tsx # 3-panel 레이아웃
│       │   │   │   └── Sidebar.tsx
│       │   │   ├── figma-viewer/          # (Phase 3)
│       │   │   ├── chat/                  # (Phase 4)
│       │   │   ├── diff-viewer/           # (Phase 4)
│       │   │   ├── git-panel/             # (Phase 5)
│       │   │   └── onboarding/            # (Phase 6)
│       │   ├── lib/
│       │   │   ├── figma/
│       │   │   │   ├── client.ts          # Figma REST API 클라이언트
│       │   │   │   ├── parser.ts          # 노드 트리 파싱 + 좌표 변환
│       │   │   │   └── types.ts           # Figma + Viewer 타입
│       │   │   ├── supabase/
│       │   │   │   ├── client.ts
│       │   │   │   └── types.ts           # DB 스키마 타입
│       │   │   ├── trpc/
│       │   │   │   ├── server.ts          # tRPC 초기화 + procedures
│       │   │   │   ├── router.ts          # 앱 라우터 (합성)
│       │   │   │   ├── client.ts          # React 클라이언트
│       │   │   │   └── routers/
│       │   │   │       ├── figma.ts       # loadFile, getImages, sync
│       │   │   │       ├── ai.ts          # editCode (스캐폴딩)
│       │   │   │       ├── git.ts         # commitAndPush (스캐폴딩)
│       │   │   │       └── project.ts     # list, create, get
│       │   │   └── store/
│       │   │       ├── figma-store.ts     # Figma 상태 (노드, 프레임, 선택, 줌)
│       │   │       ├── chat-store.ts      # 채팅 메시지 상태
│       │   │       └── project-store.ts   # 프로젝트 상태
│       │   └── test/setup.ts
│       ├── vitest.config.ts
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── shared/
│       └── src/
│           ├── types.ts                   # FigmaNodeData, CodeMapping, Project 등
│           ├── constants.ts               # 색상, API URL, 설정값
│           └── index.ts
├── supabase/
│   └── migrations/
│       └── 001_initial.sql                # users, projects, mappings, edit_history
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
└── .gitignore
```

### 기술 스택 (설치 완료)

| 영역 | 패키지 | 버전 |
|------|--------|------|
| Framework | next | 16.2.1 |
| React | react, react-dom | 19.2.4 |
| Language | typescript | 5.9.3 |
| Styling | tailwindcss | 4.2.2 |
| State | zustand | 5.0.12 |
| Data Fetching | @tanstack/react-query | 5.91.3 |
| API Layer | @trpc/server, @trpc/client, @trpc/react-query | 11.14.1 |
| Validation | zod | 4.3.6 |
| Database | @supabase/supabase-js | 2.99.3 |
| Git | @octokit/rest | 22.0.1 |
| Icons | lucide-react | 0.577.0 |
| Testing | vitest, @testing-library/react | 4.1.0, 16.3.2 |

### DB 스키마

- **users**: GitHub OAuth 기반 사용자 (figma/github 토큰 저장)
- **projects**: Figma 파일 + GitHub 레포 연결
- **mappings**: Figma 노드 → 코드 파일 매핑 캐시
- **edit_history**: AI 코드 수정 이력 (undo/redo, 감사 로그)

### Zustand 스토어

- **figma-store**: 파일 데이터, 프레임, 선택된 노드, 줌 레벨
- **chat-store**: 채팅 메시지, 처리 상태
- **project-store**: 현재 프로젝트, 프로젝트 목록

### tRPC 라우터

- **figma**: `loadFile`, `getImages`, `sync`
- **ai**: `editCode` (스캐폴딩, Phase 4에서 구현)
- **git**: `commitAndPush` (스캐폴딩, Phase 5에서 구현)
- **project**: `list`, `create`, `get`

---

## Phase 2: 인증 ✅

**완료일**: 2026-03-21

### 체크리스트

| 항목 | 상태 |
|------|------|
| GitHub OAuth 로그인 구현 | ✅ 완료 |
| Figma OAuth 연결 구현 | ✅ 완료 |
| JWT 세션 관리 (jose) | ✅ 완료 |
| 토큰 저장 (Supabase users 테이블) | ✅ 완료 |
| 보호된 라우트 (proxy.ts) | ✅ 완료 |
| tRPC 인증 컨텍스트 연결 | ✅ 완료 |
| 로그아웃 기능 | ✅ 완료 |
| /api/auth/me 사용자 정보 API | ✅ 완료 |
| Zustand auth-store | ✅ 완료 |
| TypeScript 타입 체크 통과 | ✅ 완료 |

### 구현 파일

```
apps/web/src/
├── lib/auth/
│   ├── session.ts          # JWT 세션 생성/검증/쿠키 관리
│   ├── github.ts           # GitHub OAuth URL/토큰교환/사용자조회
│   └── figma.ts            # Figma OAuth URL/토큰교환/갱신
├── lib/supabase/
│   └── admin.ts            # Service role Supabase 클라이언트
├── lib/store/
│   └── auth-store.ts       # 인증 상태 관리 (Zustand)
├── app/api/auth/
│   ├── github/route.ts     # GitHub OAuth 시작+콜백
│   ├── figma/route.ts      # Figma OAuth 시작+콜백
│   ├── me/route.ts         # 현재 사용자 정보
│   └── logout/route.ts     # 세션 삭제
├── app/(auth)/
│   ├── login/page.tsx       # 로그인 페이지 (GitHub OAuth 버튼)
│   └── callback/            # OAuth 콜백 fallback 페이지
└── proxy.ts                 # 보호된 라우트 (/dashboard, /project)
```

### 인증 플로우

1. `/login` → "GitHub로 로그인" 클릭 → `/api/auth/github`로 이동
2. GitHub OAuth 인증 후 콜백 → 토큰 교환 → Supabase에 사용자 upsert
3. JWT 세션 쿠키 설정 → `/dashboard`로 리다이렉트
4. Figma 연결: Dashboard에서 "Figma 연결" → `/api/auth/figma` → 토큰 저장
5. 보호된 라우트: `proxy.ts`에서 JWT 검증, 미인증시 `/login`으로 리다이렉트
6. tRPC: Request 쿠키에서 세션 읽어 `ctx.user` 주입

### 환경변수 (추가됨)

- `SESSION_SECRET` - JWT 서명 키 (`openssl rand -base64 32`)

## Phase 3: Figma 뷰어 ⏳ (대기중)

- [ ] Figma REST API 클라이언트 완성
- [ ] 파일 URL 파싱 + 노드 트리 로드
- [ ] 프레임 이미지 렌더링
- [ ] 노드 좌표 → 클릭 오버레이 매핑 (핵심 로직)
- [ ] 클릭 선택 + 호버 하이라이트
- [ ] NodeTree (좌측 트리 뷰 + 검색)
- [ ] NodeProperties (선택된 노드 속성 표시)
- [ ] Sync 버튼

## Phase 4: AI 코드 수정 ⏳ (대기중)

- [ ] GitHub 레포 연결
- [ ] 매핑 엔진 구현 (네이밍 매칭 + AI 추론)
- [ ] Anthropic API 연동
- [ ] 프롬프트 빌더
- [ ] ChatInput UI
- [ ] DiffViewer UI

## Phase 5: Git 연동 ⏳ (대기중)

- [ ] GitHub Contents API 파일 읽기/쓰기
- [ ] 커밋 + 푸시
- [ ] CommitDialog UI
- [ ] edit_history 기록

## Phase 6: 통합 + 폴리시 ⏳ (대기중)

- [ ] 전체 플로우 연결 테스트
- [ ] 에러 핸들링
- [ ] 로딩 상태 + 스켈레톤
- [ ] 인라인 온보딩
- [ ] 데모 모드
- [ ] 반응형 레이아웃
