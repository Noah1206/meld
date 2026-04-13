"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Wrench, Clock, Box, GitBranch, ChevronLeft, ChevronRight,
  Sun, Moon, Sparkles, Check, Plus, X, Search, Zap, Play,
  FileText, Terminal, Globe, Eye, Trash2, PenLine, FolderSearch,
} from "lucide-react";
import Image from "next/image";

// Theme hook — shared implementation
import { useThemePref as useTheme } from "@/lib/hooks/useThemePref";

// Available tools
const AVAILABLE_TOOLS = [
  { id: "read_file", name: "Read File", icon: FileText },
  { id: "write_file", name: "Write File", icon: PenLine },
  { id: "delete_file", name: "Delete File", icon: Trash2 },
  { id: "list_files", name: "List Files", icon: FolderSearch },
  { id: "search_files", name: "Search Files", icon: Search },
  { id: "run_command", name: "Run Command", icon: Terminal },
  { id: "web_search", name: "Web Search", icon: Globe },
  { id: "browse_url", name: "Browse URL", icon: Eye },
];

// Available MCP servers
const AVAILABLE_MCP = [
  { id: "github", name: "GitHub", logo: "/mcp-icons/github.svg" },
  { id: "figma", name: "Figma", logo: "/mcp-icons/figma.svg" },
  { id: "supabase", name: "Supabase", logo: "/mcp-icons/supabase.svg" },
  { id: "vercel", name: "Vercel", logo: "/mcp-icons/vercel.svg" },
  { id: "notion", name: "Notion", logo: "/mcp-icons/notion.svg" },
  { id: "sentry", name: "Sentry", logo: "/mcp-icons/sentry.svg" },
];

// Session types
const SESSION_TYPES = [
  { id: "persistent", name: "Persistent", description: "대화 기록 유지" },
  { id: "stateless", name: "Stateless", description: "독립적 처리" },
  { id: "conversation", name: "Conversation", description: "대화형 최적화" },
];

// Sandbox types
const SANDBOX_TYPES = [
  { id: "e2b-meld-agent", name: "E2B Cloud", description: "Node.js 22 + pnpm" },
  { id: "local", name: "Local", description: "로컬 파일 시스템" },
  { id: "none", name: "None", description: "샌드박스 없음" },
];

// Orchestration patterns
const ORCHESTRATION_PATTERNS = [
  { id: "sequential", name: "Sequential", description: "순차 실행" },
  { id: "parallel", name: "Parallel", description: "병렬 실행" },
  { id: "loop", name: "Loop", description: "GAN-style 반복" },
  { id: "router", name: "Router", description: "조건부 분기" },
];

// Steps
const STEPS = [
  { id: 1, title: "Basic Info", icon: Bot },
  { id: 2, title: "Tools & MCP", icon: Wrench },
  { id: 3, title: "Session", icon: Clock },
  { id: 4, title: "Sandbox", icon: Box },
  { id: 5, title: "Orchestration", icon: GitBranch },
  { id: 6, title: "Review", icon: Sparkles },
];

interface AgentConfig {
  name: string;
  description: string;
  tools: string[];
  mcpServers: string[];
  sessionType: string;
  sandboxType: string;
  orchestration: string;
  maxRounds: number;
  maxTokens: number;
}

