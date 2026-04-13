# Meld AI 고도화 계획

## 핵심 차별점 (모든 기능의 중심)

> **"AI가 만들고, 스스로 열어보고, 스스로 테스트하고, 안 되면 고치고, 진짜 동작하는 것만 내놓는다."**

다른 도구: AI가 코드 생성 → 유저에게 던짐 → "확인해봐"
Meld AI: AI가 코드 생성 → AI가 직접 열어봄 → AI가 직접 클릭/테스트 → 깨지면 스스로 수정 → 될 때까지 반복 → 동작하는 완성품만 전달

이것을 **Self-Verifying Agent**라고 부른다. 이것이 Meld의 존재 이유.

## 구현된 기능
1. 비주얼 편집 즉시 반영
2. Figma급 프로퍼티 패널
3. 완전 자율 에이전트 (승인 없음 + 시니어 Planning)
4. Self-Verifying Agent Loop (PLAN → BUILD → VERIFY → FIX → DELIVER)
5. VM Screen (AI의 가상 컴퓨터 — 유저가 실시간 시청)
6. 브라우저 자동화 6개 도구 (open, click, type, screenshot, evaluate, scroll)
7. Heartbeat (30분 주기 자동 감시)
8. 이벤트 훅 (파일/에러/git 변경 감지)
9. Context Engineering (Manus/Claude Code 수준)
10. EC2 인프라 (프로비저닝 + 프리뷰 프록시)

---

# Week 1: 비주얼 편집 즉시 반영

## Day 1-2: 즉시 반영 파이프라인

### 문제
```
현재: 편집 → handleVisualEdit → fetch("/api/ai/edit-code") → 3-10초 대기 → writeFile → HMR
유저가 색상 하나 바꿀 때마다 3-10초 기다림.
```

### 해결
```
변경: 편집 → inspector에서 element.style 즉시 수정 (0.1초) → 백그라운드로 AI 코드 동기화
```

### 파일별 변경

**`apps/web/src/lib/webcontainer/inspector-script.ts`**
- 모든 editType에서 `element.style`을 즉시 수정하도록 보장
- 현재 color, position 등은 일부 하고 있지만, 누락된 것들 채우기:
  - `fontSize`: `element.style.fontSize = value` 추가
  - `opacity`: `element.style.opacity = value` 추가  
  - `gap`: `element.parentElement.style.gap = value` 추가
  - `shadow`: `element.style.boxShadow = value` 추가
  - `borderRadius`: `element.style.borderRadius = value` 추가
  - `spacing` (padding/margin): `element.style[property] = value` 추가
  - `align`: 부모의 `justifyContent`, `alignItems` 즉시 수정
  - `resize`: `element.style.width/height` 즉시 수정

**`apps/web/src/components/workspace/PreviewFrame.tsx`**
- `handleVisualEdit` 함수를 2단계로 분리:

```typescript
// 새 구조
const pendingEditsRef = useRef<VisualEdit[]>([]);
const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

const handleVisualEdit = (edit: VisualEdit) => {
  // Step 1: 즉시 반영은 inspector-script에서 이미 완료됨
  // (postMessage로 iframe에 전달 → element.style 즉시 수정)
  
  // Step 2: 편집 큐에 추가 + 디바운스
  pendingEditsRef.current.push(edit);
  clearTimeout(syncTimerRef.current);
  setSyncStatus('idle');
  
  syncTimerRef.current = setTimeout(async () => {
    setSyncStatus('syncing');
    await syncEditsToCode([...pendingEditsRef.current]);
    pendingEditsRef.current = [];
    setSyncStatus('synced');
    setTimeout(() => setSyncStatus('idle'), 2000);
  }, 800);
};

const syncEditsToCode = async (edits: VisualEdit[]) => {
  const targetFile = selectedFilePath;
  if (!targetFile || !readFileFn || !writeFileFn) return;
  
  const currentCode = await readFileFn(targetFile);
  
  // 여러 편집을 하나의 자연어 명령으로 합침
  const commands = edits.map(e => editToCommand(e));
  const combinedCommand = commands.length === 1 
    ? commands[0] 
    : `Apply the following changes:\n${commands.map((c, i) => `${i+1}. ${c}`).join('\n')}`;
  
  const res = await fetch("/api/ai/edit-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      filePath: targetFile, 
      command: combinedCommand, 
      currentCode 
    }),
  });
  
  if (res.ok) {
    const data = await res.json();
    if (data.modified) {
      await writeFileFn(targetFile, data.modified);
      setLastWrite();
    }
  }
};
```

