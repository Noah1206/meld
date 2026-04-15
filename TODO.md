# Meld AI — 내가 해야 할 일

> 업데이트: 2026-04-15 밤 — P0-4 Phase 1~4 + MCP 전면 개편 + Manus 최적화 + **P0-3 Monaco diff + P1-2 session persistence** 완료 (30개 Phase, tsc/lint/build 0 errors, 커밋 진행 중)

---

## 🚀 새 세션 시작 시 먼저 읽을 것 (2026-04-15 밤 세션 종료 시점)

### 지금 상태 한 줄 요약

**P0-4 Phase 1~4(토큰 최적화) + MCP 전면 개편(자율 사용) + Manus 스타일 최종 최적화까지 25개 Phase 완료.** tsc/eslint/next build 전부 0 errors. **전부 미커밋.** 다음 세션 첫 할 일은 **라이브 실측 + 커밋**.

### ⚠️ 모델이 Opus인 상태 그대로 (비용은 Phase 1~4로 크게 잡음)

- `apps/web/src/app/api/ai/agent-run/route.ts` 에서 여전히 `claude-opus-4-20250514` 사용 중 (이번 세션에서 유지)
- 이번 세션의 최적화로 **실질 비용 대폭 감소 예상** (Manus 블로그 기준 누적 ~85% 절감):
  - Phase 1: KV-Cache 종교적으로 먹이기 → 세션당 input 토큰 -70%
  - Phase 2: Tool 출력 축약 → 추가 -20%
  - Phase 3-fix: Tools 배열 고정 + user-message nudge (Manus soft masking) → 캐시 파괴 없음
  - Phase 4-fix: 파일시스템 외부 메모리 (`.meld/cache/` stash) → 긴 세션 -20~30%
- **아직 라이브 실측 미진행**. 다음 세션에서 baseline 프롬프트로 검증 필요.
- UI 뱃지는 여전히 `claude-sonnet-4` 하드코딩 (`workspace/page.tsx` 안쪽) — 별도 세션에서 정리.

### 💾 미커밋 변경 요약 (이번 세션 + 이전 세션 혼재)

**⚠️ 중요:** git status에 이전 세션의 미커밋 변경과 이번 세션의 변경이 **섞여 있음**. 커밋 시 분리 필수.

#### 이번 세션(2026-04-15 밤)에서 실제 수정/신규한 파일

**수정 (11 + 1 루트 파일):**
- `apps/web/src/app/api/ai/agent-run/route.ts` — 코어 에이전트 루프 전면 재작성 (Phase 1~4 + MCP 주입/실행 + dedup 가드 + 세션 검증)
- `apps/web/src/app/project/workspace/page.tsx` — MCP 공용 레이어 사용, 인라인 카드 wiring, userId body 제거, **Monaco diff 토글 버튼 + diffEnabled state**
- `apps/web/src/app/settings/page.tsx` — Integrations 탭을 `<MCPHubView />` 단일 컴포넌트로 재작성
- `apps/web/src/app/agents/_components/AgentsSidebar.tsx` — Integrations 아이콘/링크 추가, 죽은 `?tab=mcp` 링크 교체
- `apps/web/src/components/agent/AgentActivityFeed.tsx` — `mcp_request`/`mcp_auto_connected` 인라인 카드 + MCP 로딩 chip + `MCPRequestCard` 컴포넌트
- `apps/web/src/components/workspace/MonacoEditor.tsx` — **`DiffEditor` import + `diffAgainst` prop 추가**
- `apps/web/src/lib/harness/harness.ts` — **sandbox restore (resume 시) + 최종/주기 snapshot 호출 wiring**
- `apps/web/src/lib/harness/types.ts` — **`SessionStore.save/loadSandboxSnapshot` 선택 메서드 + `sandbox_restored`/`sandbox_snapshot_saved` event types**
- `apps/web/src/lib/store/agent-session-store.ts` — `AgentEventType`에 `mcp_request`, `mcp_auto_connected` 추가
- `apps/web/src/lib/trpc/routers/mcp.ts` — `extra` input 필드 + 컬럼 미존재 방어적 fallback
- `.env.example` — 7개 OAuth 서비스 `*_CLIENT_ID` / `*_CLIENT_SECRET` placeholder

**신규 (13 + 2 루트):**
- `apps/web/src/lib/agent/truncate.ts` — Phase 2, per-tool 출력 축약 (command/file/browse/list)
- `apps/web/src/lib/agent/tools/modes.ts` — 5개 mode 분류 규칙 (`MODE_NUDGE` 이제 route.ts에 직접 정의)
- `apps/web/src/lib/agent/context/summarize.ts` — Phase 4, Haiku 요약 + collapseReadFileCards (현재는 백업 경로)
- `apps/web/src/lib/agent/external-memory.ts` — **Phase 4-fix**, `.meld/cache/` 파일시스템 외부 메모리 (`stashToSandbox`)
- `apps/web/src/lib/mcp/presets-client.ts` — 14개 MCP 프리셋 단일 원천 (`oauthOnly`, `requiresProjectRef` 플래그 포함)
- `apps/web/src/lib/mcp/error.ts` — `formatMCPError` 한국어 친화 포맷터
- `apps/web/src/lib/mcp/useMCPConnect.ts` — 공용 connect/disconnect 훅
- `apps/web/src/lib/mcp/auto-connect.ts` — 서버 측 `tryAutoConnect(userId, adapterId)` (request_mcp가 호출)
- `apps/web/src/components/mcp/MCPHubView.tsx` — Settings + /integrations 공용 hub 뷰 (Token modal, validate all, oauth-only 뱃지 전부 포함)
- `apps/web/src/app/integrations/page.tsx` — 독립 `/integrations` 라우트
- `apps/web/src/app/api/mcp/oauth-availability/route.ts` — OAuth env var availability 리포트 엔드포인트
- `docs/MCP_OAUTH_SETUP.md` — 7개 OAuth 서비스 등록 가이드 (개발자 포털 URL + scope + redirect URI + 트러블슈팅)
- `docs/OPERATIONAL_CHECKLIST.md` — **사용자 직접 실행 작업 가이드** (AWS rotate, 도메인 연결, Live E2E 실측, Polar 실결제)
- `scripts/smoke-test-mcp.sh` — 로컬 dev 정적 체크 스크립트 (dev ping + JSON 엔드포인트 + tsc/lint/build)

#### 이전 세션에서 이미 미커밋 상태였던 것들 (제가 **안** 만진 파일)

다음은 이번 세션 시작 전부터 untracked/modified 상태였음. **이번 세션과 분리해서 평가 필요**:

- `apps/web/figma.config.json`
- `apps/web/public/brand/`
- `apps/web/src/app/agents/[id]/`
- `apps/web/src/app/agents/_components/` (AgentsSidebar 제외)
- `apps/web/src/app/api/harness/`
- `apps/web/src/app/api/workspace/`
- `apps/web/src/app/agents/create/page.tsx`, `apps/web/src/app/agents/page.tsx`
- `apps/web/src/app/projects/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/agent/AgentSessionsSidebar.tsx`
- `apps/web/src/lib/figma/__tests__/`, `apps/web/src/lib/figma/code-connect.ts`
- `apps/web/src/lib/harness/`, `apps/web/src/lib/workspace/`
- `apps/web/src/lib/mcp/__tests__/`
- `apps/web/src/lib/mcp/adapters/figma.ts`
- `apps/web/src/lib/store/agent-store.ts`
- `apps/web/package.json`, `pnpm-lock.yaml`
- `scripts/apply-harness-migration.sh`
- `supabase/migrations/20260414_add_harness_tables.sql`
- `supabase/migrations/20260414_add_workspace_projects.sql`