export default function CreateAgentPage() {
  const router = useRouter();
  const { isDark, toggle: toggleTheme, mounted } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<AgentConfig>({
    name: "",
    description: "",
    tools: ["read_file", "write_file", "run_command"],
    mcpServers: [],
    sessionType: "persistent",
    sandboxType: "e2b-meld-agent",
    orchestration: "sequential",
    maxRounds: 50,
    maxTokens: 16384,
  });

  const toggleTool = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      tools: prev.tools.includes(id)
        ? prev.tools.filter((t) => t !== id)
        : [...prev.tools, id],
    }));
  };

  const toggleMCP = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      mcpServers: prev.mcpServers.includes(id)
        ? prev.mcpServers.filter((m) => m !== id)
        : [...prev.mcpServers, id],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return config.name.trim().length > 0;
      case 2:
        return config.tools.length > 0;
      default:
        return true;
    }
  };

  const handleCreate = () => {
    // Save agent config
    const agents = JSON.parse(localStorage.getItem("meld-agents") || "[]");
    agents.push({ ...config, id: Date.now().toString(), createdAt: new Date().toISOString() });
    localStorage.setItem("meld-agents", JSON.stringify(agents));
    router.push("/agents");
  };

  if (!mounted) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`min-h-screen ${isDark ? "bg-[#0D0D0D]" : "bg-[#FAFAFA]"}`}
    >
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl ${isDark ? "bg-[#0D0D0D]/80 border-b border-white/[0.06]" : "bg-[#FAFAFA]/80 border-b border-black/[0.06]"}`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/agents")}
              className={`flex items-center gap-2 text-[13px] font-medium transition-colors ${isDark ? "text-[#666] hover:text-[#999]" : "text-[#999] hover:text-[#666]"}`}
            >
              <ChevronLeft className="h-4 w-4" />
              Cancel
            </button>
            <div className={`h-4 w-px ${isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"}`} />
            <h1 className={`text-[15px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
              Create Agent
            </h1>
          </div>
          <button
            onClick={toggleTheme}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${isDark ? "text-[#555] hover:text-[#999] hover:bg-white/[0.04]" : "text-[#999] hover:text-[#1A1A1A] hover:bg-black/[0.03]"}`}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Progress steps */}
      <div className={`border-b ${isDark ? "border-white/[0.06]" : "border-black/[0.06]"}`}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                    step.id === currentStep
                      ? isDark ? "bg-white/[0.08] text-[#E8E8E5]" : "bg-black/[0.05] text-[#1A1A1A]"
                      : step.id < currentStep
                      ? isDark ? "text-emerald-400" : "text-emerald-600"
                      : isDark ? "text-[#555]" : "text-[#CCC]"
                  }`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    step.id === currentStep
                      ? isDark ? "bg-white/[0.12] text-white" : "bg-black/[0.1] text-[#1A1A1A]"
                      : step.id < currentStep
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isDark ? "bg-white/[0.04]" : "bg-black/[0.04]"
                  }`}>
                    {step.id < currentStep ? <Check className="h-3 w-3" /> : step.id}
                  </div>
                  <span className="text-[12px] font-medium hidden sm:block">{step.title}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px mx-2 ${
                    step.id < currentStep
                      ? "bg-emerald-500/40"
                      : isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className={`text-[24px] font-bold mb-2 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                Name your agent
              </h2>
              <p className={`text-[14px] mb-8 ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                에이전트의 이름과 설명을 입력하세요.
              </p>

              <div className="space-y-6">
                <div>
                  <label className={`block text-[13px] font-medium mb-2 ${isDark ? "text-[#999]" : "text-[#666]"}`}>
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    placeholder="e.g., Full Stack Builder"
                    className={`w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-all ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] text-[#E8E8E5] placeholder:text-[#555] focus:ring-white/[0.12]" : "bg-white ring-1 ring-black/[0.06] text-[#1A1A1A] placeholder:text-[#999] focus:ring-black/[0.12]"}`}
                  />
                </div>
                <div>
                  <label className={`block text-[13px] font-medium mb-2 ${isDark ? "text-[#999]" : "text-[#666]"}`}>
                    Description
                  </label>
                  <textarea
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    placeholder="What does this agent do?"
                    rows={3}
                    className={`w-full rounded-xl px-4 py-3 text-[15px] outline-none resize-none transition-all ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] text-[#E8E8E5] placeholder:text-[#555] focus:ring-white/[0.12]" : "bg-white ring-1 ring-black/[0.06] text-[#1A1A1A] placeholder:text-[#999] focus:ring-black/[0.12]"}`}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Tools & MCP */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className={`text-[24px] font-bold mb-2 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                Select tools
              </h2>
              <p className={`text-[14px] mb-8 ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                에이전트가 사용할 도구와 MCP 서버를 선택하세요.
              </p>

              <div className="mb-8">
                <h3 className={`text-[12px] font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                  Built-in Tools
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {AVAILABLE_TOOLS.map((tool) => {
                    const isSelected = config.tools.includes(tool.id);
                    return (
                      <button
                        key={tool.id}
                        onClick={() => toggleTool(tool.id)}
                        className={`flex flex-col items-center gap-2 rounded-xl p-4 transition-all ${
                          isSelected
                            ? isDark ? "bg-violet-500/20 ring-1 ring-violet-500/40 text-violet-400" : "bg-violet-500/10 ring-1 ring-violet-500/30 text-violet-600"
                            : isDark ? "bg-[#151515] ring-1 ring-white/[0.06] text-[#888] hover:ring-white/[0.1]" : "bg-white ring-1 ring-black/[0.04] text-[#666] hover:ring-black/[0.08]"
                        }`}
                      >
                        <tool.icon className="h-5 w-5" />
                        <span className="text-[11px] font-medium text-center">{tool.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className={`text-[12px] font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                  MCP Servers
                </h3>
                <div className="grid grid-cols-6 gap-3">
                  {AVAILABLE_MCP.map((mcp) => {
                    const isSelected = config.mcpServers.includes(mcp.id);
                    return (
                      <button
                        key={mcp.id}
                        onClick={() => toggleMCP(mcp.id)}
                        className={`flex flex-col items-center gap-2 rounded-xl p-3 transition-all ${
                          isSelected
                            ? isDark ? "bg-blue-500/20 ring-1 ring-blue-500/40" : "bg-blue-500/10 ring-1 ring-blue-500/30"
                            : isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.1]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08]"
                        }`}
                      >
                        <Image src={mcp.logo} alt={mcp.name} width={24} height={24} className="rounded" />
                        <span className={`text-[10px] font-medium ${isDark ? "text-[#888]" : "text-[#666]"}`}>{mcp.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Session */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className={`text-[24px] font-bold mb-2 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                Configure session
              </h2>
              <p className={`text-[14px] mb-8 ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                세션 타입과 설정을 선택하세요.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {SESSION_TYPES.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setConfig({ ...config, sessionType: session.id })}
                    className={`flex flex-col rounded-xl p-5 text-left transition-all ${
                      config.sessionType === session.id
                        ? isDark ? "bg-amber-500/20 ring-1 ring-amber-500/40" : "bg-amber-500/10 ring-1 ring-amber-500/30"
                        : isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.1]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08]"
                    }`}
                  >
                    <h4 className={`text-[14px] font-semibold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                      {session.name}
                    </h4>
                    <p className={`text-[12px] ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                      {session.description}
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`block text-[13px] font-medium mb-2 ${isDark ? "text-[#999]" : "text-[#666]"}`}>
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 16384 })}
                    className={`w-full rounded-xl px-4 py-3 text-[15px] outline-none ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] text-[#E8E8E5]" : "bg-white ring-1 ring-black/[0.06] text-[#1A1A1A]"}`}
                  />
                </div>
                <div>
                  <label className={`block text-[13px] font-medium mb-2 ${isDark ? "text-[#999]" : "text-[#666]"}`}>
                    Max Rounds
                  </label>
                  <input
                    type="number"
                    value={config.maxRounds}
                    onChange={(e) => setConfig({ ...config, maxRounds: parseInt(e.target.value) || 50 })}
                    className={`w-full rounded-xl px-4 py-3 text-[15px] outline-none ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] text-[#E8E8E5]" : "bg-white ring-1 ring-black/[0.06] text-[#1A1A1A]"}`}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Sandbox */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className={`text-[24px] font-bold mb-2 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                Choose sandbox
              </h2>
              <p className={`text-[14px] mb-8 ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                코드 실행 환경을 선택하세요.
              </p>

              <div className="grid grid-cols-3 gap-4">
                {SANDBOX_TYPES.map((sandbox) => (
                  <button
                    key={sandbox.id}
                    onClick={() => setConfig({ ...config, sandboxType: sandbox.id })}
                    className={`flex flex-col rounded-xl p-5 text-left transition-all ${
                      config.sandboxType === sandbox.id
                        ? isDark ? "bg-emerald-500/20 ring-1 ring-emerald-500/40" : "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                        : isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.1]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08]"
                    }`}
                  >
                    <h4 className={`text-[14px] font-semibold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                      {sandbox.name}
                    </h4>
                    <p className={`text-[12px] ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                      {sandbox.description}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 5: Orchestration */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className={`text-[24px] font-bold mb-2 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                Orchestration pattern
              </h2>
              <p className={`text-[14px] mb-8 ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                에이전트의 실행 패턴을 선택하세요.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {ORCHESTRATION_PATTERNS.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => setConfig({ ...config, orchestration: pattern.id })}
                    className={`flex flex-col rounded-xl p-5 text-left transition-all ${
                      config.orchestration === pattern.id
                        ? isDark ? "bg-violet-500/20 ring-1 ring-violet-500/40" : "bg-violet-500/10 ring-1 ring-violet-500/30"
                        : isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.1]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08]"
                    }`}
                  >
                    <h4 className={`text-[14px] font-semibold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                      {pattern.name}
                    </h4>
                    <p className={`text-[12px] ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                      {pattern.description}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className={`text-[24px] font-bold mb-2 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                Review & Create
              </h2>
              <p className={`text-[14px] mb-8 ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                설정을 확인하고 에이전트를 생성하세요.
              </p>

              <div className={`rounded-2xl p-6 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06]" : "bg-white ring-1 ring-black/[0.04]"}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${isDark ? "bg-gradient-to-br from-violet-500/20 to-blue-500/20" : "bg-gradient-to-br from-violet-500/10 to-blue-500/10"}`}>
                    <Bot className="h-7 w-7 text-violet-400" />
                  </div>
                  <div>
                    <h3 className={`text-[18px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                      {config.name || "Untitled Agent"}
                    </h3>
                    <p className={`text-[13px] ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                      {config.description || "No description"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                      Tools ({config.tools.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {config.tools.map((t) => (
                        <span key={t} className={`rounded-full px-2.5 py-1 text-[11px] ${isDark ? "bg-white/[0.06] text-[#888]" : "bg-black/[0.04] text-[#666]"}`}>
                          {AVAILABLE_TOOLS.find((tool) => tool.id === t)?.name || t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                      MCP Servers ({config.mcpServers.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {config.mcpServers.length > 0 ? config.mcpServers.map((m) => (
                        <span key={m} className={`rounded-full px-2.5 py-1 text-[11px] ${isDark ? "bg-white/[0.06] text-[#888]" : "bg-black/[0.04] text-[#666]"}`}>
                          {AVAILABLE_MCP.find((mcp) => mcp.id === m)?.name || m}
                        </span>
                      )) : (
                        <span className={`text-[11px] ${isDark ? "text-[#555]" : "text-[#999]"}`}>None</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                      Session
                    </h4>
                    <p className={`text-[13px] ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                      {SESSION_TYPES.find((s) => s.id === config.sessionType)?.name} · {config.maxTokens.toLocaleString()} tokens · {config.maxRounds} rounds
                    </p>
                  </div>
                  <div>
                    <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                      Sandbox
                    </h4>
                    <p className={`text-[13px] ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                      {SANDBOX_TYPES.find((s) => s.id === config.sandboxType)?.name}
                    </p>
                  </div>
                  <div>
                    <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                      Orchestration
                    </h4>
                    <p className={`text-[13px] ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                      {ORCHESTRATION_PATTERNS.find((p) => p.id === config.orchestration)?.name}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/[0.06]">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-30 ${isDark ? "text-[#888] hover:text-[#E8E8E5] hover:bg-white/[0.04]" : "text-[#666] hover:text-[#1A1A1A] hover:bg-black/[0.04]"}`}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {currentStep < 6 ? (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
              disabled={!canProceed()}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-30 ${isDark ? "bg-white text-[#1A1A1A] hover:bg-[#E8E8E5]" : "bg-[#1A1A1A] text-white hover:bg-[#333]"}`}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Create Agent
            </button>
          )}
        </div>
      </main>
    </motion.div>
  );
}