- syncStatus를 UI에 작은 인디케이터로 표시:
  - `idle`: 아무것도 안 보임
  - `syncing`: 작은 스피너 "코드 동기화 중..."
  - `synced`: 체크마크 "✓" (2초 후 사라짐)

## Day 3-4: 동기화 안정성

**여러 편집이 빠르게 연속될 때:**
- 디바운스 800ms — 유저가 멈추면 동기화
- 큐에 같은 프로퍼티가 여러 번 있으면 마지막 것만 사용
  - 예: color를 빨강→파랑→초록 → "초록으로 변경"만 AI에게 전달

**HMR 충돌 방지:**
- AI가 코드를 쓰면 HMR이 프리뷰를 갱신함
- 근데 inspector가 이미 `element.style`로 즉시 반영했으므로 결과가 같음
- 문제: HMR 시 element.style이 리셋될 수 있음
- 해결: inspector에서 `MutationObserver`로 DOM 변경 감지 → 스타일 재적용 (필요 시)

## Day 5: 테스트 + 엣지 케이스

- 연속 빠른 편집 테스트 (색상 10번 연속 변경)
- 텍스트 편집 후 코드 동기화 테스트
- 동기화 실패 시 재시도 로직
- 네트워크 느릴 때 동작 확인

---

# Week 2: 프로퍼티 패널 MVP

## Day 1-2: PropertyPanel 컴포넌트 기본 구조

### 새 파일: `apps/web/src/components/workspace/PropertyPanel.tsx`

```typescript
interface PropertyPanelProps {
  element: InspectedElement | null;
  onPropertyChange: (edit: VisualEdit) => void;
}

export function PropertyPanel({ element, onPropertyChange }: PropertyPanelProps) {
  if (!element) return <EmptyState />;
  
  const styles = element.computedStyle; // 이미 24+ CSS 프로퍼티 수집됨
  
  return (
    <div className="w-[280px] h-full overflow-y-auto bg-[#1E1E1E] border-l border-[#333]">
      <ElementHeader element={element} />
      <LayoutSection styles={styles} onChange={onPropertyChange} element={element} />
      <SizeSection styles={styles} onChange={onPropertyChange} element={element} />
      <SpacingSection styles={styles} onChange={onPropertyChange} element={element} />
      <FillBorderSection styles={styles} onChange={onPropertyChange} element={element} />
    </div>
  );
}
```

### ElementHeader
```
┌─────────────────────────┐
│ 🎯 Button               │  ← componentName 또는 tagName
│ src/components/Btn.tsx   │  ← 매핑된 파일 경로 (클릭 시 에디터)
│ .bg-blue-500.px-4.py-2  │  ← className 요약 (3개까지)
└─────────────────────────┘
```

