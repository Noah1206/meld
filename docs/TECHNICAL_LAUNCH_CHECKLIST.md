# Meld Technical Launch Checklist

## Critical Blockers (P0) - D-7까지 필수

### 1. Local Agent Connection Fix
**현재 상태**: 🔴 TODO 마커 있음
**파일**: `apps/web/src/app/api/agent-bridge/route.ts`

```typescript
// 현재 코드 (수정 필요)
hasLocalAgent: false  // TODO: Replace with actual connection check
```

**수정 방향**:
```typescript
// WebSocket 연결 상태 확인 로직 추가
const checkAgentConnection = async () => {
  try {
    const ws = new WebSocket('ws://localhost:9999');
    return new Promise((resolve) => {
      ws.onopen = () => { ws.close(); resolve(true); };
      ws.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
  } catch {
    return false;
  }
};
```

**예상 소요 시간**: 2시간

---

### 2. Payment System Integration
**현재 상태**: 🔴 스캐폴딩만 완료
**파일들**:
- `apps/web/src/app/api/checkout/route.ts`
- `apps/web/src/app/api/portal/route.ts`
- `apps/web/src/app/api/webhooks/polar/route.ts`

**필요 작업**:
```yaml
checkout:
  - [ ] Polar SDK 초기화
  - [ ] 상품 ID 환경변수 설정 (POLAR_PRODUCT_PRO, POLAR_PRODUCT_TEAM)
  - [ ] Checkout 세션 생성 로직
  - [ ] 성공/실패 리다이렉트 처리

webhook:
  - [ ] Polar 시그니처 검증
  - [ ] subscription.created 이벤트 처리
  - [ ] subscription.updated 이벤트 처리
  - [ ] subscription.cancelled 이벤트 처리
  - [ ] Supabase subscription 테이블 업데이트

portal:
  - [ ] 구독 관리 포털 URL 생성
  - [ ] 사용자 구독 상태 조회
```

**환경변수 추가 필요**:
```env
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_PRODUCT_PRO_ID=
POLAR_PRODUCT_TEAM_ID=
POLAR_PRODUCT_ENTERPRISE_ID=
```

**예상 소요 시간**: 8시간

---

### 3. Desktop App Code Signing
**현재 상태**: 🟡 설정 파일 없음
**파일**: `apps/desktop/package.json`

**macOS 코드사이닝**:
```json
{
  "build": {
    "appId": "com.meld.app",
    "productName": "Meld",
    "mac": {
      "category": "public.app-category.developer-tools",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "entitlements.mac.plist",
      "entitlementsInherit": "entitlements.mac.plist",
      "identity": "Developer ID Application: Your Company (TEAM_ID)",
      "notarize": {
        "teamId": "TEAM_ID"
      }
    }
  }
}
```

**필요 작업**:
```yaml
apple:
  - [ ] Apple Developer 계정 ($99/년)
  - [ ] Developer ID Application 인증서 생성
  - [ ] App-specific password 생성 (Notarization용)
  - [ ] entitlements.mac.plist 파일 생성
  - [ ] electron-builder 설정 업데이트

windows:
  - [ ] Windows Code Signing 인증서 구매 (~$200/년)
  - [ ] 또는 Azure SignTool 사용
  - [ ] electron-builder win 설정
```

**환경변수 추가 필요**:
```env
APPLE_ID=
APPLE_ID_PASSWORD=
APPLE_TEAM_ID=
CSC_LINK=  # base64 encoded certificate
CSC_KEY_PASSWORD=
```

**예상 소요 시간**: 4시간 (인증서 발급 대기 제외)

---

### 4. OAuth Redirect URLs
**현재 상태**: 🟡 개발 URL만 설정
**파일들**:
- `apps/web/src/lib/auth/github.ts`
- `apps/web/src/lib/auth/figma.ts`
- `apps/web/src/app/api/auth/desktop/route.ts`

**GitHub OAuth 설정**:
```yaml
Development:
  - Homepage: http://localhost:9090
  - Callback: http://localhost:9090/api/auth/github

Production:
  - Homepage: https://meld.dev
  - Callback: https://meld.dev/api/auth/github

Desktop (Custom Protocol):
  - Callback: meld://auth/github
```

**Figma OAuth 설정**:
```yaml
Development:
  - Callback: http://localhost:9090/api/auth/figma

Production:
  - Callback: https://meld.dev/api/auth/figma
```

