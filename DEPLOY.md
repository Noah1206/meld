# Meld AI 배포 가이드

## 사전 준비

- [ ] Vercel 계정 + CLI (`npm i -g vercel`)
- [ ] Supabase 프로덕션 프로젝트 생성
- [ ] 도메인 (선택)
- [ ] GitHub 레포 연결

## 1. Vercel 프로젝트 생성

```bash
# 프로젝트 루트에서
vercel login
vercel link           # 기존 프로젝트에 연결
# 또는
vercel                # 첫 배포 (대화형)
```

### 모노레포 설정
`vercel.json`이 루트에 있어 자동 감지되지만, Vercel 대시보드에서 수동 확인:

- **Root Directory**: `./` (루트 — `vercel.json`을 읽어야 함)
- **Framework Preset**: Next.js
- **Build Command**: `pnpm --filter web build` (vercel.json에 정의됨)
- **Install Command**: `pnpm install --frozen-lockfile=false`
- **Output Directory**: `apps/web/.next`
- **Node Version**: 22.x

## 2. 환경변수 (Vercel → Settings → Environment Variables)

### 필수

| 키 | 설명 | 예시 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API 키 | `sk-ant-...` |
| `E2B_API_KEY` | E2B 샌드박스 API | `e2b_...` |
| `SUPABASE_URL` | 프로덕션 프로젝트 URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | 익명 키 | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 롤 (server-only) | `eyJ...` |
| `GITHUB_CLIENT_ID` | OAuth 앱 ID | - |
| `GITHUB_CLIENT_SECRET` | OAuth 시크릿 | - |
| `GITHUB_REDIRECT_URI` | 콜백 URL | `https://meld.app/api/auth/github/callback` |

### 결제 (Polar)

| 키 | 비고 |
|---|---|
| `POLAR_ACCESS_TOKEN` | |
| `POLAR_WEBHOOKS_SECRET` | ⚠️ **복수형**. `POLAR_WEBHOOK_SECRET`(단수) 아님 |
| `POLAR_STARTER_PRODUCT_ID` | Free 플랜 |
| `POLAR_PRO_PRODUCT_ID` | Pro $20 |
| `POLAR_UNLIMITED_PRODUCT_ID` | Unlimited $49 |

### 검색/브라우징

| 키 |
|---|
| `SERPER_API_KEY` |
| `FIRECRAWL_API_KEY` |

## 3. Supabase 설정

### DB 마이그레이션
```bash
supabase login
supabase link --project-ref <프로젝트ref>
supabase db push
```

### GitHub OAuth
1. Supabase Dashboard → Authentication → Providers → GitHub 활성화
2. Client ID/Secret 등록
3. Redirect URL 추가: `https://<프로젝트>.supabase.co/auth/v1/callback`

## 4. Polar 웹훅 등록

1. Polar Dashboard → Developers → Webhooks → Add Endpoint
2. URL: `https://<도메인>/api/webhook/polar`
3. Secret 생성 → `POLAR_WEBHOOKS_SECRET`에 복사
4. 이벤트 선택: `order.created`, `subscription.active`, `subscription.canceled`, `subscription.updated`

## 5. 첫 배포

```bash
vercel --prod
```

## 6. 도메인 연결 (선택)

```bash
vercel domains add meld.app
```
또는 대시보드에서 도메인 등록 → DNS CNAME `cname.vercel-dns.com`

## 7. 배포 후 검증

- [ ] `/` 랜딩 페이지 로드
- [ ] `/pricing` 가격 페이지 + 플랜 정보 표시
- [ ] GitHub 로그인 → 콜백 동작
- [ ] `/projects` → `/project/workspace` 진입
- [ ] 워크스페이스에서 "React 앱 만들어줘" → E2B 샌드박스 생성 → 활동 피드 스트리밍
- [ ] Polar 결제 (테스트 모드) → webhook 수신 → plan 업데이트 확인

## 롤백

```bash
vercel rollback         # 직전 배포로
vercel rollback <url>   # 특정 배포로
```

## 문제 해결

- **Build 실패 "pnpm-lock.yaml out of sync"**: 루트에서 `pnpm install` 후 lock 커밋
- **`react-compiler` lint 에러**: 이미 0건이지만 규칙이 추가되면 `eslint-disable` 로 대응
- **Anthropic "overloaded"**: 런타임 에러 정상. 사용자에게 재시도 안내 표시됨
- **E2B 샌드박스 타임아웃**: 30분. 초과 시 자동 정리. 긴 작업은 dev server 백그라운드 실행으로 해결
