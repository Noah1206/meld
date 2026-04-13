# Meld AI — 프로젝트 현황 (2026-04-13)

## 한줄 요약
AI 코딩 에이전트 웹앱. 유저가 프롬프트 입력 → E2B 클라우드 샌드박스에서 자율 코딩 → 실시간 프리뷰.

## 기술 스택
- **프론트**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + Zustand
- **AI**: Claude Sonnet 4 (메인 에이전트) + Haiku 4.5
- **샌드박스**: E2B (커스텀 템플릿 `meld-agent` — Node.js 22 + pnpm + Playwright)
- **DB/Auth**: Supabase (Postgres + OAuth)
- **결제**: Polar (Free / Pro $20 / Unlimited $49)
- **검색/브라우징**: Serper (Google 검색) + Firecrawl (스크래핑 + Vision)
- **배포 예정**: Vercel (web) + electron-builder (desktop)

## 디렉토리 구조
```
apps/web/                              — Next.js 웹앱 (메인)
  src/app/project/workspace/page.tsx   — 워크스페이스 (6000+ lines, 단일 페이지 IDE)
  src/app/projects/page.tsx            — 프로젝트 목록 + 사이드바
  src/app/api/ai/agent-run/route.ts    — E2B 에이전트 루프 (핵심)
  src/app/api/ai/agent-run/events/     — SSE 이벤트 폴링
  src/app/api/search/route.ts          — 웹 검색 (Serper/Firecrawl)
  src/app/api/browse/route.ts          — URL 브라우징 + Vision AI
  src/app/api/compute/provision/       — E2B 샌드박스 프로비저닝
  src/app/pricing/                     — 가격 페이지
  src/components/agent/AgentActivityFeed.tsx — Manus 스타일 활동 피드
  src/lib/store/
    agent-session-store.ts             — 에이전트 세션 상태 (이벤트, 편집 승인)
    agent-store.ts                     — 파일 트리, dev server, inspector
    mcp-store.ts                       — MCP 서버 연결 상태
apps/desktop/                          — Electron 데스크톱 앱
packages/agent/                        — 로컬 에이전트 CLI (WebSocket)
packages/shared/                       — 공유 타입
infra/e2b-template/                    — E2B 커스텀 템플릿 (v2 빌드)
```

## 에이전트 시스템 (핵심)

### 동작 흐름
```
유저 입력 → POST /api/ai/agent-run → E2B 샌드박스 생성 (meld-agent 템플릿)
  → Claude Sonnet 4 agent loop (max 50 rounds, 16384 tokens)
  → 도구 9개 사용 (아래 참고)
  → dev server 자동 감지 → sandbox.getHost() → devServer 이벤트
  → 브라우저 폴링 (500ms) → AgentActivityFeed 실시간 표시
  → 완료 시 메시지 + step 히스토리 유지
```

### 에이전트 도구 (9개)
| 도구 | 설명 | 제한 |
|------|------|------|
| read_file | 파일 읽기 | truncation 10K chars |
| write_file | 파일 생성/덮어쓰기 | — |
| delete_file | 파일/디렉토리 삭제 | — |
| rename_file | 파일 이동/이름변경 | — |
| list_files | 파일 목록 | maxDepth 10, 500개 |
| search_files | grep 검색 | 50개 결과, 모든 파일 타입 |
| run_command | 셸 명령어 | 5분 타임아웃 |
| web_search | Google 검색 (Serper) | 5개 결과 |
| browse_url | URL 스크래핑 + Vision | Firecrawl + fallback fetch |

### 에이전트 설정
- **maxRounds**: 50
- **max_tokens**: 16,384
- **샌드박스 타임아웃**: 30분
- **명령어 타임아웃**: 5분
- **dev server 감지**: 8개 패턴 (Vite, Next.js, Express 등)
- **dev server 명령어**: 백그라운드 실행 (agent loop 블로킹 방지)
- **샌드박스 정리**: dev server 실행 중이면 kill 안 함

### 이벤트 타입
```
thinking, tool_call, tool_result,
file_read, file_edit, file_edit_auto, file_created, file_delete, file_rename,
devServer,
command_start, command_output, command_done,
message, done, error, cancelled, awaiting_approval
```

## UI 현황