### LayoutSection
```typescript
function LayoutSection({ styles, onChange, element }) {
  return (
    <Section title="Layout" defaultOpen={true}>
      {/* Display */}
      <PropertyRow label="Display">
        <SegmentedControl
          options={['block', 'flex', 'grid', 'inline', 'none']}
          value={styles.display}
          onChange={(v) => onChange({ editType: 'style', property: 'display', value: v, element })}
        />
      </PropertyRow>
      
      {/* Flex 방향 — display가 flex일 때만 */}
      {styles.display === 'flex' && (
        <>
          <PropertyRow label="Direction">
            <SegmentedControl
              options={['row', 'column']}
              value={styles.flexDirection}
              onChange={(v) => onChange({ editType: 'style', property: 'flex-direction', value: v, element })}
            />
          </PropertyRow>
          
          <PropertyRow label="Justify">
            <AlignButtons
              axis="horizontal"
              value={styles.justifyContent}
              onChange={(v) => onChange({ editType: 'align', property: 'justify-content', value: v, element })}
            />
          </PropertyRow>
          
          <PropertyRow label="Align">
            <AlignButtons
              axis="vertical" 
              value={styles.alignItems}
              onChange={(v) => onChange({ editType: 'align', property: 'align-items', value: v, element })}
            />
          </PropertyRow>
          
          <PropertyRow label="Gap">
            <NumberInput
              value={parseInt(styles.gap)}
              unit="px"
              onChange={(v) => onChange({ editType: 'gap', value: `${v}px`, element })}
            />
          </PropertyRow>
        </>
      )}
    </Section>
  );
}
```

### SizeSection
```typescript
function SizeSection({ styles, onChange, element }) {
  return (
    <Section title="Size">
      <div className="grid grid-cols-2 gap-2">
        <PropertyRow label="W">
          <NumberInput
            value={parseInt(styles.width)}
            unit="px"
            onChange={(v) => onChange({ editType: 'resize', property: 'width', value: `${v}px`, element })}
          />
        </PropertyRow>
        <PropertyRow label="H">
          <NumberInput
            value={parseInt(styles.height)}
            unit="px"
            onChange={(v) => onChange({ editType: 'resize', property: 'height', value: `${v}px`, element })}
          />
        </PropertyRow>
      </div>
    </Section>
  );
}
```

### SpacingSection — Figma 스타일 박스 모델
```typescript
function SpacingSection({ styles, onChange, element }) {
  return (
    <Section title="Spacing">
      {/* 비주얼 박스 모델 */}
      <BoxModelVisual
        padding={{
          top: parseInt(styles.paddingTop),
          right: parseInt(styles.paddingRight),
          bottom: parseInt(styles.paddingBottom),
          left: parseInt(styles.paddingLeft),
        }}
        margin={{
          top: parseInt(styles.marginTop),
          right: parseInt(styles.marginRight),
          bottom: parseInt(styles.marginBottom),
          left: parseInt(styles.marginLeft),
        }}
        onPaddingChange={(side, value) => 
          onChange({ editType: 'spacing', property: `padding-${side}`, value: `${value}px`, element })
        }
        onMarginChange={(side, value) =>
          onChange({ editType: 'spacing', property: `margin-${side}`, value: `${value}px`, element })
        }
      />
    </Section>
  );
}
```

### FillBorderSection
```typescript
function FillBorderSection({ styles, onChange, element }) {
  return (
    <Section title="Fill & Border">
      <PropertyRow label="Background">
        <ColorPicker
          value={styles.backgroundColor}
          onChange={(v) => onChange({ editType: 'color', property: 'background-color', value: v, element })}
        />
      </PropertyRow>
      <PropertyRow label="Text">
        <ColorPicker
          value={styles.color}
          onChange={(v) => onChange({ editType: 'color', property: 'color', value: v, element })}
        />
      </PropertyRow>
      <PropertyRow label="Border">
        <div className="flex gap-2">
          <NumberInput value={parseInt(styles.borderWidth)} unit="px"
            onChange={(v) => onChange({ editType: 'style', property: 'border-width', value: `${v}px`, element })} />
          <ColorPicker value={styles.borderColor}
            onChange={(v) => onChange({ editType: 'color', property: 'border-color', value: v, element })} />
        </div>
      </PropertyRow>
      <PropertyRow label="Radius">
        <NumberInput value={parseInt(styles.borderRadius)} unit="px"
          onChange={(v) => onChange({ editType: 'borderRadius', value: `${v}px`, element })} />
      </PropertyRow>
    </Section>
  );
}
```

