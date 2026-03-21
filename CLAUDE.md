# CLAUDE.md

## Project: FigmaCodeBridge
Figma + Claude Code 통합 플랫폼. Plugin 없이 Figma REST API만 사용.

## Core Flow
URL 붙여넣기 → Figma 뷰어에서 엘리먼트 클릭 → 채팅 명령 → AI 코드 수정 → GitHub 푸시

## Tech Stack
- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- tRPC v11, Zustand, React Query
- Supabase (Postgres + Auth), Anthropic API (Sonnet 4.6), GitHub API (Octokit)
- Deploy: Vercel only (no separate servers)

## Commands
- `pnpm dev` — 개발 서버
- `pnpm build` — 프로덕션 빌드
- `pnpm lint` — ESLint
- `pnpm db:migrate` — Supabase 마이그레이션

## Structure
- `apps/web/` — Next.js 메인 앱
- `apps/web/components/figma-viewer/` — Figma 비주얼 뷰어 (이미지 + 클릭 오버레이)
- `apps/web/components/chat/` — AI 채팅 입력
- `apps/web/components/diff-viewer/` — 코드 diff 미리보기
- `apps/web/lib/figma/` — Figma REST API 클라이언트
- `apps/web/lib/anthropic/` — Claude API 클라이언트
- `apps/web/lib/github/` — GitHub API (Octokit)
- `apps/web/lib/mapping/` — Figma node → code file 매핑 엔진
- `packages/shared/` — 공유 타입, 상수

## Key Design Decisions
- NO Figma Plugin. Figma REST API로 노드 트리 + 이미지를 가져와서 웹앱에서 렌더링.
- 비주얼 뷰어: 프레임 PNG 이미지 위에 투명 클릭 오버레이로 엘리먼트 선택 구현.
- 좌표 변환: `relativeX = node.absoluteBoundingBox.x - frame.absoluteBoundingBox.x`
- 매핑: 네이밍 컨벤션 매칭 → AI 추론 → 캐시. 3단계 폴백.
- AI 응답: JSON만 반환 `{ filePath, original, modified, explanation }`

## Code Style
- 한국어 주석 허용 (유저가 한국인)
- 컴포넌트: 함수형 + hooks
- 에러 핸들링: try-catch + toast 알림
- 타입: strict mode, no any
