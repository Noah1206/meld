"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  GitBranch, Plus, ChevronLeft, Search, Sun, Moon, Play, Square,
  Settings, Trash2, ArrowRight, Circle, CheckCircle2, XCircle,
  Bot, Repeat, Split, Merge,
} from "lucide-react";

// Theme hook — shared implementation
import { useThemePref as useTheme } from "@/lib/hooks/useThemePref";

// Orchestration patterns (from Anthropic article)
const ORCHESTRATION_PATTERNS = [
  {
    id: "sequential",
    name: "Sequential",
    description: "에이전트들이 순차적으로 실행됩니다. 이전 에이전트의 출력이 다음 에이전트의 입력이 됩니다.",
    icon: ArrowRight,
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
  },
  {
    id: "parallel",
    name: "Parallel",
    description: "여러 에이전트가 동시에 실행됩니다. 독립적인 작업을 병렬로 처리합니다.",
    icon: Split,
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
  },
  {
    id: "loop",
    name: "Loop (GAN-style)",
    description: "Planner → Generator → Evaluator 패턴. 품질이 충족될 때까지 반복합니다.",
    icon: Repeat,
    color: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
  },
  {
    id: "router",
    name: "Router",
    description: "입력에 따라 적절한 에이전트로 라우팅합니다. 조건부 분기를 처리합니다.",
    icon: GitBranch,
    color: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-400",
  },
];