## Day 3: 공통 UI 컴포넌트

### 새 파일: `apps/web/src/components/workspace/property-controls/`

```
property-controls/
├── NumberInput.tsx       — 숫자 입력 + 드래그로 값 변경 (Figma처럼)
├── ColorPicker.tsx       — 색상 피커 (Popover + 프리셋 + 커스텀)
├── SegmentedControl.tsx  — 세그먼트 버튼 (display: flex/grid/block)
├── AlignButtons.tsx      — 정렬 5개 아이콘 버튼 (justify/align)
├── BoxModelVisual.tsx    — padding/margin 시각화 + 드래그 편집
├── Section.tsx           — 접기/펴기 섹션 래퍼
├── PropertyRow.tsx       — 라벨 + 값 한 줄
└── index.ts              — re-export
```

**NumberInput (핵심 — Figma 스타일 드래그):**
```typescript
function NumberInput({ value, unit, onChange, min, max }) {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    document.body.style.cursor = 'ns-resize';
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const delta = startY.current - e.clientY; // 위로 드래그 = 값 증가
      const newValue = Math.round(startValue.current + delta);
      onChange(Math.max(min ?? 0, Math.min(max ?? 9999, newValue)));
    };
    const handleUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseDown={handleMouseDown}
        className="w-16 bg-[#2A2A2A] border border-[#444] rounded px-2 py-1 
                   text-[12px] text-white text-right cursor-ns-resize"
      />
      <span className="text-[10px] text-[#666]">{unit}</span>
    </div>
  );
}
```

## Day 4-5: workspace 레이아웃에 패널 통합

**`apps/web/src/app/project/workspace/page.tsx` 변경:**

```
현재 레이아웃:
[사이드바 60px] [메인 영역 (코드 + 프리뷰)]

변경:
[사이드바 60px] [메인 영역 (프리뷰)] [프로퍼티 패널 280px (요소 선택 시)]
```

- `inspectedElement`가 null이면 패널 숨김
- 요소 선택하면 패널이 우측에서 슬라이드 인
- 패널의 모든 변경은 `handleVisualEdit`으로 통일 (Week 1의 즉시 반영 시스템 사용)

---

# Week 3: 프로퍼티 패널 완성

## Day 1-2: Typography 섹션

```
▸ Typography
  Font     [Inter        ▾]   ← 드롭다운 (프로젝트에서 사용 중인 폰트 목록)
  Weight   [Medium       ▾]   ← 드롭다운 (100~900)
  Size     [14    ]px         ← NumberInput (드래그)
  Line H   [1.5   ]          ← NumberInput
  Spacing  [0     ]px        ← NumberInput (letter-spacing)
  Color    [■ #FFFFFF]        ← ColorPicker
  Align    [←  ≡  →]         ← 3개 버튼 (text-align)
  Decoration [none   ▾]      ← 드롭다운 (underline, line-through 등)
```

## Day 3: Effects 섹션

```
▸ Effects
  Shadow    [none  ▾]    ← 프리셋 (none, sm, md, lg, xl) + 커스텀
  Opacity   [====●] 100% ← 슬라이더
  Overflow  [visible ▾]  ← 드롭다운
  Cursor    [pointer ▾]  ← 드롭다운
```

## Day 4-5: Position 섹션 + 전체 QA

```
▸ Position
  Position  [relative ▾]  ← 드롭다운
  Top    [0  ]px   Right  [0  ]px
  Bottom [0  ]px   Left   [0  ]px
  Z-index [auto ]
```

---

# Week 4-5: Meld AI 완전 자율 에이전트 (Layer 2)

## Day 1-2: 새 도구 정의 + 이벤트 타입

**`packages/shared/src/agent-events.ts` 수정:**