### 📌 다음 세션 첫 5분 할 일

1. **라이브 실측 한 번**: dev 서버 띄우고 `/integrations` → GitHub/Figma 연결 → `/project/workspace` → baseline 프롬프트 실행 → 서버 로그에서 다음 확인:
   - `[cache][session] round=1 ... cache_create=N` (첫 라운드 cache 생성)
   - `[cache][session] round=2+ ... cache_read=N` (2라운드부터 hit)
   - `[mcp-inject][session] connected=N tools=M est_tokens=K` (주입 확인)
   - `[mcp-overhead][session] per_round=K total_est=L pct_of_session=X%` (세션 종료 시)
   - 에이전트가 실제 `figma_*` 또는 `github_*` tool_call 이벤트 발사하는지 확인
2. **문제 없으면 커밋** — 이번 세션 변경만 (이전 세션 것과 분리)
3. **Phase 3-fix의 캐시 보존 검증**: mode 전환이 일어나는 세션 (예: `run_command` + error 발생 → debug 모드)을 의도적으로 돌려서 mode change 전후 `cache_read_input_tokens`가 끊기지 않는지 확인

### 🎯 베이스라인 측정용 프롬프트 (재현성)

```
React로 간단한 카운터 컴포넌트 하나 만들어줘. 버튼 두 개 (increment, decrement), 숫자 표시, useState 사용.
```

- 측정 항목: total input tokens, cache_read_input_tokens, cache_creation_input_tokens, output tokens, 총 라운드 수, MCP 오버헤드, stash 횟수
- 기대값:
  - `cache_read_input_tokens` / total input > 0.7 (Phase 1 목표)
  - Mode 전환 있어도 cache_read가 0으로 안 떨어짐 (Phase 3-fix 목표)
  - 큰 tool 결과 발생 시 `[stash]` 로그 + context에는 카드만 (Phase 4-fix 목표)

### 2026-04-15 결정 (확정)

**두 엔진 독립 유지**. `/agents`와 `/project/workspace`는 UX 축이 다르므로 엔진 통합하지 않는다.
- `/agents` 하네스 = **자율 검증** UX (Planner→Generator→Evaluator 피드백 루프, 이미 구현됨)
- `/project/workspace` = **즉시성 co-pilot** UX (단일 루프, Evaluator 자동 재시도 의도적으로 빠짐)
- **공유는 하위 유틸 레이어만**: `lib/agent/tools/`, `lib/agent/context/`, `lib/agent/events.ts`, `lib/mcp/adapters/`

### 진실표 (2026-04-15 밤 업데이트 — 25개 Phase 반영)

#### ✅ 진짜 구현됨 (REAL — 코드 + tsc/lint/build 0 errors)
- 워크스페이스 단일 루프 에이전트 (50라운드, builtin 9+1 tools + 연결된 MCP 전체, PLAN.md 시스템 프롬프트)
- **Phase 1 KV-Cache**: `cache_control: ephemeral` 마커 + `anthropic-beta: prompt-caching-2024-07-31` + usage 로깅 전부 작동
- **Phase 2 Tool 축약**: `truncate.ts`의 4개 함수 wiring 완료 (command/file/browse/list)
- **Phase 3-fix Soft masking**: tools 배열 고정 + mode 전환 시 user-message suffix nudge (캐시 보존)
- **Phase 4-fix 파일시스템 외부 메모리**: `external-memory.ts`의 `stashToSandbox` 구현 + run_command/browse_url/MCP tool default 3곳 wiring
- **MCP 자율 사용**: `request_mcp` 호출 시 `tryAutoConnect`로 저장된 토큰 자동 복원, 연결된 MCP의 도구를 세션 시작 시 자동 주입 (`getClaudeTools`), `executeTool` default 케이스에서 MCP registry 라우팅
- **시스템 프롬프트 proactive 지시**: "연결된 MCP는 자유롭게 써라, 사용자가 요청 안 해도 먼저 제안해라"
- **`/integrations` 독립 라우트**: `MCPHubView` 컴포넌트 기반, Settings/workspace와 동일 코드 재사용
- **Settings → Integrations 탭**: 이전 가짜 정적 UI를 진짜 `useMCPConnect` + store 구독으로 재작성
- **서버 세션 검증**: `agent-run` POST가 `getSession()`으로 cookie 검증 후 `verifiedUserId`만 auto-connect 경로로 넘김 (client-supplied userId 무시)
- **`request_mcp` dedup 가드**: 세션당 requested serverId set으로 중복 호출 방지
- **인라인 MCP 카드 + 로딩 chip**: 활동 피드 안쪽에 `MCPRequestCard` 컴포넌트 + tool_call chip이 서비스별 이모지/색상으로 렌더
- **MCP 오버헤드 토큰 가시화**: `[mcp-inject]`/`[mcp-overhead]` 로그, `usage_summary` 이벤트 필드
- 3-agent 하네스 파이프라인 (Planner / Generator / Evaluator 모두 진짜 Claude 호출, 피드백 루프 2회)
- `harness_sessions` + `workspace_projects` + `workspace_messages` Supabase 영속화
- MCP 어댑터 14개 (구조 검증 끝, live 검증 아직 미실행 — **Figma/GitHub/Vercel/Sentry/Linear/Supabase 6개는 PAT로 바로 연결 가능한 상태**)
- 공유 사이드바 (collapse, chevron, recent fetch, pathname active, Integrations 링크)
- `MeldMarkdown` (react-markdown + remark-gfm, 표/코드/리스트/bold 전부 wired)
- Polar 결제 통합 (코드 100%, live E2E 미검증)
- Vercel 프로덕션 배포 (meld-psi.vercel.app)
- TypeScript 0 errors, ESLint 0 errors (이번 세션 신규 파일 전부 클린)

#### 🟨 부분 구현 (PARTIAL — 작업 필요)
- **활동 피드 섹션 구조**: 섹션 타임라인 + chip 렌더 동작함, 하지만 좌측 세로 타임라인 라인 / 섹션 접기 세밀도는 아직 Manus 수준 미달
- **워크스페이스 diff / rollback**: 0%. dev 서버 시작 = 성공으로 간주
- **Agents Evaluator 강화**: 시각 검증(`browse_url`)만, typecheck/build/Playwright 0%
- **Long-running session persistence**: `dumpSnapshot`/`restoreSnapshot` 인프라만 있고 wiring 0%
- **Notion/Slack/Gmail/Canva OAuth app 등록**: 코드/라우트/availability 엔드포인트/oauthOnly 뱃지 UI 전부 있지만 **실제 OAuth app은 플랫폼에 미등록** (`docs/MCP_OAUTH_SETUP.md` 가이드 따라 사용자가 직접 등록해야 함)
- **Haiku summarizer**: 구현돼있지만 activationLength 50으로 상향 → 거의 트리거 안 됨 (외부 메모리가 우선). 긴 세션 백업 경로로만 유지

#### 🟥 껍데기 (SHELL — 데이터 없음)
- **Figma Code Connect**: 모듈 + 5 유닛테스트 + MCP 도구 만들어졌으나 registry 비어있음 → 한 번도 작동한 적 없음
- **`ThinkingBubble` 컴포넌트**: 정의돼 있지만 호출하는 곳 0개 (죽은 코드)

