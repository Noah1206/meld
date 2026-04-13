"use client";

import { useState } from "react";
import {
  Loader2, Check, X, ChevronDown, ChevronRight, Plug, HelpCircle,
  Rocket, FileCode, Package, Shield, ArrowRight, Play, Pause, RotateCcw,
} from "lucide-react";
import type {
  AgentPlan, AgentQuestion, ServiceRequest, AgentCompleteSummary,
} from "@figma-code-bridge/shared";

// ─── Plan Card ─────────────────────────────────

interface PlanCardProps {
  plan: AgentPlan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const [showSchema, setShowSchema] = useState(false);

  return (
    <div className="animate-card-in rounded-2xl border border-blue-500/15 bg-gradient-to-b from-blue-500/[0.06] to-transparent p-4">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-blue-400">
        <Rocket className="h-4 w-4" />
        {plan.title || "실행 계획"}
      </div>

      {/* Tech Stack */}
      {plan.techStack.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#888]">기술 스택</div>
          <div className="space-y-1">
            {plan.techStack.map((t, i) => (
              <div key={i} className="flex items-baseline gap-2 text-[12px]">
                <span className="min-w-[70px] text-[#999]">{t.area}</span>
                <span className="font-medium text-white">{t.choice}</span>
                <span className="text-[11px] text-[#666]">— {t.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DB Schema */}
      {plan.dbSchema && plan.dbSchema.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowSchema(!showSchema)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#888] hover:text-white"
          >
            {showSchema ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            DB 스키마
          </button>
          {showSchema && (
            <div className="mt-1 space-y-1 rounded-lg bg-black/30 p-2 font-mono text-[11px]">
              {plan.dbSchema.map((t, i) => (
                <div key={i} className="text-[#ccc]">
                  <span className="text-blue-400">{t.table}</span>
                  <span className="text-[#666]"> — {t.columns}</span>
                  {t.notes && <span className="text-[#555]"> ({t.notes})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phases */}
      <div className="mb-3">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#888]">실행 단계</div>
        <div className="space-y-2">
          {plan.phases.map((phase, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-white">Phase {i + 1}: {phase.name}</span>
                <span className="text-[10px] text-[#666]">~{phase.estimatedMinutes}분</span>
              </div>
              <div className="mt-1 space-y-0.5 pl-3">
                {phase.steps.map((step, j) => (
                  <div key={j} className="flex items-center gap-1.5 text-[11px] text-[#999]">
                    <div className="h-1 w-1 rounded-full bg-[#555]" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services & Packages */}
      {(plan.servicesNeeded.length > 0 || plan.packagesNeeded.length > 0) && (
        <div className="mb-3 flex gap-4 text-[11px]">
          {plan.servicesNeeded.length > 0 && (
            <div>
              <span className="text-[#888]">필요한 서비스: </span>
              {plan.servicesNeeded.map((s) => s.service).join(", ")}
            </div>
          )}
          {plan.packagesNeeded.length > 0 && (
            <div>
              <span className="text-[#888]">패키지: </span>
              {plan.packagesNeeded.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Auto-executing — no approval needed */}
      <div className="flex items-center gap-2 rounded-lg bg-blue-600/10 px-3 py-2 text-[11px] text-blue-400">
        <Play className="h-3 w-3" />
        자율 실행 중...
      </div>
    </div>
  );
}

// ─── Progress Card ─────────────────────────────

interface ProgressCardProps {
  plan: AgentPlan;
  currentStep: number;
  stepStatuses: ("pending" | "running" | "done" | "error")[];
  onPause?: () => void;
  onCancel?: () => void;
}

export function ProgressCard({ plan, currentStep, stepStatuses, onPause, onCancel }: ProgressCardProps) {
  const allSteps = plan.phases.flatMap((p) => p.steps);

  return (
    <div className="animate-card-in rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-yellow-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          자율 실행 중...
        </div>
        <div className="flex gap-1">
          {onPause && (
            <button onClick={onPause} className="rounded-lg p-1.5 text-[#888] hover:bg-[#333] hover:text-white">
              <Pause className="h-3.5 w-3.5" />
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="rounded-lg p-1.5 text-[#888] hover:bg-red-500/20 hover:text-red-400">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {allSteps.map((step, i) => {
          const status = stepStatuses[i] || "pending";
          return (
            <div key={i} className={`flex items-center gap-2 text-[12px] ${
              status === "done" ? "text-emerald-400" :
              status === "running" ? "text-yellow-400" :
              status === "error" ? "text-red-400" :
              "text-[#666]"
            }`}>
              {status === "done" && <Check className="h-3 w-3" />}
              {status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
              {status === "error" && <X className="h-3 w-3" />}
              {status === "pending" && <div className="ml-0.5 h-2 w-2 rounded-full border border-[#555]" />}
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Question Card ─────────────────────────────

interface QuestionCardProps {
  question: AgentQuestion;
  onRespond: (questionId: string, response: string) => void;
}

export function QuestionCard({ question, onRespond }: QuestionCardProps) {
  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSubmit = () => {
    if (question.inputType === "choice" && selectedOption) {
      onRespond(question.id, selectedOption);
    } else if (question.inputType === "confirm") {
      // handled by buttons
    } else if (textInput.trim()) {
      onRespond(question.id, textInput.trim());
    }
  };

  return (
    <div className="animate-card-in rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-purple-400">
        <HelpCircle className="h-4 w-4" />
        결정이 필요합니다
      </div>

      <p className="mb-3 text-[13px] text-white">{question.question}</p>

      {question.context && (
        <p className="mb-3 text-[11px] text-[#888]">{question.context}</p>
      )}

      {question.inputType === "choice" && question.options && (
        <div className="mb-3 space-y-1.5">
          {question.options.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelectedOption(opt)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition-colors ${
                selectedOption === opt
                  ? "bg-purple-600/30 text-white ring-1 ring-purple-500/50"
                  : "bg-[#2A2A2A] text-[#ccc] hover:bg-[#333]"
              }`}
            >
              <div className={`h-3 w-3 rounded-full border-2 ${
                selectedOption === opt ? "border-purple-500 bg-purple-500" : "border-[#555]"
              }`} />
              {opt}
            </button>
          ))}
          <button
            onClick={handleSubmit}
            disabled={!selectedOption}
            className="mt-2 rounded-lg bg-purple-600 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
          >
            선택 완료
          </button>
        </div>
      )}

      {question.inputType === "confirm" && (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(question.id, "yes")}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-emerald-500"
          >
            <Check className="h-3 w-3" />
            네
          </button>
          <button
            onClick={() => onRespond(question.id, "no")}
            className="flex items-center gap-1.5 rounded-lg bg-[#333] px-4 py-2 text-[12px] font-medium text-[#ccc] hover:bg-[#444]"
          >
            아니요
          </button>
        </div>
      )}

      {(question.inputType === "text" || question.inputType === "secret") && (
        <div className="flex gap-2">
          <input
            type={question.inputType === "secret" ? "password" : "text"}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={question.inputType === "secret" ? "sk_..." : "입력하세요"}
            className="no-hover-fill flex-1 rounded-lg border border-[#3A3A3A] bg-[#252525] px-3 py-2 font-mono text-[12px] text-white outline-none transition-all focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
          />
          <button
            onClick={handleSubmit}
            disabled={!textInput.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Service Request Card ──────────────────────

interface ServiceRequestCardProps {
  request: ServiceRequest;
  onConnect: (requestId: string, credentials: Record<string, string>) => void;
  onSkip: (requestId: string) => void;
}

export function ServiceRequestCard({ request, onConnect, onSkip }: ServiceRequestCardProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const allFilled = request.credentials.every((c) => values[c.key]?.trim());

  return (
    <div className="animate-card-in rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-emerald-400">
        <Plug className="h-4 w-4" />
        {request.serviceName} 연결 필요
      </div>

      <p className="mb-3 text-[12px] text-[#ccc]">{request.reason}</p>

      <div className="mb-3 space-y-2">
        {request.credentials.map((cred) => (
          <div key={cred.key}>
            <label className="mb-1 block text-[10px] text-[#888]">{cred.label}</label>
            <input
              type={cred.isSecret ? "password" : "text"}
              value={values[cred.key] || ""}
              onChange={(e) => setValues({ ...values, [cred.key]: e.target.value })}
              placeholder={cred.placeholder}
              className="no-hover-fill w-full rounded-lg border border-[#3A3A3A] bg-[#252525] px-3 py-2 font-mono text-[12px] text-white outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onConnect(request.id, values)}
          disabled={!allFilled}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <Plug className="h-3 w-3" />
          연결하기
        </button>
        <button
          onClick={() => onSkip(request.id)}
          className="rounded-lg px-3 py-2 text-[12px] text-[#888] hover:text-white"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}

// ─── Complete Card ─────────────────────────────

interface CompleteCardProps {
  summary: AgentCompleteSummary;
  onRollback?: () => void;
  onDeploy?: () => void;
}

export function CompleteCard({ summary, onRollback, onDeploy }: CompleteCardProps) {
  return (
    <div className="animate-card-in rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-emerald-400">
        <Check className="h-4 w-4" />
        작업 완료
      </div>

      <div className="mb-3 space-y-2 text-[12px]">
        {summary.filesCreated.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <FileCode className="h-3 w-3" />
              생성된 파일 ({summary.filesCreated.length})
            </div>
            <div className="mt-1 space-y-0.5 pl-5 font-mono text-[11px] text-[#999]">
              {summary.filesCreated.map((f) => <div key={f}>{f}</div>)}
            </div>
          </div>
        )}
        {summary.filesModified.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-yellow-400">
              <FileCode className="h-3 w-3" />
              수정된 파일 ({summary.filesModified.length})
            </div>
            <div className="mt-1 space-y-0.5 pl-5 font-mono text-[11px] text-[#999]">
              {summary.filesModified.map((f) => <div key={f}>{f}</div>)}
            </div>
          </div>
        )}
        {summary.packagesInstalled.length > 0 && (
          <div className="flex items-center gap-1.5 text-blue-400">
            <Package className="h-3 w-3" />
            설치된 패키지: {summary.packagesInstalled.join(", ")}
          </div>
        )}
        {summary.servicesConnected.length > 0 && (
          <div className="flex items-center gap-1.5 text-purple-400">
            <Plug className="h-3 w-3" />
            연결된 서비스: {summary.servicesConnected.join(", ")}
          </div>
        )}
        {summary.previewVerified && (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Shield className="h-3 w-3" />
            프리뷰 확인됨
          </div>
        )}
      </div>

      {summary.notes && (
        <p className="mb-3 text-[11px] text-[#888]">{summary.notes}</p>
      )}

      <div className="flex gap-2">
        {onRollback && (
          <button
            onClick={onRollback}
            className="flex items-center gap-1.5 rounded-lg bg-[#333] px-3 py-2 text-[12px] text-[#ccc] hover:bg-[#444]"
          >
            <RotateCcw className="h-3 w-3" />
            롤백
          </button>
        )}
        {onDeploy && (
          <button
            onClick={onDeploy}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-blue-500"
          >
            <Rocket className="h-3 w-3" />
            배포
          </button>
        )}
      </div>
    </div>
  );
}