interface WorkflowStep {
  id: string;
  name: string;
  type: "agent" | "condition" | "merge";
  status: "pending" | "running" | "completed" | "failed";
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  pattern: string;
  steps: WorkflowStep[];
  status: "active" | "draft" | "archived";
  lastRun?: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const { isDark, toggle: toggleTheme, mounted } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: "1",
      name: "Plan-Code-Test",
      description: "계획 → 코딩 → 테스트 순서로 실행되는 기본 개발 워크플로우",
      pattern: "sequential",
      steps: [
        { id: "s1", name: "Planner", type: "agent", status: "completed" },
        { id: "s2", name: "Coder", type: "agent", status: "running" },
        { id: "s3", name: "Tester", type: "agent", status: "pending" },
      ],
      status: "active",
      lastRun: "5분 전",
    },
    {
      id: "2",
      name: "GAN Improvement",
      description: "생성 → 평가 → 개선 루프를 통한 품질 향상 워크플로우",
      pattern: "loop",
      steps: [
        { id: "s1", name: "Generator", type: "agent", status: "pending" },
        { id: "s2", name: "Evaluator", type: "agent", status: "pending" },
        { id: "s3", name: "Quality Check", type: "condition", status: "pending" },
      ],
      status: "draft",
    },
  ]);

  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted) return null;

  const getStepIcon = (step: WorkflowStep) => {
    if (step.status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (step.status === "failed") return <XCircle className="h-4 w-4 text-red-400" />;
    if (step.status === "running") return <Circle className="h-4 w-4 text-blue-400 animate-pulse" />;
    return <Circle className={`h-4 w-4 ${isDark ? "text-[#555]" : "text-[#CCC]"}`} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`min-h-screen ${isDark ? "bg-[#0D0D0D]" : "bg-[#FAFAFA]"}`}
    >
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl ${isDark ? "bg-[#0D0D0D]/80 border-b border-white/[0.06]" : "bg-[#FAFAFA]/80 border-b border-black/[0.06]"}`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/agents")}
              className={`flex items-center gap-2 text-[13px] font-medium transition-colors ${isDark ? "text-[#666] hover:text-[#999]" : "text-[#999] hover:text-[#666]"}`}
            >
              <ChevronLeft className="h-4 w-4" />
              Agents
            </button>
            <div className={`h-4 w-px ${isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"}`} />
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20`}>
                <GitBranch className="h-4 w-4 text-violet-400" />
              </div>
              <h1 className={`text-[15px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                Orchestration
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${isDark ? "bg-white/[0.06] text-[#E8E8E5] hover:bg-white/[0.1]" : "bg-black/[0.04] text-[#1A1A1A] hover:bg-black/[0.08]"}`}
            >
              <Plus className="h-3.5 w-3.5" />
              New Workflow
            </button>
            <button
              onClick={toggleTheme}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${isDark ? "text-[#555] hover:text-[#999] hover:bg-white/[0.04]" : "text-[#999] hover:text-[#1A1A1A] hover:bg-black/[0.03]"}`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className={`text-[15px] ${isDark ? "text-[#888]" : "text-[#666]"}`}>
            에이전트 간의 협업 방식과 실행 순서를 정의합니다. Anthropic의 GAN-style 3-agent 구조를 지원합니다.
          </p>
        </div>

        {/* Orchestration Patterns */}
        <div className="mb-10">
          <h3 className={`text-[12px] font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
            Orchestration Patterns
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {ORCHESTRATION_PATTERNS.map((pattern) => (
              <div
                key={pattern.id}
                className={`group relative flex flex-col rounded-xl p-4 text-left transition-all duration-200 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.12]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08]"}`}
              >
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity ${pattern.color}`} />
                <div className="relative">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg mb-3 ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
                    <pattern.icon className={`h-4 w-4 ${pattern.iconColor}`} />
                  </div>
                  <h4 className={`text-[13px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                    {pattern.name}
                  </h4>
                  <p className={`text-[11px] leading-relaxed ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                    {pattern.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 mb-6 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06]" : "bg-white ring-1 ring-black/[0.04]"}`}>
          <Search className={`h-4 w-4 ${isDark ? "text-[#555]" : "text-[#999]"}`} />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 bg-transparent text-[14px] outline-none ${isDark ? "text-[#E8E8E5] placeholder:text-[#555]" : "text-[#1A1A1A] placeholder:text-[#999]"}`}
          />
        </div>

        {/* Workflows list */}
        <div className="space-y-4">
          {filteredWorkflows.map((workflow) => {
            const pattern = ORCHESTRATION_PATTERNS.find((p) => p.id === workflow.pattern);
            return (
              <div
                key={workflow.id}
                className={`group rounded-xl p-5 transition-all ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.1]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08]"}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
                      {pattern && <pattern.icon className={`h-5 w-5 ${pattern.iconColor}`} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-[15px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                          {workflow.name}
                        </h4>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          workflow.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : workflow.status === "draft"
                            ? isDark ? "bg-white/[0.06] text-[#888]" : "bg-black/[0.04] text-[#999]"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {workflow.status.toUpperCase()}
                        </span>
                      </div>
                      <p className={`text-[12px] mt-0.5 ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                        {workflow.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"}`}>
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${isDark ? "hover:bg-white/[0.06] text-[#888]" : "hover:bg-black/[0.04] text-[#666]"}`}>
                      <Settings className="h-4 w-4" />
                    </button>
                    <button className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${isDark ? "hover:bg-white/[0.06] text-[#888]" : "hover:bg-black/[0.04] text-[#666]"}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Workflow steps visualization */}
                <div className={`rounded-lg p-4 ${isDark ? "bg-[#0D0D0D]" : "bg-[#F5F5F5]"}`}>
                  <div className="flex items-center gap-2">
                    {workflow.steps.map((step, i) => (
                      <div key={step.id} className="flex items-center">
                        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${isDark ? "bg-[#1A1A1A] ring-1 ring-white/[0.06]" : "bg-white ring-1 ring-black/[0.04]"}`}>
                          {getStepIcon(step)}
                          <span className={`text-[12px] font-medium ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                            {step.name}
                          </span>
                        </div>
                        {i < workflow.steps.length - 1 && (
                          <ArrowRight className={`h-4 w-4 mx-2 ${isDark ? "text-[#444]" : "text-[#CCC]"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                  {workflow.lastRun && (
                    <p className={`text-[11px] mt-3 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                      Last run: {workflow.lastRun}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </motion.div>
  );
}