```typescript
// 기존 AgentEvent 타입에 추가
export type AgentEvent =
  | { type: "thinking"; text: string }
  | { type: "tool_call"; toolName: string; input: unknown; toolCallId: string }
  | { type: "tool_result"; toolCallId: string; result: string; isError?: boolean }
  | { type: "file_read"; filePath: string; preview: string }
  | { type: "file_edit"; toolCallId: string; filePath: string; original: string; modified: string; explanation: string }
  | { type: "file_created"; filePath: string }
  | { type: "file_edit_auto"; filePath: string; explanation: string }  // NEW: 자율모드 자동 수정
  | { type: "command_start"; command: string; cwd?: string }
  | { type: "command_output"; data: string }
  | { type: "command_done"; command: string; exitCode: number }
  | { type: "message"; content: string }
  | { type: "done"; summary?: string }
  | { type: "error"; message: string }
  | { type: "cancelled" }
  | { type: "awaiting_approval"; editCount: number }
  | { type: "rollback_available" }
  | { type: "mcp_connect_required"; service: string; reason: string }
  // NEW: 자율 에이전트 이벤트
  | { type: "agent_plan"; plan: AgentPlan }                    // 실행 계획
  | { type: "agent_plan_progress"; stepIndex: number; status: "running" | "done" | "error" } // 계획 진행
  | { type: "agent_question"; question: AgentQuestion }        // 유저에게 질문
  | { type: "agent_service_request"; request: ServiceRequest } // MCP 연결 요청
  | { type: "agent_complete"; summary: AgentSummary }          // 작업 완료
  | { type: "preview_check"; screenshot: string; analysis: string } // 프리뷰 확인 결과
  ;

// 새 타입들
export interface AgentPlan {
  title: string;
  techStack: { area: string; choice: string; reason: string }[];
  dbSchema?: { table: string; columns: string; notes: string }[];
  phases: { name: string; steps: string[]; estimatedMinutes: number }[];
  servicesNeeded: { service: string; reason: string }[];
  packagesNeeded: string[];
}

export interface AgentQuestion {
  id: string;
  question: string;
  inputType: "choice" | "text" | "secret" | "confirm";
  options?: string[];
  context?: string;
}

export interface ServiceRequest {
  id: string;
  serviceId: string;
  serviceName: string;
  reason: string;
  credentials: { key: string; label: string; placeholder: string; isSecret: boolean }[];
}

export interface AgentSummary {
  filesCreated: string[];
  filesModified: string[];
  packagesInstalled: string[];
  servicesConnected: string[];
  previewVerified: boolean;
  notes: string;
}
```

**`packages/shared/src/agent-events.ts` — AGENT_TOOLS 배열에 새 도구 추가:**

