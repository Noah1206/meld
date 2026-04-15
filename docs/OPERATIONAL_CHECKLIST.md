# Operational Checklist

제가(AI 에이전트) 직접 수행할 수 없는 운영 작업들을 사용자가 최소한의 시간으로 끝낼 수 있게 정리한 체크리스트. 각 항목은 **소요 시간 + 실제 클릭 경로**까지 명시.

---

## 🔴 보안: AWS Access Key Rotate (5분)

**왜**: E2B로 완전 이관된 이후 구 AWS EC2 인스턴스가 남아있고 AWS 키가 여전히 활성 상태. 키가 유출되면 계정 요금 폭발 가능.

**절차**:

1. https://console.aws.amazon.com/iam → **Users** → 본인 계정
2. **Security credentials** 탭 → **Access keys** 섹션
3. 기존 Access key 옆 **Actions** → **Deactivate** (즉시 무효화)
4. 며칠 지켜본 뒤 아무것도 깨지지 않으면 **Delete**
5. (옵션) **Create access key** 로 새 키 발급 → Meld 서버에 E2B 외 AWS 서비스 필요 없으면 생략 가능
6. 추가: EC2 인스턴스도 같이 정리
   - https://console.aws.amazon.com/ec2 → Instances → 모든 running 인스턴스 선택 → **Instance state** → **Terminate**
   - EBS volumes도 남아있는지 Volumes 메뉴에서 확인 → delete

**검증**: AWS Billing 대시보드에서 다음 며칠간 EC2 비용 $0 확인.

---

## 🔴 도메인 연결 (15분)

**현재**: https://meld-psi.vercel.app (Vercel 자동 할당). 마케팅용으로 부족함.

**절차**:

### 1. 도메인 구매
- 추천 registrar: Namecheap, Cloudflare Registrar (가장 저렴, 마진 0%), GoDaddy
- `.ai` 도메인이 Meld 브랜드와 어울림 (~$70/year)
- `.dev` / `.app` 도 옵션 (~$15/year, 둘 다 HTTPS 강제)

### 2. Vercel에 도메인 등록
1. https://vercel.com/dashboard → Meld 프로젝트 → **Settings** → **Domains**
2. 도메인 입력 → **Add**
3. Vercel이 알려주는 DNS 레코드 복사 (A 또는 CNAME)

### 3. Registrar에서 DNS 설정
- Cloudflare Registrar:
  - Cloudflare 대시보드 → 도메인 선택 → **DNS** → **Records**
  - Vercel이 준 레코드 추가 (보통 `@` → `76.76.21.21` A record + `www` → `cname.vercel-dns.com` CNAME)
  - **Proxy status**는 **DNS only** (회색 구름)으로 설정 — Proxied(주황)하면 Vercel의 SSL과 충돌
- Namecheap: Advanced DNS → ADD NEW RECORD → 같은 식으로
- GoDaddy: DNS Management → 같은 식으로

### 4. 환경변수 업데이트
`.env.production` 또는 Vercel dashboard Environment Variables:
```
NEXT_PUBLIC_APP_URL=https://meld.ai
```
→ Redeploy 필수 (환경변수 변경은 빌드 시점에 구워짐)

### 5. 검증
- `dig meld.ai` 또는 `nslookup meld.ai` 로 DNS 전파 확인 (최대 24시간 소요 가능)
- https://meld.ai 접속 → HTTPS 자동 리다이렉트 → 정상 페이지 렌더
- `https://meld-psi.vercel.app`도 당분간 살아있으니 기존 링크 깨지지 않음

---

## 🟡 Live E2E 실측 (10분)

**왜**: 이번 세션에서 구현한 토큰 최적화, MCP 자율 사용, 외부 메모리가 **코드상으로만 완료**되어 있고 실제 런타임 검증은 0회. 다음 세션에서 커밋하기 전에 한 번은 돌려봐야 숫자 확인 가능.

**사전 준비**:
- GitHub 토큰 있음 (로그인 시 자동 발급) 또는 Figma PAT 준비
- `pnpm dev` 실행 중 (port 9090)
- 로그인 상태

**시나리오 A — GitHub 경로 (가장 빠름)**:

```bash
# 1. 브라우저에서 http://localhost:9090/integrations
# 2. GitHub 카드 → [Connect] 클릭 (로그인 토큰 자동 사용)
# 3. "Connected" 뱃지 + "도구 N개 사용 가능" 표시되면 ✅
# 4. http://localhost:9090/project/workspace 이동
# 5. 프롬프트 입력:
#    "내 GitHub 레포 중에서 가장 최근에 활동한 거 하나 골라서 README.md 내용 보여줘"
# 6. 에이전트가 자동으로 github_* 도구 호출하는지 확인
```

**검증할 로그** (`pnpm dev` 콘솔):

```
[mcp-inject][s_...] connected=1 tools=N est_tokens=K list=github (N tools)
[cache][s_...] round=1 input=... cache_read=0 cache_create=K output=...  hit=0.0%
[cache][s_...] round=2 input=... cache_read=K cache_create=0 ...  hit=80.0%+
[mode][s_...] implement → explore (recent: github_list_repos,github_get_file) — cache preserved
[cache][s_...] SESSION rounds=N ... hit=70%+
[mcp-overhead][s_...] per_round=K total_est=L pct_of_session=X%
```