**필요 작업**:
```yaml
- [ ] GitHub OAuth App 프로덕션용 생성
- [ ] Figma App 프로덕션 redirect URI 추가
- [ ] 환경변수 분기 처리 (NODE_ENV)
- [ ] Desktop meld:// 프로토콜 테스트
```

**예상 소요 시간**: 2시간

---

### 5. Environment Variables Documentation
**현재 상태**: 🟡 `.env.example` 불완전

**완전한 .env.example**:
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
SESSION_SECRET=  # openssl rand -base64 32
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=

# AI Providers
ANTHROPIC_API_KEY=
OPENAI_API_KEY=  # optional
GOOGLE_AI_KEY=   # optional

# Payments (Polar)
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_PRODUCT_PRO_ID=
POLAR_PRODUCT_TEAM_ID=

# App
NEXT_PUBLIC_APP_URL=http://localhost:9090
NEXT_PUBLIC_DESKTOP_PROTOCOL=meld://

# Desktop (optional, for electron-builder)
APPLE_ID=
APPLE_ID_PASSWORD=
APPLE_TEAM_ID=
```

**예상 소요 시간**: 1시간

---

## High Priority (P1) - D-3까지 권장

### 6. Landing Page
**현재 상태**: 🔴 미시작
**위치**: `apps/web/src/app/page.tsx`

**필요 섹션**:
```yaml
hero:
  - 헤드라인: "Edit your existing code with AI"
  - 서브헤드: "The IDE that understands your codebase"
  - CTA: "Try Free" / "Watch Demo"
  - Hero 이미지/비디오

features:
  - Visual Editor: Click to edit
  - Figma Sync: Design to code
  - Smart Context: Learns your style
  - Local First: Privacy focused

demo_video:
  - 임베드 YouTube/Vimeo
  - 90초 데모

pricing:
  - Free / Pro / Team / Enterprise
  - Feature comparison table

testimonials:
  - Early adopter quotes (베타 테스터)

faq:
  - "How is this different from Cursor?"
  - "Is my code safe?"
  - "What frameworks are supported?"

footer:
  - Links: GitHub, Discord, Twitter
  - Legal: Privacy, Terms
```

**예상 소요 시간**: 8시간

---

### 7. Onboarding Flow
**현재 상태**: 🟡 스캐폴딩됨
**파일들**: `apps/web/src/components/onboarding/`

**필요 단계**:
```yaml
step_1_welcome:
  - "Welcome to Meld"
  - Quick feature overview
  - "Get Started" button

step_2_project:
  - "Open your project"
  - Local folder picker (Desktop)
  - OR GitHub repo connection

step_3_figma:
  - "Connect Figma (optional)"
  - OAuth flow
  - Skip button

step_4_ai:
  - "Configure AI"
  - API key input OR use provided
  - Context depth setting

step_5_tutorial:
  - Interactive demo
  - "Click this element"
  - "Type a command"
  - "See the magic"
```

**예상 소요 시간**: 6시간

---

### 8. Error Messages
**현재 상태**: 🟡 기본 에러만
**파일**: 전역 에러 핸들링

**개선 필요한 에러들**:
```typescript
// Before
throw new Error('Failed to connect');

// After
throw new MeldError({
  code: 'FIGMA_CONNECTION_FAILED',
  message: 'Could not connect to Figma',
  suggestion: 'Please check your Figma token and try again',
  action: {
    label: 'Reconnect Figma',
    href: '/settings/integrations'
  }
});
```

**예상 소요 시간**: 4시간

---

### 9. Bundle Size Optimization
**현재 상태**: 🟡 587KB (500KB 초과)
**파일**: `apps/desktop/renderer/`

**최적화 방안**:
```yaml
code_splitting:
  - [ ] React.lazy() for heavy components
  - [ ] Dynamic imports for MCP adapters
  - [ ] Route-based splitting

tree_shaking:
  - [ ] lodash → lodash-es
  - [ ] moment → dayjs
  - [ ] icons 개별 import

compression:
  - [ ] Brotli compression 활성화
  - [ ] Image optimization

분석:
  - [ ] webpack-bundle-analyzer 실행
  - [ ] 대용량 의존성 식별
