# Meld Launch Plan: $1M in 30 Days

## Executive Summary

**목표**: GitHub, Hacker News, Reddit 바이럴 → 30일 내 $1M 매출
**전략**: "기존 코드를 AI로 수정하는 최초의 데스크톱 IDE" 포지셔닝

---

## Part 1: 시장 분석

### 경쟁사 현황 (2026년 4월 기준)

| 도구 | 가격 | 핵심 기능 | 약점 |
|------|------|----------|------|
| **Cursor** | $20/월 | AI 코드 생성 | 기존 코드 수정 어려움, 새 프로젝트 위주 |
| **v0 (Vercel)** | $20/월 | UI 생성 | 프로토타입만, 기존 코드베이스 불가 |
| **Bolt.new** | $20/월 | 풀스택 생성 | WebContainer 한계, 복잡한 앱 불가 |
| **Lovable** | $25/월 | 앱 생성 | 기존 프로젝트 import 불가 |
| **GitHub Copilot** | $19/월 | 자동완성 | 맥락 이해 부족, 전체 파일 수정 불가 |

### Meld의 차별점

```
경쟁사: "새로운 코드를 생성" (프로토타입)
Meld: "기존 코드를 수정" (프로덕션)
```

**핵심 메시지**:
> "Cursor generates code. Meld transforms your codebase."

### 타겟 시장

| 세그먼트 | 규모 | 페인포인트 | Meld 솔루션 |
|---------|------|-----------|------------|
| **개인 개발자** | 2,800만명 | 레거시 코드 유지보수 | 자연어로 리팩토링 |
| **스타트업 팀** | 150만팀 | 디자인→코드 병목 | Figma 직접 연동 |
| **에이전시** | 8만개 | 반복 작업 | 14개 MCP 서버 자동화 |
| **엔터프라이즈** | 5천개 | 코드 표준화 | 행동 학습 + 스타일 강제 |

---

## Part 2: 바이럴 전략

### Week 1: Pre-Launch Buzz

#### Day 1-3: 티저 캠페인

**Twitter/X 티저 시리즈**:
```
Thread 1: "Cursor는 코드를 '생성'한다. 우리는 다른 접근을 택했다."
Thread 2: "3년된 Next.js 프로젝트를 10분만에 App Router로 마이그레이션한 영상"
Thread 3: "Figma 디자인 → 기존 React 컴포넌트 수정 (복붙 0회)"
```

**데모 영상 제작 (필수)**:
1. `demo-legacy-migration.mp4` - CRA → Next.js 마이그레이션 (2분)
2. `demo-figma-to-code.mp4` - Figma 디자인 클릭 → 코드 수정 (90초)
3. `demo-visual-editor.mp4` - 브라우저에서 요소 클릭 → 실시간 수정 (60초)

#### Day 4-5: 인플루언서 시딩

**타겟 인플루언서 (개발자)**:
| 이름 | 플랫폼 | 팔로워 | 접근 전략 |
|-----|--------|--------|----------|
| Theo (t3.gg) | YouTube | 400K | Early access + 후원 |
| Fireship | YouTube | 2.5M | 유료 스폰서십 |
| Lee Robinson | Twitter | 180K | Vercel 연동 강조 |
| Dan Abramov | Twitter | 700K | React 생태계 타겟 |
| Web Dev Simplified | YouTube | 1.5M | 튜토리얼 협업 |

**한국 인플루언서**:
| 이름 | 플랫폼 | 팔로워 | 접근 전략 |
|-----|--------|--------|----------|
| 드림코딩 | YouTube | 50K | 한국 시장 공략 |
| 노마드 코더 | YouTube | 100K | 실습 콘텐츠 |
| 캡틴판교 | Blog | - | 기술 리뷰 |

### Week 2: Launch Week

#### Day 7 (D-Day): 동시다발 런칭

**09:00 KST (전날 20:00 EST)**
- GitHub README 최종 업데이트
- Product Hunt 예약 게시 확인

**10:00 KST (전날 21:00 EST)**
- Product Hunt 라이브
- 팀 전원 업보팅 + 댓글

**11:00 KST (전날 22:00 EST)**
- Hacker News "Show HN" 게시
- Title: "Show HN: Meld – AI IDE that edits existing codebases, not generates new ones"

**14:00 KST (01:00 EST)**
- Reddit 게시 (r/programming, r/webdev, r/reactjs)
- Twitter 메인 발표 스레드

**18:00 KST (05:00 EST)**
- YouTube 데모 영상 공개
- Discord 서버 오픈

#### Hacker News 전략

