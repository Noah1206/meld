# CLAUDE.md

## Project: FigmaCodeBridge
Figma + AI 코드 수정 플랫폼. 디자인 → 기존 코드 수정 (Figma Make와 차별화).
Plugin 없이 Figma REST API 사용 + 로컬 에이전트로 내 프로젝트 직접 수정.

## Core Flows
1. **Cloud Mode**: Figma URL → 뷰어에서 엘리먼트 클릭 → AI 코드 수정 → GitHub 푸시
2. **Local Mode**: `npx figma-code-bridge` → WebSocket 연결 → 파일 선택 → AI 수정 → 로컬 반영

## 4대 핵심 목표
1. **디자인-코드 매핑 자동화** — Figma 엘리먼트 → 내 코드 어디인지 AI 자동 매칭
2. **실시간 프리뷰 루프** — 코드 수정 → dev server hot reload → iframe 확인
3. **프레임워크 인식 코드 생성** — React/Vue/Angular 등 기존 패턴 따라 수정
4. **디자인 변경 추적** — Figma 변경 감지 → "코드 업데이트할까?" 알림

## Tech Stack
- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- tRPC v11, Zustand, React Query
- Supabase (Postgres + Auth), Anthropic API (Sonnet 4.6), GitHub API (Octokit)
- WebSocket (ws) + chokidar + commander (로컬 에이전트)
- Deploy: Vercel (웹앱) + npx (에이전트)

## Commands
- `pnpm dev` — 개발 서버
- `pnpm build` — 프로덕션 빌드
- `pnpm lint` — ESLint
- `pnpm db:migrate` — Supabase 마이그레이션
- `npx figma-code-bridge` — 로컬 에이전트 실행

## Structure
- `apps/web/` — Next.js 메인 앱
- `apps/web/components/figma-viewer/` — Figma 비주얼 뷰어 (이미지 + 클릭 오버레이)
- `apps/web/components/workspace/` — LocalPanel, FileTreeBrowser, PreviewFrame
- `apps/web/components/chat/` — AI 채팅 입력 (glassmorphism)
- `apps/web/components/diff-viewer/` — 코드 diff 미리보기
- `apps/web/lib/figma/` — Figma REST API 클라이언트 (OAuth Bearer 토큰)
- `apps/web/lib/anthropic/` — Claude API 클라이언트
- `apps/web/lib/github/` — GitHub API (Octokit)
- `apps/web/lib/mapping/` — Figma node → code file 매핑 엔진 (연결 필요)
- `apps/web/lib/hooks/` — useAgentConnection (WebSocket 클라이언트)
- `apps/web/lib/store/` — Zustand stores (auth, figma, chat, agent)
- `packages/agent/` — 로컬 에이전트 CLI (WebSocket 서버 + 파일 감시)
- `packages/shared/` — 공유 타입, 상수, WebSocket 프로토콜

## Key Design Decisions
- NO Figma Plugin. Figma REST API로 노드 트리 + 이미지를 가져와서 웹앱에서 렌더링.
- 비주얼 뷰어: 프레임 PNG 이미지 위에 투명 클릭 오버레이로 엘리먼트 선택 구현.
- 좌표 변환: `relativeX = node.absoluteBoundingBox.x - frame.absoluteBoundingBox.x`
- 매핑: 네이밍 컨벤션 매칭 → AI 추론 → 캐시. 3단계 폴백.
- AI 응답: JSON만 반환 `{ filePath, original, modified, explanation }`
- 로컬 모드: WebSocket으로 에이전트 ↔ 웹앱 통신, Zustand store로 브릿지
- Figma OAuth: `Authorization: Bearer` 헤더 + 자동 토큰 갱신

## Code Style
- 한국어 주석 허용 (유저가 한국인)
- 컴포넌트: 함수형 + hooks
- 에러 핸들링: try-catch + toast 알림
- 타입: strict mode, no any
