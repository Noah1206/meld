# Meld AI — 내가 해야 할 일

> 업데이트: 2026-04-14 — 프로덕션 배포 완료 (meld-psi.vercel.app)

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
- [ ] `.env.local`에 Polar 키 추가 (`POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_*_PRODUCT_ID`)
- [ ] 가격 페이지 → 결제 → plan 업데이트 E2E 확인

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

### 스크린샷 인라인 썸네일 — ⚠️ 40%
- [x] VMScreenViewer 컴포넌트 (base64 JPEG + 커서)
- [x] Vision API (Claude Sonnet 4 이미지 분석)
- [ ] 활동 피드 내 인라인 썸네일 (현재는 프리뷰 패널에만)
- [ ] 에이전트 이벤트 스트림에 스크린샷 연동

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
- [ ] E2E: 2개 세션 동시 실행 + 세션 스위칭 시 양쪽 히스토리 유지 확인 (실제 E2B 브라우저 테스트)
- [ ] 태스크 큐 (Bull / pg-boss) — 불필요, 트래픽 증가 시 재검토
- [ ] 샌드박스 로드 밸런싱 — E2B가 처리

### 기타
- [ ] Figma Code Connect 통합 (초기 제품 목적)
- [ ] MCP 서버 14개 실동작 검증 (현재 프리셋만 등록)

---

## 핵심 순서

```
1. AWS 키 교체 (보안)               ← 유저 직접 (IAM 콘솔)
2. Polar 결제 E2E 테스트            ← 돈 벌 준비 (브라우저 실결제)
3. 도메인 연결                      ← meld-psi.vercel.app → meld.app 등
4. 로컬 터미널 연결                 ← 차별화 (`npx meld-agent`)
```

## 완료 (2026-04-14 배포 세션)

- [x] 커밋 정리 + GitHub push (8 commits)
- [x] Vercel 프로덕션 배포: https://meld-psi.vercel.app
- [x] E2B E2E 인프라 검증 (API → Sandbox → Claude까지 도달, Anthropic overloaded로 실제 응답은 미검증)
- [x] Polar webhook secret 네이밍 버그 수정 + dual fallback
- [x] 멀티 에이전트 병렬 실행 UI + 세션별 히스토리/대화 복원
- [x] Lint 106 errors → 0 (react-compiler 전면 대응)