```typescript
// 기존 8개 뒤에 추가

{
  name: "ask_user",
  description: "유저에게 결정, 정보, 확인을 요청. 비즈니스 결정/디자인 선호/API 키 등 에이전트가 판단할 수 없는 것에 사용.",
  input_schema: {
    type: "object" as const,
    properties: {
      question: { type: "string", description: "유저에게 묻는 질문" },
      input_type: { type: "string", enum: ["choice", "text", "secret", "confirm"], description: "choice: 선택지, text: 자유입력, secret: API키 등, confirm: 예/아니오" },
      options: { type: "array", items: { type: "string" }, description: "choice일 때 선택지 목록" },
      context: { type: "string", description: "왜 이 결정이 필요한지" },
    },
    required: ["question", "input_type"],
  },
},
{
  name: "request_mcp_connection",
  description: "외부 서비스 연결 요청. 에이전트가 작업 분석 후 필요한 서비스를 판단해서 유저에게 연결을 요청.",
  input_schema: {
    type: "object" as const,
    properties: {
      service_id: { type: "string", description: "supabase, github, vercel, stripe, sentry, linear, notion, slack, gmail, canva, filesystem, custom_http 중 하나" },
      reason: { type: "string", description: "왜 이 서비스가 필요한지" },
      required_credentials: { type: "array", items: { type: "string" }, description: "필요한 인증 정보 키 이름들" },
    },
    required: ["service_id", "reason"],
  },
},
{
  name: "check_preview",
  description: "프리뷰 스크린샷을 캡처하여 결과 확인. 코드 변경 후 실제 의도대로 되었는지 시각적으로 확인.",
  input_schema: {
    type: "object" as const,
    properties: {
      check_description: { type: "string", description: "무엇을 확인하려는지" },
    },
    required: ["check_description"],
  },
},
{
  name: "set_env_variable",
  description: ".env 파일에 환경 변수 설정.",
  input_schema: {
    type: "object" as const,
    properties: {
      key: { type: "string" },
      value: { type: "string" },
      is_secret: { type: "boolean", description: "true면 로그에 마스킹" },
    },
    required: ["key", "value"],
  },
},
{
  name: "run_and_check",
  description: "커맨드 실행 + 출력 기반 성공/실패 자동 판단. 실패 시 auto_retry=true면 에이전트가 자동 수정 시도.",
  input_schema: {
    type: "object" as const,
    properties: {
      command: { type: "string" },
      success_pattern: { type: "string", description: "성공 시 출력에 포함되는 문자열" },
      failure_pattern: { type: "string", description: "실패 시 출력에 포함되는 문자열" },
      auto_retry: { type: "boolean", description: "실패 시 자동 수정 시도 여부" },
    },
    required: ["command"],
  },
},
{
  name: "deploy_preview",
  description: "프로젝트를 미리보기 URL로 배포.",
  input_schema: {
    type: "object" as const,
    properties: {
      message: { type: "string", description: "배포 설명" },
    },
  },
},
```

## Day 3-4: agent-loop.ts에 새 도구 실행 로직

**`packages/agent/src/agent-loop.ts` — executeTool에 케이스 추가:**

- `ask_user`: onEvent로 `agent_question` 이벤트 발행 → Promise로 유저 응답 대기 (approvalResolvers와 같은 패턴)
- `request_mcp_connection`: onEvent로 `agent_service_request` 발행 → 유저가 credentials 입력 → MCP 연결 실행
- `check_preview`: onEvent로 스크린샷 요청 → PreviewFrame에서 캡처 → Claude Vision으로 분석 → 결과 반환
- `set_env_variable`: .env 파일 읽기 → 키 추가/수정 → 저장
- `run_and_check`: run_command와 유사하나 출력에서 success/failure 패턴 매칭 + auto_retry 시 에러 분석 → 수정 제안
- `deploy_preview`: Vercel MCP 또는 내장 정적 배포

## Day 5-7: Auto-Approve 모드 + Plan 카드

**`packages/agent/src/agent-loop.ts`:**
- `this.autoApproveMode: boolean` 필드 추가
- 시스템 프롬프트에 "PLAN FIRST" 지시 추가 (Week 4-5의 Planning Engine 프롬프트)
- 유저가 "자율 실행" 선택 시 `autoApproveMode = true` → write_file 자동 승인
- `file_edit_auto` 이벤트로 유저에게 알림만 (승인 대기 없음)

**`apps/web/src/components/chat/` — 새 메시지 카드 컴포넌트:**

- `PlanCard.tsx`: 기술 판단 테이블 + 단계별 체크리스트 + [자율실행/단계별/취소]
- `QuestionCard.tsx`: 선택지 라디오/체크박스 또는 텍스트 입력 또는 시크릿 입력
- `ServiceRequestCard.tsx`: 서비스 아이콘 + 이유 + credential 입력 폼 + [연결/건너뛰기]
- `ProgressCard.tsx`: 단계별 체크리스트 실시간 업데이트 + [일시정지/취소]
- `CompleteCard.tsx`: 변경 요약 + 프리뷰 스크린샷 + [롤백/배포/수정요청]

## Day 8-10: 시니어 Planning Engine 시스템 프롬프트 + Self-Healing