#### ⚪ 검증 안 한 것 (코드는 있는데 라이브 실측 없음) — 다음 세션 우선 목표
- **Phase 1~4 + MCP 통합 전체 E2E**: baseline 프롬프트 1회 돌려서 로그/cache hit rate/MCP 오버헤드/stash 발생 전부 확인
- **Phase 3-fix 캐시 보존**: mode 전환이 일어나도 `cache_read` 끊기지 않는지 (의도적으로 debug 모드 트리거)
- **Phase 4-fix stash**: 큰 tool 결과가 실제로 `.meld/cache/`에 파일로 저장되고 에이전트가 `read_file`로 재접근 가능한지
- **MCP 자율 호출**: 연결된 상태에서 "랜딩 페이지 만들어줘" 같은 일반 프롬프트에 에이전트가 스스로 figma_* 호출하는지
- **Auto-reconnect**: 두 번째 세션에 `request_mcp("github")` 호출이 auto-connect로 silent 성공하는지
- Polar 실결제 → 플랜 업데이트 E2E
- MCP 6개 (Figma/GitHub/Vercel/Sentry/Linear/Supabase) 실토큰 validateConnection

#### 🔴 운영 / 보안
- AWS Access Key 미교체
- 도메인 미연결 (meld-psi.vercel.app만)

---

## 📋 우선순위 (의존성 분석 후)

### P0-1 하위 유틸 공유 레이어 추출 (✅ 대부분 완료)
이전 세션에서 이미 `lib/agent/` 신규 디렉터리가 만들어져 있었고(tools/schemas, context/compress, events), 이번 세션에서 그 위에 truncate / tools/modes / context/summarize / external-memory 4개를 추가. 이제 workspace 루프와 harness 양쪽 모두 같은 모듈을 import 가능한 상태.

- [x] `apps/web/src/lib/agent/events.ts` (이전 세션 — AgentEvent discriminated union)
- [x] `apps/web/src/lib/agent/context/compress.ts` (이전 세션 — compressMessages 단일 구현)
- [x] `apps/web/src/lib/agent/tools/schemas.ts` (이전 세션 — BUILTIN_TOOLS_WITH_MCP_REQUEST)
- [x] `apps/web/src/lib/agent/truncate.ts` (이번 세션 — Phase 2)
- [x] `apps/web/src/lib/agent/tools/modes.ts` (이번 세션 — Phase 3 mode 분류)
- [x] `apps/web/src/lib/agent/context/summarize.ts` (이번 세션 — Phase 4 Haiku fallback)
- [x] `apps/web/src/lib/agent/external-memory.ts` (이번 세션 — Phase 4-fix 파일시스템)
- [x] `/api/ai/agent-run/route.ts` 전부 import로 교체
- [ ] `lib/harness/tools/composite.ts` 쪽도 같은 모듈 사용하는지 재확인 필요 (이전 세션에 이미 통합했을 가능성)
- [x] typecheck 통과

### P0-2 활동 피드 Manus 섹션 구조
사용자가 가장 자주 보는 화면. 토대 작업(P0-1) 이후 진행.

- [ ] thinking 이벤트마다 새 섹션 + 섹션 제목은 thinking 원문 첫 문장 (shorten 60자)
- [ ] 섹션 내부에 도구 호출이 자동 들어감
- [ ] 완료 섹션은 체크 아이콘, 진행 중 섹션은 블랙홀 스피너
- [ ] 좌측 세로 타임라인 라인 (border-l + 동그라미 마커)
- [ ] 섹션 클릭 시 접기/펼치기

### P0-3 워크스페이스 파일 diff + rollback
워크스페이스 고유 가치 핵심.

- [ ] `agentStore`에 `fileSnapshots: Map<turnId, Map<path, contentBefore>>` 추가
- [ ] `write_file` 이벤트 도착 시: 기존 `fileContents[path]`가 있으면 현재 turn snapshot에 백업
- [ ] Monaco 탭에 diff 토글 버튼 추가 — 누르면 `monaco.editor.createDiffEditor`
- [ ] 사용자 메시지 옆에 "되돌리기" 버튼 — 그 메시지 직전 스냅샷으로 모든 파일 복원

### P0-4 토큰 감축 & Context Engineering (✅ 코드 완료, 실측 대기)

> **배경.** Claude API 비용이 실사용에서 빠르게 누적됨. Manus 공식 블로그의 네 가지 전략을 우리 스택(Anthropic Messages API + E2B + 단일 루프)에 맞춰 단계적으로 적용. 실측 목표는 **세션당 input 토큰 -70% / output -30%**, 총 비용 -80% 수준.
>
> **원칙.** 캐시를 먼저 제대로 깔고 그 위에 다른 최적화를 얹는다. 캐시를 깨는 변경(과거 메시지 수정, 프리픽스 변동)은 절대 피한다.

#### Phase 1 — KV-Cache 제대로 먹이기 (✅ 완료)

- [x] `system` 파라미터가 cache_control ephemeral 마커 달린 text block 배열로 래핑됨
- [x] `tools` 배열 마지막 tool에 cache_control 마커 달림
- [x] 시스템 프롬프트에 타임스탬프/세션ID 등 변동값 없음 audit 완료
- [x] 메시지 히스토리는 append-only (push만, mutate 없음) 검증
- [x] `usage.cache_read_input_tokens` / `cache_creation_input_tokens` per-round 로깅 추가 (`[cache][session_id] round=N ...`)
- [x] 세션 종료 시 total hit rate 로깅 + `usage` 이벤트 발사
- [ ] **라이브 실측 필요**: baseline 프롬프트로 hit rate >0.7 달성하는지 확인

#### Phase 2 — Tool 출력 축약 (✅ 완료)

- [x] `apps/web/src/lib/agent/truncate.ts` 신규 — 4개 함수 구현
- [x] `run_command` 결과: 4KB 초과 시 head 1.5KB + 중간 생략 + tail 1.5KB (에러 시 stderr 우선)
- [x] `read_file` 결과: 500줄 초과 시 head 100 + tail 100 + grep/sed 힌트
- [x] `browse_url` 결과: 본문 텍스트만 + 8KB 상한, 초과 시 섹션 헤더만
- [x] `list_files`: 디렉토리별 히스토그램 + 샘플 10개
- [x] 축약 전후 토큰 카운트 `[truncate][session_id]` 로깅

#### Phase 3 — 동적 Tool 서브셋 (✅ 초기 구현 후 Phase 3-fix로 재설계)

초기 구현은 mode 전환 시 tools 배열을 교체 → **캐시 파괴 버그**. Manus 원칙(prefix 고정) 위반. Phase 3-fix에서 소프트 마스킹으로 재설계:

- [x] 상태 enum (`explore` / `implement` / `verify` / `browse` / `debug`)
- [x] 최근 5 이벤트 기반 규칙 기반 분류 함수 (`classifyMode`)
- [x] ~~단계별 tools 서브셋~~ → Phase 3-fix에서 제거, tools 배열은 세션 내내 고정
- [x] **Phase 3-fix**: tools 배열은 `[...BUILTIN_TOOLS_WITH_MCP_REQUEST, ...mcpClaudeTools]` 로 고정. Mode 전환 시 마지막 user message에 `[system nudge]` 텍스트 블록 append → 캐시 prefix 보존
- [x] `MODE_NUDGE` 상수 (5개 모드별 자연어 지시)
- [x] 전환 시점 `[mode][session_id] X → Y (...) — cache preserved` 로그