### 워크스페이스 (workspace/page.tsx)
- Manus 스타일 채팅 UI (step card + 타이핑 효과)
- 하단 입력: + 버튼 (팝업 메뉴: 서비스 연결, 스킬 사용, 파일 추가)
- 연결된 MCP 아이콘 표시 + 모니터(Computer use) 버튼
- AgentActivityFeed: 스피너/체크 step card, 도구별 특화 카드 (web_search, browse_url, devServer)
- 하단 진행 바: 파란 점 + 스텝명 + 시간 + 카운터

### 프로젝트 목록 (projects/page.tsx)
- 사이드바: 프로젝트 리스트, ← 로그아웃 (hover 빨간색)
- 메인: 입력 + 카테고리 선택 (Website 등) + 로컬 프로젝트 열기

### MCP 서버 (14개 프리셋)
figma, github, vercel, supabase, sentry, linear, notion, slack, gmail, canva, filesystem, windows-mcp, pdf-viewer, agent-bridge

## 완료된 것 ✅
- [x] E2B 샌드박스 연결 + 커스텀 템플릿 빌드 (`meld-agent`)
- [x] 에이전트 도구 9개 (read/write/delete/rename/list/search/run/web_search/browse_url)
- [x] 완전 자율 에이전트 (Haiku 분류기 제거, 모든 요청이 풀 에이전트)
- [x] dev server 자동 감지 + E2B 공개 URL 변환 + devServer 이벤트
- [x] Manus 스타일 AgentActivityFeed (무채색 디자인)
- [x] 입력 UI 리디자인 (+ 팝업, MCP 아이콘, 모니터 버튼)
- [x] Polar 결제 시스템 (가격 페이지, Checkout, Webhook, Portal)
- [x] 웹 검색 + URL 브라우징 + Vision AI
- [x] 타이핑 효과 + step 히스토리 유지

## 남은 작업 (우선순위 순)

### P0 — 바로 해야 함
1. **E2E 테스트** — "React 앱 만들어줘" → 파일 생성 + dev server + 프리뷰 확인
2. **AWS Access Key 교체** — 보안 긴급
3. **Polar 환경변수 설정 + 결제 테스트**

### P1 — 배포 전
4. **배포**: GitHub push → Vercel + Supabase 프로덕션 + 도메인
5. **에러 처리**: "fetch failed" 같은 에러 메시지 친절하게
6. **새 세션 시작 시 이전 에이전트 세션 정리** (agentSession.startSession이 events를 초기화하지만, UI에 이전 메시지가 남을 수 있음)

### P2 — 배포 후
7. **로컬 터미널 연결** — `npx meld-agent` → 유저 PC에서 에이전트 실행 → 웹 Meld와 WebSocket 연결. Claude Code + 프리뷰 + 비주얼 에디터 = 킬러 피처
8. **스크린샷 인라인 썸네일** — 활동 피드 내 프리뷰 스크린샷
9. **멀티 에이전트 병렬 실행**
10. **모바일 반응형**

## 환경변수 (.env.local 필요)
```
ANTHROPIC_API_KEY=...
E2B_API_KEY=...
SERPER_API_KEY=...
FIRECRAWL_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
POLAR_FREE_PRODUCT_ID=...
POLAR_PRO_PRODUCT_ID=...
POLAR_UNLIMITED_PRODUCT_ID=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## 개발 명령어
```bash
pnpm dev                    # 웹 dev server (port 9090)
pnpm build                  # 프로덕션 빌드
pnpm lint                   # ESLint

# E2B 템플릿 재빌드
cd infra/e2b-template
E2B_API_KEY=... npx tsx build.prod.ts
```

## 주요 결정 사항
- **웹 우선 MVP**: Electron 데스크톱은 후순위, 웹앱으로 먼저 런칭
- **E2B 샌드박스**: 모든 코딩은 클라우드에서 실행 (유저 PC 접근 없음, 후에 로컬 터미널 연결 추가)
- **완전 자율**: Haiku 분류기 제거, 모든 요청이 50라운드 에이전트 루프
- **Manus 스타일 UI**: 무채색 + 파란 점, step card, 하단 진행 바
- **경쟁 포지셔닝**: Claude Code(터미널) + 실시간 프리뷰 + 비주얼 에디터 + Figma 연결
