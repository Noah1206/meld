# MCP OAuth Setup Guide

Meld의 MCP 어댑터 14개 중 **OAuth2를 쓰는 7개 서비스**는 각 플랫폼에서 OAuth 앱을
먼저 등록해야 사용자가 연결할 수 있습니다. 이 문서는 각 서비스별 등록 절차와
환경변수 설정 방법을 단계별로 안내합니다.

## 빠른 참조

| 서비스 | 개발자 포털 | Redirect URI |
|---|---|---|
| Vercel | https://vercel.com/account/applications | `${APP_URL}/api/auth/mcp?service=vercel` |
| Linear | https://linear.app/settings/api/applications/new | `${APP_URL}/api/auth/mcp?service=linear` |
| Notion | https://www.notion.so/my-integrations | `${APP_URL}/api/auth/mcp?service=notion` |
| Slack | https://api.slack.com/apps | `${APP_URL}/api/auth/mcp?service=slack` |
| Sentry | https://sentry.io/settings/account/api/applications/ | `${APP_URL}/api/auth/mcp?service=sentry` |
| Google (Gmail) | https://console.cloud.google.com/apis/credentials | `${APP_URL}/api/auth/mcp?service=gmail` |
| Canva | https://www.canva.com/developers/apps | `${APP_URL}/api/auth/mcp?service=canva` |

`${APP_URL}` = `https://meld-psi.vercel.app` (프로덕션) 또는 `http://localhost:9090` (로컬)

## 일반 절차 (모든 서비스 공통)

1. **각 서비스의 개발자 포털에 로그인** — Meld를 운영할 조직 계정 권장
2. **"Create New Application / Integration / App"** 클릭
3. 앱 이름: `Meld` (또는 원하는 이름)
4. Redirect URI 등록:
   - 로컬 개발용: `http://localhost:9090/api/auth/mcp?service=<서비스>`
   - 프로덕션용: `https://meld-psi.vercel.app/api/auth/mcp?service=<서비스>`
   - 두 개 다 등록해두면 환경 구분 없이 동작
5. 앱 생성 후 **Client ID**와 **Client Secret**을 복사
6. `.env.local`(로컬) 또는 Vercel 환경변수(프로덕션)에 아래 형식으로 저장:
   ```
   <SERVICE>_CLIENT_ID=복사한_client_id
   <SERVICE>_CLIENT_SECRET=복사한_client_secret
   ```
7. Meld 서버 재시작(로컬) 또는 재배포(Vercel)
8. `/integrations` 페이지를 새로고침 — 해당 서비스의 "OAuth 앱 필요" 뱃지가 사라지고
   Connect 버튼이 활성화됨. 사용자는 Connect 한 번만 누르면 동의 화면 → 자동 연결

## 서비스별 세부 절차

### Vercel

1. https://vercel.com/account/applications 접속
2. **Create Application** 클릭
3. Name: `Meld`
4. Redirect URIs 추가:
   - `https://meld-psi.vercel.app/api/auth/mcp?service=vercel`
   - `http://localhost:9090/api/auth/mcp?service=vercel`
5. Scope: `read` (기본)
6. 저장 → Client ID / Client Secret 복사
7. 환경변수 설정:
   ```bash
   VERCEL_CLIENT_ID=xxxx
   VERCEL_CLIENT_SECRET=xxxx
   ```

### Linear

1. https://linear.app/settings/api/applications/new 접속 (워크스페이스 admin 권한 필요)
2. Name: `Meld`
3. Developer URL: `https://meld-psi.vercel.app`
4. Callback URL: `https://meld-psi.vercel.app/api/auth/mcp?service=linear` (로컬도 추가)
5. Scope: `read`, `write`, `issues:create` (필요한 것만 선택)
6. Save → Client ID / Secret 복사
7. 환경변수:
   ```bash
   LINEAR_CLIENT_ID=xxxx
   LINEAR_CLIENT_SECRET=xxxx
   ```

### Notion

1. https://www.notion.so/my-integrations 접속
2. **New integration** 클릭
3. Type: **Public integration** (중요: Internal은 OAuth 플로우 미지원)
4. Name: `Meld`, Logo 업로드 (공개 integration에 필수)
5. OAuth Domain & URIs:
   - Redirect URI: `https://meld-psi.vercel.app/api/auth/mcp?service=notion`
   - 개발용으로 localhost도 추가
6. Capabilities: Read content, Read comments, Read user information
7. Submit → OAuth client ID / secret 복사
8. 환경변수:
   ```bash
   NOTION_CLIENT_ID=xxxx
   NOTION_CLIENT_SECRET=xxxx
   ```

**주의**: Notion Public Integration은 Meld 조직 계정으로 등록해야 합니다.
Personal Integration (Internal)은 OAuth 플로우를 지원하지 않습니다.

### Slack

1. https://api.slack.com/apps 접속 → **Create New App** → **From scratch**
2. App Name: `Meld`, 워크스페이스 선택 (나중에 다른 워크스페이스에도 배포 가능)
3. 좌측 메뉴 **OAuth & Permissions**:
   - Redirect URLs 추가:
     - `https://meld-psi.vercel.app/api/auth/mcp?service=slack`
     - `http://localhost:9090/api/auth/mcp?service=slack`
   - User Token Scopes: `channels:read`, `chat:write`, `search:read`