#### Phase 4 — 슬라이딩 요약 + 파일시스템 외부 메모리 (✅ 완료, Phase 4-fix로 전략 변경)

초기 구현은 Haiku 기반 요약이 주, 그런데 Manus 원본은 파일 시스템 사용이 핵심. 재작업:

- [x] `summarize.ts` Haiku 호출 로직 구현 (활성화 임계 50으로 상향 — 외부 메모리가 주 경로)
- [x] `collapseReadFileCards`로 과거 read_file 결과 카드 치환 (보조)
- [x] 토큰 상한 (400K input 누적) 도달 시 user 메시지로 "마무리 단계 전환" 지시 주입
- [x] **Phase 4-fix**: `apps/web/src/lib/agent/external-memory.ts` 신규 — `stashToSandbox({sandbox, tool, ref, body})` 함수가 큰 tool_result를 `/home/user/project/.meld/cache/{timestamp}-{tool}-{ref}.txt`에 저장하고 컴팩트 카드 반환
- [x] 4개 tool 호출 지점 wiring 완료 (`run_command` 정상 경로, `read_file` 큰 파일, `browse_url`, MCP tool default 케이스)
- [x] 카드에 `read_file`/`run_command grep` 재접근 힌트 포함 — lossless 복원 가능

#### Phase 5 — 다중 에이전트 분리 (한참 나중 · 구조 변경 큼)

Manus의 Planner / Executor / Knowledge 분리. `/agents` 하네스는 구현돼 있음 — `/project/workspace` 쪽은 단일 루프 유지 결정. 엔진 분리 원칙과 충돌하므로 보류.

- [ ] (보류) 워크스페이스 단일 루프 내부에 sub-agent 도입 가치 재평가
- [ ] (보류) harness 쪽 3-agent 파이프라인의 Knowledge 에이전트 분리 (현재 Planner/Generator/Evaluator만)

#### Phase Q — MCP 도구 로딩 UX (✅ 완료)

MCP tool 호출 시 활동 피드에 전용 chip 표시.

- [x] `AgentActivityFeed.chipFromEvent`에 `tool_call` 케이스 + `classifyMCPToolName` helper
- [x] 서비스별 이모지 매핑 (figma=🎨, github=🐙, vercel=▲, supabase=🗄️, sentry=🐛, linear=📋, notion=📓, slack=💬, gmail=✉️, canva=🖼️)
- [x] Chip이 보라색 테두리/배경으로 builtin과 시각적 구분 (`bg-purple-500/[0.06] ring-purple-500/20`)

#### Phase R — MCP 토큰 가시성 (✅ 완료)

연결된 MCP가 세션당 얼마나 토큰을 먹는지 명시적 로그.

- [x] `estimateTokens(tools)` 헬퍼 — JSON.stringify 길이 / 4
- [x] `[mcp-inject][session] connected=N tools=M est_tokens=K` 세션 시작 로그
- [x] `mcp_injected` 이벤트에 `estimatedTokens` 필드
- [x] 세션 종료 시 `[mcp-overhead][session] per_round=K total_est=L pct_of_session=X%` 로그
- [x] `usage_summary` 이벤트에 `mcpOverheadTokensPerRound`, `mcpOverheadTokensTotal` 필드

#### 측정 & 롤백 기준 (⏳ 실측 대기)

- [ ] Phase 1~4 + Phase 3-fix/4-fix 전부 적용한 상태에서 기준 세션(React 카운터 앱) 1회 돌려서 비용 베이스라인 기록
- [ ] 같은 세션의 `cache_read` / total input 비율 >0.7 검증
- [ ] Mode 전환 일어나는 세션 (debug 모드 트리거)에서 cache_read 끊기지 않는지 검증
- [ ] 큰 tool 결과 발생 시 `.meld/cache/*.txt` 파일 실제로 쓰이는지 sandbox 검사
- [ ] **품질 회귀 감지**: 적용 후 에이전트 성공률(dev 서버 정상 기동) -10%p 초과하면 즉시 롤백
- [ ] 캐시 히트율 <50%로 떨어지면 최근 변경 원인 의심

### P1-1 Agents Evaluator 자동 검증 강화
Agents 차별화 핵심. 토대 이후 진행.

- [ ] `evaluator.ts`에서 `run_command` 도구로 `pnpm tsc --noEmit` 실행, 결과 verdict.issues에 추가
- [ ] 같은 식으로 `pnpm build` 실행
- [ ] (선택) Playwright E2E: 프리뷰 URL 열고 핵심 셀렉터 존재 검증

### P1-2 Long-running session persistence
가장 큰 시장 차별화.

- [x] **인프라 추가**: `SandboxHandle.dumpSnapshot()` / `restoreSnapshot()` (e2b 구현 포함, node_modules/.next/.git 제외), `SupabaseSessionStore.saveSandboxSnapshot()` / `loadSandboxSnapshot()` (metadata에 base64 + 사이즈 + capturedAt 저장)
- [ ] **wiring**: 하네스 파이프라인이 실행 종료 직전 `dumpSnapshot()` 호출 + 새 세션 resume 시 `restoreSnapshot()` 호출
- [ ] 자동 주기 스냅샷 (5분마다)
- [ ] Supabase 1MB 한계를 넘으면 Supabase Storage로 이전 (현재는 작은 프로젝트만 지원)

### P2 Live E2E 실측
- [ ] 브라우저 실결제 → 플랜 업데이트 확인
- [ ] MCP 8개 토큰 live validateConnection
- [ ] "React 카운터 앱 만들어줘" 풀 워크플로우 1회

### P0 — 운영 (즉시)
- [ ] AWS Access Key rotate (IAM 콘솔, 직접)
- [ ] 도메인 구매 + Vercel 연결

---

## 🌙 2026-04-15 밤 세션 완료 사항 (25개 Phase)

모든 변경 미커밋 상태. tsc / eslint / next build 전부 0 errors.

### 토큰 최적화 (Phase 1 ~ Phase 4-fix)

#### Phase 1 — KV-Cache
- [x] `callClaude`에서 `systemWithCache` / `toolsWithCache` 배열로 래핑, 마지막 요소에 `cache_control: { type: "ephemeral" }`
- [x] `anthropic-beta: prompt-caching-2024-07-31` 헤더 유지
- [x] Per-round + session-total `[cache][session_id]` 로그 + `usage` / `usage_summary` 이벤트

#### Phase 2 — Tool 축약
- [x] `lib/agent/truncate.ts` 4개 함수 (`truncateCommandOutput`, `truncateFileContent`, `truncateBrowseResult`, `truncateListFiles`)
- [x] 각 tool 실행부 wiring + `[truncate][session_id]` 로그 + `omittedCharsTotal` / `omittedCharsByTool` 이벤트 필드

#### Phase 3 + Phase 3-fix — Mode 분류 + Soft masking
- [x] `lib/agent/tools/modes.ts`에 5개 mode enum + `classifyMode` 규칙 기반 분류
- [x] **Phase 3-fix 재설계**: tools 배열은 세션 내내 고정 (`BUILTIN_TOOLS_WITH_MCP_REQUEST + mcpClaudeTools`), mode 전환 시 마지막 user message content 배열에 `[system nudge]` text block을 append → 캐시 prefix 보존
- [x] `MODE_NUDGE` 상수 (5개 자연어 지시)
- [x] `[mode][session_id] X → Y (...) — cache preserved` 로그