**최적의 제목 포맷**:
```
Show HN: Meld – Edit existing codebases with AI (open source desktop app)
```

**성공 요인**:
1. "Show HN" 프리픽스 (제작자 참여 표시)
2. 명확한 차별점 ("edit existing" vs "generate new")
3. "open source" 키워드 (HN 커뮤니티 선호)
4. "desktop app" (브라우저 기반 대비 신뢰도)

**게시 시간**: 화요일-목요일, 오전 9-11시 EST
**최초 1시간**: 팀원 5명 이상 업보팅 (organic하게)

#### Reddit 전략

**서브레딧별 맞춤 게시물**:

| 서브레딧 | 제목 | 앵글 |
|---------|------|------|
| r/programming | "We built an AI IDE that edits your existing code instead of generating new projects" | 기술적 차별점 |
| r/webdev | "Tired of AI tools that can't work with your existing codebase? We made Meld" | 페인포인트 |
| r/reactjs | "Meld: Click any element in your React app, tell AI what to change" | React 특화 |
| r/Frontend | "Figma → existing components workflow without any copy-paste" | 디자인 워크플로우 |
| r/SideProject | "Quit my job 6 months ago to build this. Finally launching today" | 스토리텔링 |

**Reddit 금지사항**:
- 직접 링크 스팸 금지 → 자세한 설명 후 "링크는 댓글에"
- 자화자찬 금지 → "이런 문제 해결하려고 만들었는데 피드백 주세요"
- 가격 강조 금지 → "무료 tier 있음" 정도만

### Week 3-4: Momentum Building

#### 바이럴 콘텐츠 시리즈

**"Before Meld vs After Meld" 시리즈**:
```
Day 8:  "3시간 리팩토링 → 30초 데모"
Day 10: "Figma 핸드오프 5단계 → 1클릭"
Day 12: "레거시 jQuery → React 마이그레이션"
Day 14: "디자인 시스템 적용 100개 컴포넌트"
```

**기술 블로그 포스트**:
1. "How we built an AI agent that understands your codebase" (architecture)
2. "MCP Servers: The protocol that connects your AI to everything" (ecosystem)
3. "Smart Context: Teaching AI your coding style" (behavioral learning)

---

## Part 3: 수익 모델

### 가격 정책

| Tier | 가격 | 대상 | 기능 |
|------|------|------|------|
| **Free** | $0 | 개인 학습 | 50 AI 요청/월, 1 프로젝트 |
| **Pro** | $29/월 | 개인 개발자 | 무제한 요청, 10 프로젝트, MCP 서버 |
| **Team** | $49/유저/월 | 팀 | Pro + 협업, 공유 컨텍스트, 관리자 대시보드 |
| **Enterprise** | $199/유저/월 | 대기업 | Team + SSO, 감사 로그, 전용 지원 |

### 30일 $1M 달성 시나리오

#### 보수적 시나리오 (80% 확률)

| Week | 신규 유료 | ARPU | 주간 매출 | 누적 |
|------|----------|------|----------|------|
| 1 | 500 | $35 | $17,500 | $17,500 |
| 2 | 2,000 | $38 | $76,000 | $93,500 |
| 3 | 5,000 | $42 | $210,000 | $303,500 |
| 4 | 10,000 | $45 | $450,000 | $753,500 |

**부족분 해결**: Enterprise 3개 계약 ($82,000 x 3 = $246,000)

#### 공격적 시나리오 (40% 확률)

| Week | 신규 유료 | ARPU | 주간 매출 | 누적 |
|------|----------|------|----------|------|
| 1 | 1,000 | $40 | $40,000 | $40,000 |
| 2 | 5,000 | $42 | $210,000 | $250,000 |
| 3 | 10,000 | $45 | $450,000 | $700,000 |
| 4 | 8,000 | $50 | $400,000 | $1,100,000 |

### 전환율 최적화

**무료 → Pro 전환 촉진**:
1. 50회 제한 도달 시 "Upgrade" 모달 (강제 아님)
2. Pro 기능 미리보기 (MCP 서버 연결 시도 시 업그레이드 유도)
3. 연간 결제 20% 할인 ($278/년 = $23.17/월)

**Pro → Team 전환**:
1. 2인 이상 동일 IP에서 접속 감지 → Team 제안
2. 협업 기능 (댓글, 공유 세션) Pro에서 제한적 제공

---

## Part 4: 기술 완성 체크리스트

### Launch Blocker (D-7까지 필수)