**`packages/agent/src/agent-loop.ts` — buildSystemPrompt 수정:**
- UPGRADE_PLAN.md 3-8 섹션의 전체 시스템 프롬프트 적용
- 기술 판단 프레임워크 (아키텍처, 스택, DB, 인프라, 보안)
- Self-Healing 로직 (에러 → 진단 → 수정 → 재시도 3회)
- Decision Framework (내가 결정 vs ask_user)

---

# Week 6-8: Meld AI 완전 자율 에이전트 (Layer 3 — EC2)

## Day 1-3: EC2 프로비저닝 API

**새 파일: `apps/web/src/app/api/compute/`**

```
api/compute/
├── provision/route.ts    — EC2 인스턴스 시작 (유저별)
├── status/route.ts       — 인스턴스 상태 확인
├── terminate/route.ts    — 인스턴스 중지/삭제
└── proxy/route.ts        — EC2 dev server 프록시
```

**provision/route.ts:**
```typescript
// AWS SDK v3
import { EC2Client, RunInstancesCommand, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

export async function POST(req: Request) {
  const { userId, projectId } = await req.json();
  
  // 1. 유저의 기존 인스턴스 확인
  // 2. 없으면 새 인스턴스 시작 (t3.medium, Ubuntu, Meld AMI)
  // 3. UserData 스크립트: Docker 설치, Meld Agent Runtime 시작
  // 4. 인스턴스 ID + 퍼블릭 IP 반환
  // 5. Supabase에 유저 ↔ 인스턴스 매핑 저장
}
```

**Meld Agent Runtime Docker 이미지:**
```dockerfile
FROM node:20-slim

# 시스템 도구
RUN apt-get update && apt-get install -y git curl docker.io

# Playwright (에이전트의 눈)
RUN npx playwright install --with-deps chromium

# Meld Agent
COPY packages/agent /app/agent
WORKDIR /app/agent
RUN npm install

# Heartbeat 스케줄러
COPY scripts/heartbeat.sh /app/heartbeat.sh
RUN chmod +x /app/heartbeat.sh

# 시작
CMD ["node", "dist/server.js"]
```

## Day 4-6: WebSocket 터널링

**유저 브라우저 ↔ Meld 서버 ↔ EC2 인스턴스:**

```
브라우저 → wss://meld.app/ws/session-abc → Meld 서버 → SSH/WS → EC2:3100
```

**`apps/web/src/lib/hooks/useAgentConnection.ts` 수정:**
- 현재: 로컬 WebSocket (localhost:3100)에 연결
- 변경: 모드에 따라 로컬 또는 EC2 프록시에 연결

```typescript
const wsUrl = mode === 'cloud' 
  ? `wss://meld-psi.vercel.app/api/compute/ws/${sessionId}`  // EC2 프록시
  : `ws://localhost:3100`;  // 로컬
```

## Day 7-8: 프리뷰 프록시

**EC2의 dev server → 유저 브라우저:**

```
유저가 프리뷰를 볼 때:
iframe src = "https://meld-psi.vercel.app/api/compute/preview/session-abc"
            → Meld 서버가 프록시
            → EC2:3000 (실제 dev server)
```

**`apps/web/src/components/workspace/PreviewFrame.tsx` 수정:**
- `url` prop이 로컬 URL 또는 프록시 URL

## Day 9-11: Heartbeat 시스템

**`packages/agent/src/heartbeat.ts` (새 파일):**

```typescript
export class HeartbeatScheduler {
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private agentLoop: AgentLoop;
  private heartbeatMd: string;
  
  constructor(config: {
    intervalMs: number;      // 기본 30분 = 1800000
    rootDir: string;
    agentConfig: AgentLoopConfig;
  }) {
    this.intervalMs = config.intervalMs;
  }
  
  start() {
    this.timer = setInterval(() => this.beat(), this.intervalMs);
  }
  
  private async beat() {
    // 1. HEARTBEAT.md 읽기
    const instructions = await this.loadHeartbeatMd();
    if (!instructions) return;
    
    // 2. Standing Orders 실행
    for (const order of instructions.standingOrders) {
      await this.executeOrder(order);
    }
    
    // 3. 결과를 유저에게 알림 (WebSocket으로)
    this.notifyUser(results);
  }
  