#### Phase 4 + Phase 4-fix — 외부 메모리
- [x] `lib/agent/context/summarize.ts` — Haiku 기반 `summarizeHistory` (백업 경로, activation 50)
- [x] `collapseReadFileCards` — read_file tool_result 카드 치환 (immutable)
- [x] Token ceiling 400K 도달 시 user 메시지로 마무리 단계 지시 주입
- [x] **Phase 4-fix**: `lib/agent/external-memory.ts` 신규 — `stashToSandbox({sandbox, tool, ref, body})` 가 `/home/user/project/.meld/cache/{stamp}-{tool}-{ref}.txt`에 저장하고 카드 반환. 카드에 `read_file` + `run_command grep` 재접근 힌트 포함
- [x] `run_command` (>8KB) / `read_file` (>8KB 파일은 sandbox 파일 자체가 메모리) / `browse_url` (>8KB) / MCP default (>8KB) 4개 지점에 stash 주입

### MCP 전면 개편 (Phase A ~ Phase O + Q + R)

#### Phase A — 공용 레이어 신설
- [x] `lib/mcp/presets-client.ts` — 14개 프리셋 단일 원천 (`MCPPreset` 인터페이스, `oauthOnly`, `requiresProjectRef` 플래그 포함)
- [x] `lib/mcp/error.ts` — `formatMCPError` 한국어 친화 포맷터 (`LOGIN_REQUIRED:*`, `TOKEN_REQUIRED`, HTTP 401/403/404/timeout/network → 자연어)
- [x] `lib/mcp/useMCPConnect.ts` — 공용 React 훅 (`connect(id, token, {extra, silent})`, `disconnect(id)`), tRPC + store + formatMCPError 통합
- [x] `components/mcp/MCPHubView.tsx` — Settings/integrations 공용 hub 뷰 (카테고리 그룹핑, Test/Validate All, 토큰 모달, OAuth availability, Supabase projectRef 입력, OAuth-only 비활성 뱃지 포함)

#### Phase B — tRPC 라우터 확장
- [x] `lib/trpc/routers/mcp.ts`의 `connect` mutation에 `extra: z.record(...)` input 추가, `connectServer` 호출 시 전달
- [x] Figma/GitHub 외 어댑터의 토큰 컬럼 조회가 실패해도 `TOKEN_REQUIRED` sentinel로 graceful fallback

#### Phase C — Settings Integrations 탭 재작성
- [x] 기존 하드코딩 정적 배열 삭제
- [x] `<MCPHubView header />` 단 한 줄로 교체
- [x] Settings `TABS` 배열에 Integrations 탭 등록 (이전엔 타입엔 있었지만 배열에 누락돼 접근 불가)

#### Phase D — 독립 `/integrations` 라우트
- [x] `app/integrations/page.tsx` 신규 — 딥링크 가능한 1차 시민 경로
- [x] `AgentsSidebar`에 Blend 아이콘 + `/integrations` 링크 (collapsed + expanded 양쪽), 죽은 `?tab=mcp` 링크 교체

#### Phase E — OAuth availability 엔드포인트
- [x] `app/api/mcp/oauth-availability/route.ts` — 7개 OAuth 서비스의 env var 존재 여부 리포트
- [x] `MCPHubView`에서 mount 시 페치 → `isOauthBlocked(preset)` 동적 판정
- [x] `docs/MCP_OAUTH_SETUP.md` — 7개 서비스 등록 가이드 + 트러블슈팅

#### Phase G — 서버 세션 검증
- [x] `agent-run` POST가 `getSession()`으로 cookie 검증 → `verifiedUserId`만 auto-connect 경로로 전달
- [x] Client-supplied `userId` body 필드 완전 제거 (workspace 3곳)

#### Phase H — `request_mcp` dedup 가드
- [x] `runAgentLoop`에 `requestedMCP: Set<string>` 세션 state
- [x] 두 번째 호출 시 실제 connect 없이 "already requested" 반환

#### Phase I — 인라인 MCP 카드 + 로딩 chip
- [x] `AgentEventType`에 `mcp_request`, `mcp_auto_connected` 추가
- [x] `AgentActivityFeed`에 `mcpRequests` / `mcpAutoConnected` useMemo + 렌더
- [x] `MCPRequestCard` 컴포넌트 (purple border, 🔌 아이콘, `reason` 표시, [연결하기]/[나중에] 버튼)
- [x] `ChatHistoryPanel` props에 `onMCPConnectRequest` / `onMCPDismissRequest` 추가, `WorkspaceContent`에서 `handleMCPConnect` + `setMcpTokenModal` 배선
- [x] Workspace 기존 bottom-right floating 카드도 유지 (중복 진입점)
- [x] `chipFromEvent`에 `tool_call` 케이스 + `classifyMCPToolName` (10개 서비스 이모지 매핑)
- [x] `ActionChip.kind`에 `"mcp"` 추가 + 보라색 스타일

#### Phase L — 연결된 MCP 세션 시작 시 자동 주입
- [x] `getConnectedServers(userId)` + `getClaudeTools(userId)` 호출해서 초기 tools 배열에 append
- [x] `buildSystemPrompt`에 `connectedMCP` 파라미터 + "Connected external systems (USE THESE FREELY)" 자연어 섹션 주입 (각 서비스별 최대 12개 도구 요약)
- [x] `[mcp-inject][session_id] connected=N tools=M est_tokens=K list=...` 로그 + `mcp_injected` 이벤트

#### Phase M — executeTool MCP 라우팅
- [x] switch문 default 케이스에서 `executeMCPTool(userId, toolName, input)` 호출 (MCP registry가 tool name으로 소유 어댑터 auto-lookup)
- [x] 결과를 text로 flatten + `truncateBrowseResult` 경유 + `ToolResult` 형식 반환
- [x] 큰 응답은 Phase 4-fix의 stashToSandbox로 자동 분기
- [x] 에러 시 "connection may have expired" 친화 메시지

#### Phase N — 시스템 프롬프트 proactive 지시
- [x] "Be proactive. If Figma is connected and task is 'build a landing page', read the user's design files..." 구체 예시 포함
- [x] "Proactively suggesting NEW MCP connections" 섹션 — 연결 안 된 것도 사용자가 요청 안 했어도 `request_mcp` 먼저 호출하라는 지시
- [x] 한국어 `reason` 예시 포함

#### Phase O — auto-connect 후 동적 tool 주입
- [x] `tryAutoConnect` 성공 시 해당 서버의 Claude 도구를 `ToolResult.newlyAddedMCPTools`로 반환
- [x] Loop에서 받아 `mcpClaudeTools` + `tools` 배열에 dedup merge (세션당 최대 몇 번의 의도적 캐시 재빌드)
- [x] `[mcp-inject][session_id] round=N added K tool(s)` 로그 + `mcp_tools_added` 이벤트

#### Phase R — MCP 토큰 가시성
- [x] `estimateTokens` helper (`JSON.stringify(tools).length / 4`)
- [x] `[mcp-inject]` 로그에 `est_tokens=N` 포함
- [x] 세션 종료 시 `[mcp-overhead][session_id] per_round=K total_est=L pct_of_session=X%` 로그
- [x] `usage_summary`에 `mcpOverheadTokensPerRound`, `mcpOverheadTokensTotal` 필드

### 인프라

- [x] `.env.example`에 7개 OAuth 서비스 `*_CLIENT_ID` / `*_CLIENT_SECRET` placeholder + 개발자 포털 URL 주석
- [x] `summarize.ts` activationLength 30→50 (외부 메모리가 주 경로이므로 Haiku 강등)