**성공 기준**:
- ✅ `mcp-inject`에 github 도구 목록
- ✅ round 2부터 `cache_read > 0` (Phase 1 작동)
- ✅ mode 전환 시 `cache preserved` 라벨 (Phase 3-fix 작동)
- ✅ 에이전트가 실제로 `github_*` tool_call 이벤트 발사 (Phase L~M 작동)
- ✅ 세션 hit rate 70%+ (Phase 1 목표)

**시나리오 B — Figma PAT 경로**:

```bash
# 1. https://figma.com/settings/personal-access-tokens 에서 PAT 발급
# 2. /integrations → Figma 카드 → [Connect] → PAT 붙여넣기
# 3. /project/workspace 에서 프롬프트:
#    "Figma 파일 XXXX 가져와서 컴포넌트 목록 보여줘"
```

**시나리오 C — 긴 파일 + 외부 메모리 테스트**:

```bash
# 1. workspace 프롬프트:
#    "Next.js 프로젝트 만들고 20개 컴포넌트 폴더 구조 생성해줘"
# 2. 로그에서 [stash] 라인 확인 — 긴 run_command 출력이 .meld/cache/로 저장되는지
# 3. 에이전트가 나중에 read_file로 stashed 파일 재접근하는지
```

---

## 🟡 Polar 실결제 E2E (5분)

**왜**: 코드 완료 + Vercel 환경변수 세팅 됐지만 실제 돈 흐름은 미검증.

**절차**:

1. https://meld-psi.vercel.app/pricing
2. **Pro** 플랜 [Get Started] → Polar checkout 페이지로 리다이렉트
3. Polar test card 사용: `4242 4242 4242 4242`, 만료 `12/30`, CVC `123`
4. 결제 완료 → success 페이지 → `/projects` 리다이렉트
5. https://meld-psi.vercel.app/settings → **Plan & Billing** 탭 → **Pro** 플랜 표시 확인
6. (옵션) Polar 대시보드에서 subscription 활성 상태 확인

**검증할 것**:
- ✅ Webhook이 Vercel 서버에 도달 (Vercel Functions 로그 확인)
- ✅ Supabase `users.plan` 컬럼이 `pro`로 업데이트
- ✅ Pricing 페이지 재접속 시 현재 플랜 뱃지 표시

**실패 시 체크리스트**:
- Vercel 환경변수: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET` (또는 `POLAR_WEBHOOKS_SECRET`), `POLAR_PRO_PRODUCT_ID`, `POLAR_UNLIMITED_PRODUCT_ID` 모두 세팅 확인
- Polar Dashboard → Webhooks → Meld 엔드포인트 URL이 `https://meld-psi.vercel.app/api/webhook/polar` 로 등록돼있는지 확인
- Webhook 실패 시 Polar에서 retry 가능

---

## 🟢 MCP OAuth 앱 등록 (서비스당 10~30분)

**왜**: Notion / Slack / Gmail / Canva 4개는 OAuth2 전용이라 Meld 조직 계정으로 플랫폼에 OAuth app 등록해야만 활성화됨. 코드는 이미 전부 준비돼있음.

**상세 가이드**: [`docs/MCP_OAUTH_SETUP.md`](./MCP_OAUTH_SETUP.md) 별도 문서에 각 서비스별 단계별 절차가 있음.

**요약**:
1. 각 서비스 개발자 포털에서 OAuth app 생성
2. Redirect URI 등록: `https://meld-psi.vercel.app/api/auth/mcp?service=<서비스>`
3. Client ID / Client Secret 복사
4. Vercel 환경변수에 `<SERVICE>_CLIENT_ID`, `<SERVICE>_CLIENT_SECRET` 추가 → Redeploy
5. `/integrations` 새로고침 → "OAuth 앱 필요" 뱃지 사라지고 Connect 버튼 활성화 확인

우선순위 추천 (사용 빈도 기준):
1. **Notion** — 문서/지식 베이스 작업 많음
2. **Linear** — 이슈 추적 (이미 PAT로 동작하지만 OAuth가 더 매끄러움)
3. **Slack** — 팀 커뮤니케이션
4. **Gmail** — Google 검증 절차 있음, 가장 오래 걸림
5. **Canva** — 사용 빈도 낮음, 후순위

---

## 📋 전체 체크리스트 (커밋 + 배포 직전)

- [ ] AWS Access Key rotate 완료
- [ ] 도메인 구매 + Vercel 연결 + `NEXT_PUBLIC_APP_URL` 업데이트 + Redeploy
- [ ] Live E2E 실측 1회 완료 (baseline 프롬프트, 로그 검증)
- [ ] Polar 실결제 1회 (test card)
- [ ] (옵션) MCP OAuth 앱 1개 이상 등록

모두 완료되면 진짜 프로덕션 준비 상태.

---

## 관련 파일

- `docs/MCP_OAUTH_SETUP.md` — MCP OAuth 앱 등록 상세
- `.env.example` — 필요한 환경변수 목록
- `TODO.md` — 현재 전체 태스크 상태 + 이번 세션 완료 사항