4. 좌측 **Basic Information** → **App Credentials** → Client ID / Client Secret 복사
5. 환경변수:
   ```bash
   SLACK_CLIENT_ID=xxxx
   SLACK_CLIENT_SECRET=xxxx
   ```

### Sentry

1. https://sentry.io/settings/account/api/applications/ 접속
2. **Create New Application** 클릭
3. Name: `Meld`
4. Homepage URL: `https://meld-psi.vercel.app`
5. Authorized Redirect URIs:
   - `https://meld-psi.vercel.app/api/auth/mcp?service=sentry`
   - `http://localhost:9090/api/auth/mcp?service=sentry`
6. Scope: `org:read`, `project:read`, `event:read`
7. Save → Client ID / Client Secret 복사
8. 환경변수:
   ```bash
   SENTRY_CLIENT_ID=xxxx
   SENTRY_CLIENT_SECRET=xxxx
   ```

### Google (Gmail)

Google OAuth는 다른 플랫폼보다 절차가 복잡합니다.

1. https://console.cloud.google.com 접속 → 프로젝트 생성 또는 선택
2. **APIs & Services** → **Library** → "Gmail API" 검색 → **Enable**
3. **APIs & Services** → **OAuth consent screen**:
   - User Type: External
   - App name: `Meld`
   - Scopes 추가: `https://www.googleapis.com/auth/gmail.readonly`,
     `https://www.googleapis.com/auth/gmail.send`
   - Test users: 본인 이메일 (프로덕션 전환 전까지 등록된 계정만 사용 가능)
4. **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Meld`
   - Authorized redirect URIs:
     - `https://meld-psi.vercel.app/api/auth/mcp?service=gmail`
     - `http://localhost:9090/api/auth/mcp?service=gmail`
5. Create → Client ID / Client Secret 복사
6. 환경변수:
   ```bash
   GOOGLE_CLIENT_ID=xxxx
   GOOGLE_CLIENT_SECRET=xxxx
   ```

**주의**: App을 프로덕션으로 전환(Publishing status → In production)하려면
Google 검증(verification)이 필요합니다. 검증 전까진 OAuth consent screen에
등록된 test user 계정만 연결 가능합니다.

### Canva

1. https://www.canva.com/developers/apps 접속
2. **Create an app** 클릭
3. App name: `Meld`
4. Authentication → OAuth 2.0 설정:
   - Redirect URLs:
     - `https://meld-psi.vercel.app/api/auth/mcp?service=canva`
     - `http://localhost:9090/api/auth/mcp?service=canva`
   - Scopes: `design:content:read`, `design:meta:read`, `asset:read`,
     `brand:read`, `folder:read`
5. Save → Client ID / Client Secret 복사
6. 환경변수:
   ```bash
   CANVA_CLIENT_ID=xxxx
   CANVA_CLIENT_SECRET=xxxx
   ```

## Vercel 환경변수 설정

1. https://vercel.com/dashboard → Meld 프로젝트 → **Settings** → **Environment Variables**
2. 위 7개 서비스의 `*_CLIENT_ID` / `*_CLIENT_SECRET` 쌍을 모두 추가
3. Environment: **Production**, **Preview**, **Development** 모두 체크
4. Save → **Deployments**에서 최신 배포 **Redeploy** (기존 빌드에는 새 환경변수 미적용)

## 동작 확인

환경변수 설정 완료 후:

1. `/integrations` 페이지 접속
2. 해당 서비스 카드 확인:
   - **"OAuth 앱 필요" 뱃지가 사라졌는지** 확인
   - **Connect 버튼이 활성화**되었는지 확인
3. Connect 클릭 → 해당 서비스 동의 화면으로 리디렉션 → 승인 → `/integrations`로 복귀
4. **Connected** 뱃지 + 도구 수 표시되면 성공
5. **Test** 버튼으로 재검증 가능

## 트러블슈팅

### "OAuth 앱 필요" 뱃지가 그대로 남아있음
- `/api/mcp/oauth-availability` 엔드포인트에 직접 접속해보세요. 응답의 `availability`
  객체에서 해당 서비스가 `true`로 나와야 합니다.
- `false`라면 환경변수가 서버에 반영되지 않은 것. Vercel 재배포 또는 로컬 서버 재시작.

### 동의 화면은 뜨는데 Redirect URI mismatch 에러
- 개발자 포털의 Redirect URI가 정확한지 확인. 특히 trailing slash, `http` vs `https`,
  port 번호(9090).
- 로컬 개발 중이면 `NEXT_PUBLIC_APP_URL=http://localhost:9090`이 `.env.local`에 있는지 확인.

### "Invalid client" 에러
- Client ID / Client Secret 복사 과정에서 오타/공백 발생했을 가능성. 개발자 포털에서
  다시 복사해 재설정.

### 동의 후 "Failed to save token" 에러
- Supabase `users` 테이블에 해당 서비스의 `*_access_token` 컬럼이 없을 수 있음.
- `supabase/migrations/005_add_mcp_oauth_tokens.sql`을 실행했는지 확인.

## 관련 파일

- `apps/web/src/app/api/auth/mcp/route.ts` — 범용 OAuth start + callback 핸들러
- `apps/web/src/app/api/mcp/oauth-availability/route.ts` — 프리셋이 활성인지 리포트
- `apps/web/src/lib/mcp/presets-client.ts` — 프리셋 목록과 `oauthOnly` 플래그
- `apps/web/src/components/mcp/MCPHubView.tsx` — 연결 UI
- `.env.example` — 환경변수 템플릿