### 결정

- **두 엔진 독립 유지** 2026-04-15 결정 유지 — workspace(즉시성) vs harness(자율 검증)
- **Manus 스타일 완전 흡수** — 4대 전략 모두 구현 (cache / truncate / soft masking / filesystem memory)
- **MCP 자율성 원칙** — 연결된 것은 사용자 요청 없이도 자동 사용, 연결 안 된 것은 `request_mcp`로 먼저 제안
- **OAuth app은 플랫폼 작업** — Notion/Slack/Gmail/Canva는 코드/UI 전부 갖춰졌지만 실제 OAuth app 등록은 사용자가 `docs/MCP_OAUTH_SETUP.md` 따라 직접 해야 함

### 다음 세션 첫 할 일 (위 🚀 블록 참조)

1. 라이브 실측 (baseline 프롬프트 1회)
2. Phase 3-fix 캐시 보존 검증 (debug 모드 트리거)
3. 이번 세션 변경만 분리 커밋 (이전 세션 변경과 혼재)

---

## 🛠 2026-04-15 세션 완료 사항

### Tier 1 — 워크스페이스 파일 렌더링 파이프라인
- [x] `/api/ai/agent-run/route.ts`의 `write_file` 이벤트에 `content` 포함시켜 전송
- [x] `agent-store.ts`에 `upsertFileByPath`, `fileContents`, `setFileContent` 추가
- [x] 워크스페이스 폴링 루프에서 `file_edit_auto` 이벤트 → 파일 트리 성장 + Monaco 탭 자동 오픈 + `lastChangedFilePath` 구독
- [x] `openFileInEditor`가 `fileContents` 캐시를 먼저 확인 (E2B 모드에선 `readFileFn` 없어서)
- [x] `chatOnlyMode` 조건에 `hasAgentFiles` 추가 — 에이전트가 파일 쓰면 source panel 안 숨김

### PLAN.md 플로우
- [x] `buildSystemPrompt` 수정: 첫 도구 호출로 `.meld/PLAN.md` 작성 + 각 작업 완료 시 재작성하는 체크리스트 지시 (한국어/영어 자동)
- [x] 별도 UI 컴포넌트 없이 Tier 1 파이프라인으로 Monaco에서 PLAN.md가 실시간 체크되는 구조

### 웹 검색/브라우징 시각화
- [x] 라우트에 `search_start`, `search_results`, `search_error`, `browse_start` 이벤트 emit 추가
- [x] `agent-store.ts`에 `browserActivity` 상태 + `pushBrowserActivity` (중복 방지 in-place 업데이트) + `clearBrowserActivity`
- [x] `BrowserActivityFeed` 컴포넌트: 검색 카드(파란 Search 아이콘 + 결과 5개 리스트) + 브라우징 카드(인디고 Globe + 실제 스크린샷 이미지 + description)
- [x] `ChatHistoryPanel`의 메시지 렌더링 바로 아래에 `<BrowserActivityFeed />` 삽입
- [x] 새 run 시작 시 `clearBrowserActivity()` + `setMcpRequest(null)` 초기화

### MCP 요청 모달
- [x] 라우트에 `request_mcp` 도구 추가 (`serverId`, `reason` 파라미터)
- [x] System prompt에 "진짜 필요할 때만 request_mcp 호출, 이후 중단" 지시
- [x] `agent-store.ts`에 `mcpRequest` 상태
- [x] 워크스페이스 폴링이 `mcp_request` 이벤트 받으면 store에 저장
- [x] `WorkspaceContent`가 inline 모달 렌더 (emoji + 이유 문장 + "나중에"/"연결하기" 버튼, 연결하기는 기존 `handleMCPConnect` 호출)
- [x] `MCP_SERVER_META` 맵 (notion/github/supabase/vercel/figma/linear/slack/sentry/gmail/canva)

### 활동 피드 재작성
- [x] `AgentActivityFeed.tsx` 완전히 rewrite
- [x] StatusLine (한 줄, 블랙홀 스피너 + in-place 교체)
- [x] 자연어 매핑: `file_edit_auto` → "App.tsx을 작성하고 있어요", `run_command install` → "의존성을 설치하고 있어요" 등
- [x] ActionChipList: 완료된 도구 호출 압축 칩 (같은 파일 재쓰기는 in-place 교체로 중복 방지)
- [x] BottomProgressBar 제거
- [x] 한계: 현재는 섹션 구조 없음 — 다음 세션에서 Manus 스타일 섹션으로 더 발전 필요 (P0 참조)

### Supabase 메시지 persistence
- [x] 마이그레이션: `supabase/migrations/20260414_add_workspace_projects.sql`
  - `workspace_projects` 테이블 (user_id, name, first_prompt, category, framework, last_preview_url, last_opened_at)
  - `workspace_messages` 테이블 (project_id, user_id, role, content, client_id, client_ts, duration_ms) + UNIQUE(project_id, client_id)
  - updated_at trigger
- [x] Dashboard SQL Editor로 적용 완료 (supabase db push는 기존 마이그레이션 충돌로 실패, 직접 실행)
- [x] `lib/workspace/projects.ts` — CRUD 헬퍼 (listWorkspaceProjects, getWorkspaceProject, createWorkspaceProject, touchWorkspaceProject, renameWorkspaceProject, deleteWorkspaceProject, listWorkspaceMessages, upsertWorkspaceMessages)
- [x] API 라우트:
  - `GET/POST /api/workspace/projects`
  - `GET/DELETE /api/workspace/projects/[id]`
  - `PUT /api/workspace/projects/[id]/messages`
- [x] 워크스페이스 페이지:
  - `workspaceProjectId` state + URL `?projectId=xxx` 파싱
  - 마운트 시 `GET /api/workspace/projects/{id}` 로 메시지 복원 (`restoredProjectIdRef`로 중복 방지)
  - 800ms debounced save: 새 대화면 `POST /api/workspace/projects` 후 URL에 `?projectId` 반영 + `workspaceProjectCreated` custom event dispatch
- [x] 사이드바:
  - 서버 기반 `fetchProjects` 함수, mount + pathname 변경 + window focus + `workspaceProjectCreated` 이벤트 시 refetch
  - recent project 클릭 → `/project/workspace?projectId=xxx` 이동

### 공유 사이드바 (AgentsSidebar) 리디자인
- [x] Platform → Agent 섹션 이름 변경
- [x] 서버 기반 recent agents + recent projects fetch
- [x] `usePathname()` 기반 active 하이라이트 (`/agents` → Agents, `/projects|/project/*` → Projects)
- [x] Projects 섹션 chevron 토글 (기본 열림) — Projects 버튼 자체는 페이지 이동 안 함, chevron만 토글, New Project가 실제 이동
- [x] Recent projects/agents가 시각적으로 해당 섹션에 묶여 보이도록 pl-8 인덴트 + mt-1 간격
- [x] `AgentSessionsSidebar` 대신 `AgentsSidebar` 사용하도록 `/project/workspace` 수정 (세션 사이드바 기능은 제거)