```

**예상 소요 시간**: 4시간

---

## Medium Priority (P2) - Post-Launch

### 10. GitHub Integration Completion
**현재 상태**: 🟡 70%
**파일**: `apps/web/src/lib/trpc/routers/git.ts`

**추가 필요**:
```yaml
- [ ] Branch 생성/전환
- [ ] PR 생성 API
- [ ] Commit history 조회
- [ ] Diff 뷰어 개선
- [ ] Merge conflict 처리
```

---

### 11. MCP Server Validation
**현재 상태**: 🟡 2/14 테스트됨
**파일들**: `apps/web/src/lib/mcp/adapters/`

**테스트 필요**:
```yaml
tested:
  - [x] Figma
  - [x] GitHub

untested:
  - [ ] Vercel
  - [ ] Supabase
  - [ ] Sentry
  - [ ] Linear
  - [ ] Notion
  - [ ] Slack
  - [ ] Gmail
  - [ ] Filesystem
  - [ ] Windows MCP
  - [ ] PDF Viewer
  - [ ] Canva
  - [ ] Agent Bridge
```

---

### 12. Visual Editor Advanced
**현재 상태**: 🟡 클릭만 작동
**파일**: `apps/desktop/main/inspector-script.ts`

**추가 필요**:
```yaml
- [ ] Drag to move/resize
- [ ] Color picker
- [ ] Text editing inline
- [ ] Multi-select (Shift+Click)
- [ ] Undo/Redo visual changes
```

---

## Low Priority (P3) - Future

### 13. Internationalization
**현재 상태**: 🔴 미시작

**지원 예정 언어**:
- English (default)
- Korean
- Japanese
- Chinese (Simplified)

---

### 14. Analytics Integration
**현재 상태**: 🔴 미시작

**추가 예정**:
- [ ] Posthog 또는 Mixpanel
- [ ] 사용자 행동 추적
- [ ] Feature 사용률
- [ ] Conversion funnel

---

## 배포 체크리스트

### Vercel (Web)
```yaml
- [ ] 프로젝트 생성
- [ ] 환경변수 설정
- [ ] 도메인 연결 (meld.dev)
- [ ] SSL 인증서 자동
- [ ] Edge Functions 활성화
- [ ] Analytics 활성화
```

### Supabase (Database)
```yaml
- [ ] 프로덕션 프로젝트 생성
- [ ] 마이그레이션 실행
- [ ] RLS 정책 확인
- [ ] Connection pooling 설정
- [ ] 백업 스케줄 설정
```

### Desktop (Electron)
```yaml
macOS:
  - [ ] DMG 빌드
  - [ ] 코드사이닝
  - [ ] Notarization
  - [ ] GitHub Releases 업로드

Windows:
  - [ ] NSIS installer 빌드
  - [ ] 코드사이닝
  - [ ] GitHub Releases 업로드

Linux:
  - [ ] AppImage 빌드
  - [ ] .deb 패키지
  - [ ] GitHub Releases 업로드
```

---

## 테스트 체크리스트

### 기능 테스트
```yaml
auth:
  - [ ] GitHub OAuth 로그인
  - [ ] Figma OAuth 연결
  - [ ] 세션 유지 (새로고침)
  - [ ] 로그아웃

project:
  - [ ] 폴더 열기 (Desktop)
  - [ ] 파일 트리 로딩
  - [ ] Dev 서버 자동 감지
  - [ ] Hot reload 감지

ai:
  - [ ] Claude API 호출
  - [ ] 컨텍스트 주입
  - [ ] Diff 생성
  - [ ] 변경 적용

visual:
  - [ ] 요소 클릭 선택
  - [ ] 컴포넌트 식별
  - [ ] 속성 패널 업데이트

figma:
  - [ ] 파일 로딩
  - [ ] 노드 클릭
  - [ ] 이미지 렌더링

payment:
  - [ ] Checkout 세션 생성
  - [ ] 결제 완료 처리
  - [ ] Webhook 수신
  - [ ] 구독 상태 업데이트
```

### 성능 테스트
```yaml
- [ ] 초기 로딩 < 3초
- [ ] AI 응답 < 10초
- [ ] 파일 트리 (10,000 파일) 로딩 < 5초
- [ ] 메모리 사용량 < 500MB
```

### 보안 테스트
```yaml
- [ ] XSS 취약점 검사
- [ ] CSRF 토큰 확인
- [ ] API 키 노출 확인
- [ ] Rate limiting 동작
```

---

*문서 작성일: 2026-04-07*
*다음 업데이트: D-7 최종 점검*