| 항목 | 현재 상태 | 우선순위 |
|------|----------|---------|
| Local Agent TODO 수정 | 🔴 미완료 | P0 |
| 결제 시스템 테스트 | 🔴 미완료 | P0 |
| Desktop App 코드사이닝 | 🟡 준비중 | P0 |
| OAuth redirect URL 업데이트 | 🟡 준비중 | P0 |
| 환경변수 문서화 | 🟡 일부완료 | P1 |

### Launch Polish (D-3까지 권장)

| 항목 | 현재 상태 | 우선순위 |
|------|----------|---------|
| 랜딩 페이지 제작 | 🔴 미시작 | P1 |
| 온보딩 플로우 | 🟡 스캐폴딩 | P1 |
| 에러 메시지 개선 | 🟡 일부완료 | P2 |
| 성능 최적화 (번들 사이즈) | 🟡 경고있음 | P2 |

### Post-Launch (Week 2-4)

| 항목 | 현재 상태 | 우선순위 |
|------|----------|---------|
| GitHub 통합 완성 (PR 생성) | 🟡 70% | P1 |
| MCP 서버 14개 검증 | 🟡 2개만 테스트 | P1 |
| Visual Editor 고급 기능 | 🟡 클릭만 | P2 |
| 다국어 지원 | 🔴 미시작 | P3 |

---

## Part 5: 실행 타임라인

### D-14 to D-8: Pre-Production

| 날짜 | 담당 | 작업 |
|------|------|------|
| D-14 | Dev | Local Agent 버그 수정 |
| D-13 | Dev | 결제 시스템 통합 테스트 |
| D-12 | Dev | Desktop App 코드사이닝 설정 |
| D-11 | Marketing | 데모 영상 촬영 |
| D-10 | Dev | OAuth 프로덕션 URL 설정 |
| D-9 | Marketing | 인플루언서 컨택 |
| D-8 | QA | 전체 플로우 테스트 |

### D-7 to D-1: Launch Prep

| 날짜 | 담당 | 작업 |
|------|------|------|
| D-7 | Dev | 프로덕션 배포 |
| D-6 | Marketing | 랜딩 페이지 완성 |
| D-5 | Marketing | Product Hunt 페이지 작성 |
| D-4 | Marketing | HN/Reddit 게시물 초안 |
| D-3 | QA | 최종 버그 수정 |
| D-2 | All | 리허설 |
| D-1 | All | 대기 |

### D-Day to D+30: Execution

| 날짜 | 이벤트 | 목표 |
|------|--------|------|
| D+0 | 런칭 | PH #1, HN 프론트페이지 |
| D+1-3 | 모멘텀 유지 | 1,000 signups |
| D+7 | First Week Review | 500 paid |
| D+14 | 콘텐츠 시리즈 완료 | 3,000 paid |
| D+21 | Enterprise 세일즈 | 2개 계약 |
| D+30 | 목표 달성 | $1M |

---

## Part 6: 리스크 관리

### 기술 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 서버 과부하 | 높음 | 높음 | Vercel Edge 오토스케일 |
| AI API 비용 초과 | 중간 | 중간 | 요청당 토큰 제한, 캐싱 |
| Desktop 앱 크래시 | 낮음 | 높음 | 웹 앱 폴백 안내 |

### 마케팅 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| HN 다운보팅 | 중간 | 높음 | 진정성 있는 댓글 대응 |
| 경쟁사 대응 | 낮음 | 낮음 | 차별점 지속 강조 |
| 부정적 리뷰 | 중간 | 중간 | 빠른 버그 수정, 공개 사과 |

### 재무 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 환불 요청 폭증 | 낮음 | 중간 | 30일 환불 정책 명시 |
| Enterprise 계약 지연 | 높음 | 높음 | B2C 볼륨으로 보완 |
| 결제 사기 | 낮음 | 낮음 | Stripe Radar 활성화 |

---

## 부록: 핵심 메시지 정리

### One-Liner
> "Meld: The AI IDE that edits your existing codebase, not generates throwaway prototypes."

### Elevator Pitch (30초)
> "개발자들은 AI 코딩 도구가 새 프로젝트를 만들어주는 건 좋아하지만, 기존 코드를 수정하는 건 여전히 수동으로 합니다. Meld는 여러분의 코드베이스를 이해하고, Figma 디자인을 보고, 자연어로 기존 코드를 수정하는 데스크톱 IDE입니다. 클릭 한 번으로 리팩토링, 마이그레이션, 스타일 변경이 가능합니다."

### Tagline 후보
1. "Edit existing code with AI"
2. "Your codebase, AI-enhanced"
3. "The IDE that understands your project"
4. "From Figma to production code"
5. "AI-powered code transformation"

---

*문서 작성일: 2026-04-07*
*다음 업데이트: D-7 런칭 체크리스트*