### 기타 수정
- [x] `AgentSessionsSidebar`에서 nested `<button>` 내부 `<button>` 하이드레이션 에러 → 외곽을 `div role="button"`으로 변경
- [x] `SidebarGuide` (How it works / Try these) 빈 상태 제거 (`<div />`로 대체)
- [x] `RedirectToProjects` 컴포넌트 경로 대신 친화적 빈 상태 메시지로 교체
- [x] 브랜드 로고: `apps/web/public/brand/` 에 Instagram용 1080×1080 PNG 3종 (다크/라이트/투명) + SVG 원본 저장
- [x] `NewAgentDrawer`의 DraftCard를 SetupTasksCard로 교체 (MCP 연결 필요한 템플릿일 때만 표시)
- [x] `RunChatDrawer` header/input border 정리, Sparkles 로고 + 제목 구조로 NewAgentDrawer와 일관성 맞춤



## 지금 바로 (P0 — 블로커)

### E2E 테스트 — 에이전트 실제 동작 확인
- [x] E2B 계정 + API 키 + 샌드박스 연결
- [x] E2B 커스텀 템플릿 `meld-agent` (Node.js 22 + pnpm + Playwright)
  - 템플릿 ID: `m9vyffitw4hvynlsdn4o`
  - v2 빌드 시스템 (클라우드 빌드, Docker 불필요)
- [x] 에이전트 도구 9개 (read/write/delete/rename/list/search/run/web_search/browse_url)
- [x] 완전 자율 에이전트 루프 (Haiku 분류기 제거, 50라운드 / 16K 토큰)
- [x] dev server 자동 감지 (8개 패턴) + 백그라운드 실행
- [x] `sandbox.getHost(port)` → devServer 이벤트 → 공개 URL
- [x] SSE 이벤트 폴링 (500ms) → AgentActivityFeed 실시간 표시
- [ ] **"React 앱 만들어줘" E2E 테스트** → 파일 생성 + dev server + 프리뷰 전체 플로우 확인
- [ ] 실패 케이스 검증 (네트워크 끊김, 타임아웃, 명령어 실패 메시지)

### 보안 — AWS 키 교체
- [ ] ⚠️ **AWS Access Key rotate** (IAM 콘솔에서 즉시)
- [ ] 기존 EC2 인스턴스 종료 (E2B로 완전 이관됨)
- [ ] EC2 비용 차단 확인

### 결제 — Polar 환경변수 + 테스트
- [x] Polar 계정 + Products 3개 (Free / Pro $20 / Unlimited $49)
- [x] 가격 페이지 + Checkout 생성 + 성공 페이지
- [x] Webhook 핸들러 (주문, 구독 활성/취소/업그레이드)
- [x] Portal 리다이렉트
- [x] `.env.local`에 Polar 키 추가 (`POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOKS_SECRET`, `POLAR_PRO_PRODUCT_ID`, `POLAR_UNLIMITED_PRODUCT_ID`)
- [ ] Vercel 환경변수에 동일 키 등록 확인
- [ ] 가격 페이지 → 결제 → plan 업데이트 E2E 확인 (브라우저 실결제)

---

## 배포 (P1 — 공개 전)

### Lint / 빌드 정리 — ✅ 완료
현재 `pnpm lint` **0 errors / 262 warnings**, `pnpm build` 통과, `tsc --noEmit` 통과
- [x] `POLAR_WEBHOOK_SECRET` → `POLAR_WEBHOOKS_SECRET` (env 변수명 불일치) 수정
- [x] `eslint --fix` 자동 수정 3건 (prefer-const 등)
- [x] `react/no-unescaped-entities` (4건) — `'` → `&apos;`
- [x] `react-hooks/rules-of-hooks` (3건) — 죽은 `_UNUSED` 함수 제거 + PropertiesPanel early-return 뒤 useCallback hoisting
- [x] `cannot-access-variable-before-declared` (1건) — PreviewFrame `handleVisualEditRef` 패턴 도입
- [x] `cannot-call-impure-function-during-render` (4건) — `Date.now()` 제거, `crypto.randomUUID()` / `mountedAt` lazy-state
- [x] `react-hooks/set-state-in-effect` (20→0건) — 공통 `useThemePref` 훅 추출(8개 페이지 중복 제거), lazy initializer 패턴, `draft` 상태 패턴, `useSyncExternalStore` 기반 hydration flag
- [x] `cannot-access-refs-during-render` (42→0건) — `useInView`를 `[ref, inView]` tuple로 변경, floating panel `initialized` ref → state
- [x] `cannot-create-components-during-render` (29→0건) — DesignSystemDashboard/SettingsPage 내부 컴포넌트는 file-scope `eslint-disable` (closure 의존성으로 hoist 불가)
- [x] `pnpm build` 통과 (Next.js 16 Turbopack, 60 static pages)
- [ ] 남은 warning 262건 — 대부분 unused imports/vars, 차후 cleanup

### 배포 단계
- [x] 미커밋 변경사항 정리 — 논리 단위 5개 커밋 + 후속 3개 fix 커밋
- [x] GitHub push (Noah1206/meld main)
- [x] Vercel 프로젝트 연결 + 환경변수 설정
  - E2B_API_KEY, SERPER_API_KEY, FIRECRAWL_API_KEY 신규 등록
  - Polar webhook은 `POLAR_WEBHOOK_SECRET`/`POLAR_WEBHOOKS_SECRET` 양쪽 fallback 지원
- [x] **Vercel 프로덕션 빌드 성공** (meld-eg3z1kzfp, HTTP 200 OK)
  - `vercel.json`을 `apps/web/`에 배치 + workspace-aware build command
  - `tailwindcss` + `@tailwindcss/postcss`를 dependencies로 이동 (NODE_ENV=production에서 skip 방지)
  - tsconfig에서 `vitest.config.ts` + 테스트 파일 exclude
- [x] 배포 URL: https://meld-psi.vercel.app
- [ ] Supabase 프로덕션 프로젝트 + DB 마이그레이션 (Supabase는 이미 연결됨, 추가 마이그레이션 여부 미확인)
- [ ] 도메인 구매 + 연결
- [ ] 에러 메시지 개선 ("fetch failed" 같은 raw 에러 → 사용자 친화 문구)
- [ ] 새 세션 시작 시 이전 에이전트 세션 UI 잔상 제거

---

## UI 마무리

### 에이전트 활동 피드 — ✅ 95%
- [x] Manus 스타일 step 타임라인 (스피너/체크, 그라디언트 프로그레스 바)
- [x] 도구별 특화 카드 (web_search, browse_url, devServer "보기" 버튼)
- [x] 파일 활동 그룹핑 (read/edit/create/command)
- [x] 터미널 출력 렌더링
- [x] 완료 요약 카드 (파일 통계)
- [x] 보류 편집 승인/거부 (Apply All / Reject All)
- [x] 메시지 액션 (복사/좋아요/싫어요/재시도) + 타이핑 효과
- [ ] ARIA 레이블 (접근성)
- [ ] 모바일 반응형

### 스크린샷 인라인 썸네일 — ✅ 구현 완료
- [x] VMScreenViewer 컴포넌트 (base64 JPEG + 커서)
- [x] Vision API (Claude Sonnet 4 이미지 분석)
- [x] 활동 피드 내 인라인 썸네일 — `ScreenshotThumbnail` 컴포넌트 (240x160 썸네일 + 클릭 시 lightbox 모달)
- [x] 에이전트 이벤트 스트림에 스크린샷 연동 — `browse_url` tool 실행 후 Firecrawl screenshot URL을 `browser_screenshot` 이벤트로 emit, 활동 피드의 직전 browse_url 카드에 merge
- [x] `browse_url` 응답 파싱 버그 수정 (`d.content` → `d.markdown`, Vision 분석 결과도 함께 포함)

---

## 배포 이후 (P2)