  private async executeOrder(order: string) {
    // "dev server 상태 확인" → run_command("curl localhost:3000") → 분석
    // "npm run build 실행" → run_and_check → 실패 시 자동 수정
    // "Sentry 에러 확인" → mcp_tool(sentry, getIssues) → 분석
    
    // 에이전트 루프를 사용해서 자율적으로 처리
    const loop = new AgentLoop({
      ...this.agentConfig,
      input: { command: `[HEARTBEAT] ${order}` },
    });
    await loop.run();
  }
}
```

**`HEARTBEAT.md` 자동 생성 + 유저 편집 UI:**

```markdown
# Heartbeat Configuration

## 주기
interval: 30m

## Standing Orders
1. Check dev server health (curl localhost:$PORT)
2. Run npm run build — fix errors automatically if possible
3. Check for new error logs in terminal output
4. Check git status — report uncommitted changes

## Auto-Actions (승인 없이 자동 실행)
- Fix lint errors
- Fix TypeScript errors  
- Restart crashed dev server
- Install missing packages

## Ask-First Actions (유저 승인 필요)
- Deploy to production
- Run database migrations
- Delete files
- Push to git

## Notifications
- Send alert on: build failure, new Sentry error, server crash
- Summary: after each heartbeat cycle
```

## Day 12-14: 이벤트 훅 + Standing Orders UI

**이벤트 훅 (`packages/agent/src/event-hooks.ts`):**
```typescript
// 파일 변경 감지
fs.watch(rootDir, { recursive: true }, (event, filename) => {
  if (filename && !filename.includes('node_modules') && !filename.includes('.git')) {
    // 에이전트에게 알림: "유저가 파일을 수정했다"
    // lint/typecheck 자동 실행
  }
});

// Git hook
// .git/hooks/post-commit → 에이전트에게 "새 커밋" 알림

// Webhook 수신 (Sentry, Stripe 등)
// /api/webhooks/[service]/route.ts → 에이전트에게 전달
```

**Standing Orders UI (`apps/web/src/components/settings/HeartbeatSettings.tsx`):**
- HEARTBEAT.md를 시각적으로 편집
- Standing Orders 추가/삭제/순서 변경
- 주기 설정 (15분/30분/1시간/매일)
- Auto-Actions vs Ask-First 토글
- Heartbeat 히스토리 로그

---

# 비용 구조

```
EC2 t3.medium: $0.0416/hour
├── 활성 사용 (8시간/일): $0.33/일 = $10/월
├── Heartbeat만 (나머지 16시간, t3.micro로 다운): $0.006/시간 = $0.10/일
├── 총 유저당: ~$13/월

Claude API (에이전트 호출):
├── Sonnet: $3/1M input, $15/1M output
├── Heartbeat 호출 (하루 48회 × 1K tokens): ~$0.14/일 = $4.3/월
├── 유저 요청 (하루 평균 20회 × 5K tokens): ~$0.30/일 = $9/월
├── 총 유저당: ~$13/월

총 유저당 원가: ~$26/월
```

# 가격 정책

```
Free:
├── 로컬 모드 (Meld 서버가 AI 프록시)
├── 비주얼 에디터 + 프로퍼티 패널
├── 에이전트 25라운드/일
└── Heartbeat 없음

Pro ($35/mo):
├── 클라우드 모드 (EC2)
├── 무제한 에이전트 라운드
├── Heartbeat (30분 주기)
├── Standing Orders
├── 모든 MCP 연결
├── 프리뷰 공유 URL
└── Playwright Vision 확인

Team ($70/seat/mo):
├── Pro 전부 +
├── 팀 프로젝트 공유
├── Heartbeat 히스토리 대시보드
├── 동시 편집 보호
└── 감사 로그
```
