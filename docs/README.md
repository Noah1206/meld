# Meld Launch Documentation

## Quick Navigation

| 문서 | 내용 | 용도 |
|------|------|------|
| [LAUNCH_PLAN.md](./LAUNCH_PLAN.md) | 전체 런칭 전략 및 마케팅 계획 | 전략 개요 |
| [VIRAL_CONTENT.md](./VIRAL_CONTENT.md) | HN/Reddit/Twitter 게시물 템플릿 | 콘텐츠 제작 |
| [TECHNICAL_LAUNCH_CHECKLIST.md](./TECHNICAL_LAUNCH_CHECKLIST.md) | 기술적 런칭 준비사항 | 개발 체크리스트 |
| [REVENUE_MODEL.md](./REVENUE_MODEL.md) | 가격 정책 및 $1M 달성 시나리오 | 비즈니스 모델 |
| [WEEKLY_EXECUTION.md](./WEEKLY_EXECUTION.md) | 30일 상세 실행 계획 | 일정 관리 |

---

## 핵심 요약

### 목표
- **바이럴**: GitHub, Hacker News, Reddit 동시 런칭
- **매출**: 30일 내 $1,000,000 달성

### 포지셔닝
> "Meld: Edit your existing codebase with AI"

경쟁사(Cursor, v0, Bolt)가 **새 코드 생성**에 집중할 때,
Meld는 **기존 코드 수정**에 집중합니다.

### 가격
| Tier | 가격 | 대상 |
|------|------|------|
| Free | $0 | 체험 |
| Pro | $29/월 | 개인 |
| Team | $49/유저/월 | 팀 |
| Enterprise | $199/유저/월 | 대기업 |

### 타임라인
```
D-14 ~ D-1:  Pre-Launch (기술 완성 + 콘텐츠 준비)
D+0:         Launch Day (PH + HN + Reddit 동시)
D+1 ~ D+7:   Week 1 (모멘텀 확보, $20K 목표)
D+8 ~ D+14:  Week 2 (성장 가속, $100K 목표)
D+15 ~ D+21: Week 3 (스케일 확장, $500K 목표)
D+22 ~ D+30: Week 4 (수확, $1M 달성)
```

---

## 즉시 실행 필요 (P0)

### 기술
1. **Local Agent TODO 수정** - `apps/web/src/app/api/agent-bridge/route.ts`
2. **결제 시스템 테스트** - Polar Webhook 연동
3. **Desktop 코드사이닝** - Apple/Windows 인증서
4. **OAuth URL 업데이트** - 프로덕션 도메인

### 콘텐츠
1. **데모 영상 제작** - 90초 핵심 기능
2. **랜딩 페이지** - meld.dev
3. **HN/Reddit 게시물** - 초안 작성

---

## KPI 대시보드

### 30일 목표

| 지표 | W1 | W2 | W3 | W4 |
|------|-----|-----|-----|-----|
| Signups | 10K | 30K | 60K | 100K |
| Paid | 500 | 2K | 5K | 12K |
| MRR | $20K | $100K | $350K | $500K |
| Enterprise | 0 | 1 | 3 | 5 |
| Revenue | $20K | $180K | $550K | $1M |

---

## 연락처 & 리소스

### 팀 역할
- **Dev Lead**: 기술 완성, 버그 수정
- **Marketing Lead**: 콘텐츠, 인플루언서
- **Founder**: HN 게시, Enterprise 세일즈

### 외부 리소스
- Vercel: 호스팅
- Supabase: 데이터베이스
- Anthropic: AI API
- Polar: 결제

---

*마지막 업데이트: 2026-04-07*