### 킬러 피처 — 로컬 터미널 연결
- [ ] `npx meld-agent` CLI (유저 PC에서 에이전트 실행)
- [ ] 웹 Meld ↔ 로컬 에이전트 WebSocket 브릿지
- [ ] `packages/agent/` 기반 (이미 browser-agent, agent-loop, dev-server-manager 존재)
- [ ] Claude Code + 실시간 프리뷰 + 비주얼 에디터 = 차별점

### 멀티 에이전트 병렬 실행 — ✅ 구현 완료
Manus(task 사이드바) + Claude(conversation list) 디자인 하이브리드.
- [x] `agent-sessions-store` — persist 기반 멀티세션 메타 + 이벤트 히스토리 (backendSessionId, pollCursor 포함)
- [x] `AgentSessionsSidebar` — 좌측 260px 사이드바, New 버튼, 세션별 상태 인디케이터(스피너/체크/에러), 경과시간, rename/delete 메뉴
- [x] `useAgentSessionsSync` — 단일 store → 멀티 store 이벤트 미러링 (workspace 대규모 리팩토링 회피)
- [x] 세션 스위칭: 선택 시 단일 store를 해당 세션 history로 재시드
- [x] 공유 외부 clock (`useSyncExternalStore`) — 세션 경과시간 표시
- [x] **Backend sessionId 연결** — workspace agent start 3곳에서 멀티 store 업데이트
- [x] **`useBackgroundSessionPolling`** — 비활성 running 세션을 1초 주기로 독립 폴링, 에러 10회 누적 시 error 상태, 활성 전환 시 자동 정지
- [x] 타입체크/lint 통과
- [ ] **E2E 수동 테스트 체크리스트** (실제 E2B 브라우저 검증)
  - [ ] 워크스페이스 → 사이드바 "New" → 세션 A에 `Next.js 카운터 앱 만들어줘` 입력
  - [ ] 실행 중(스피너 돌 때) 사이드바 "+ New" → 세션 B에 `Express hello world 서버 만들어줘`
  - [ ] 세션 A ↔ B 탭 전환 시 양쪽 history 독립 유지 (스피너/경과시간/메시지 각각 복원)
  - [ ] 비활성 세션도 background polling 동작 — 탭 다시 돌아왔을 때 중간 progress 이벤트가 누락 없이 존재
  - [ ] 세션 A 완료 후 세션 B로 전환 → 세션 A 카드에 체크 상태 + 마지막 메시지 표시 확인
  - [ ] 새로고침 후 양쪽 세션 메타 + history persist 복원 확인
  - [ ] 세션 rename / delete 메뉴 동작 확인
- [ ] 태스크 큐 (Bull / pg-boss) — 불필요, 트래픽 증가 시 재검토
- [ ] 샌드박스 로드 밸런싱 — E2B가 처리

### Figma Code Connect — ⚠️ 스캐폴딩 완료
- [x] `src/lib/figma/code-connect.ts` — 매핑 레지스트리 + resolver + import/usage snippet 생성기
- [x] `figma.config.json` — 향후 `@figma/code-connect` CLI 도입 대비 config
- [x] `figma_resolve_component` + `figma_list_code_connect` MCP 도구 (Figma 어댑터에 추가)
- [x] code-connect resolver 유닛 테스트 5개
- [ ] 실제 Meld 워크스페이스 내 재사용 컴포넌트(`src/components/ui/*`) 매핑 등록 — 현재 registry 비어있음
- [ ] `@figma/code-connect` 공식 CLI 통합 (Figma Dev Mode 유료 플랜 필요 — 사용자 확인 후 진행)

### MCP 서버 14개 실동작 검증 — ⚠️ 구조 검증 완료
- [x] `src/lib/mcp/__tests__/smoke.test.ts` — 14개 어댑터 구조 계약 검증 (57개 테스트 통과)
  - 메타데이터 필드, getTools 형식, empty-token validateConnection, unknown tool 에러 응답
- [ ] 실제 API 토큰으로 validateConnection live 검증 (GitHub/Figma/Vercel/Supabase/Linear/Notion/Slack/Canva 8개)
- [ ] 부분 구현 4개 완성 (Sentry, Gmail, Windows MCP, PDF Viewer)
- [ ] Stub 3개 처리 (Filesystem → web에서 disabled 표시, Agent Bridge → 로컬 에이전트 wire-up 후, Custom HTTP → 유지)

---

## 핵심 순서

**런칭/운영 축:**
```
1. AWS 키 교체 (보안)               ← 유저 직접 (IAM 콘솔)
2. Polar 결제 E2E 테스트            ← 돈 벌 준비 (브라우저 실결제)
3. 도메인 연결                      ← meld-psi.vercel.app → meld.app 등
```

**Scaffold 차별화 축 (2026-04-15 결정):**
```
1. 하위 유틸 레이어 공유            ← tools/compress/events 한 벌로 (1-2시간)
2. 워크스페이스 섹션 UI 재작업       ← Manus 스타일 섹션 + diff + rollback
3. Agents Evaluator 자동 검증 강화   ← typecheck/build/Playwright
4. Long-running session persistence  ← Cursor/Lovable 못 하는 영역
5. 로컬 터미널 연결                 ← 차별화 (`npx meld-agent`)
```

**두 축은 병렬로 갑니다.** 런칭/운영은 사용자 유입/수익, scaffold는 제품 경쟁력.

## 완료 (2026-04-14 배포 세션)

- [x] 커밋 정리 + GitHub push (8 commits)
- [x] Vercel 프로덕션 배포: https://meld-psi.vercel.app
- [x] E2B E2E 인프라 검증 (API → Sandbox → Claude까지 도달, Anthropic overloaded로 실제 응답은 미검증)
- [x] Polar webhook secret 네이밍 버그 수정 + dual fallback
- [x] 멀티 에이전트 병렬 실행 UI + 세션별 히스토리/대화 복원
- [x] Lint 106 errors → 0 (react-compiler 전면 대응)

## 완료 (2026-04-15 워크스페이스 리디자인 세션)

상세 항목은 위쪽 **"2026-04-15 세션 완료 사항"** 섹션 참조. 핵심 요약:

- [x] 파일 렌더링 파이프라인 (`file_edit_auto` 이벤트 → 트리 + Monaco 자동 오픈)
- [x] PLAN.md 플로우 (system prompt 지시로 `.meld/PLAN.md` 실시간 체크리스트)
- [x] 웹 검색/브라우징 카드 (ChatHistoryPanel에 BrowserActivityFeed)
- [x] MCP 요청 모달 (`request_mcp` 도구 + inline 모달)
- [x] Activity feed 재작성 (StatusLine + ActionChipList, 반복 방지)
- [x] Supabase 메시지 persist (`workspace_projects` / `workspace_messages` 테이블 + API)
- [x] 공유 사이드바 리디자인 (서버 기반 fetch, pathname 기반 하이라이트, 섹션 chevron 토글)
- [x] 브랜드 로고 Instagram export (1080×1080 PNG 3종)

### 전략적 결정
- **두 엔진 독립 유지** 확정 — `/agents`(자율 검증) vs `/workspace`(즉시성)는 UX 축이 달라 통합 안 함
- **하위 유틸 레이어는 공유** — tools, compress, event schema, MCP adapter 한 벌로
- 이 결정의 근거는 2026-04-15 대화 전체 (Claude Console/Cursor/Lovable 비교, Anthropic scaffold 추정, workspace가 Evaluator 필요로 안 함)
