"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Bot, Wrench, Clock, Box, GitBranch, Plus, ChevronRight,
  Sun, Moon, ArrowLeft, Sparkles, Layers, Settings,
  Play, MoreHorizontal, Search, X, Send, MessageSquare,
  Paperclip, Mic, StopCircle, Trash2, Edit3, Copy,
} from "lucide-react";

// Theme hook — shared implementation
import { useThemePref as useTheme } from "@/lib/hooks/useThemePref";

// MCP server icons mapping
const MCP_ICONS: Record<string, string> = {
  github: "/mcp-icons/github.svg",
  figma: "/mcp-icons/figma.svg",
  vercel: "/mcp-icons/vercel.svg",
  supabase: "/mcp-icons/supabase.svg",
  sentry: "/mcp-icons/sentry.svg",
  filesystem: "/mcp-icons/filesystem.svg",
  slack: "/mcp-icons/slack.svg",
  notion: "/mcp-icons/notion.svg",
};

// Component cards for the harness architecture
const HARNESS_COMPONENTS = [
  {
    id: "tools",
    title: "Tools & MCP",
    description: "도구와 MCP 서버를 관리합니다. 에이전트가 사용할 수 있는 기능을 정의합니다.",
    icon: Wrench,
    href: "/agents/tools",
    emoji: "🔧",
    stats: { label: "연결됨", value: 14 },
  },
  {
    id: "sessions",
    title: "Sessions",
    description: "세션 템플릿을 관리합니다. 대화 컨텍스트와 상태를 정의합니다.",
    icon: Clock,
    href: "/agents/sessions",
    emoji: "⏱",
    stats: { label: "템플릿", value: 3 },
  },
  {
    id: "sandboxes",
    title: "Sandboxes",
    description: "실행 환경을 관리합니다. 코드 실행과 격리된 환경을 제공합니다.",
    icon: Box,
    href: "/agents/sandboxes",
    emoji: "📦",
    stats: { label: "환경", value: 2 },
  },
  {
    id: "workflows",
    title: "Orchestration",
    description: "워크플로우를 정의합니다. 에이전트 간 협업과 실행 순서를 관리합니다.",
    icon: GitBranch,
    href: "/agents/workflows",
    emoji: "🔀",
    stats: { label: "워크플로우", value: 1 },
  },
];

// Sample agents (user-created)
const SAMPLE_AGENTS = [
  {
    id: "1",
    name: "Full Stack Builder",
    description: "풀스택 앱을 자율적으로 개발하는 에이전트",
    tools: ["read_file", "write_file", "run_command", "web_search"],
    mcpServers: ["github", "vercel", "supabase"],
    session: "persistent",
    sandbox: "e2b-meld-agent",
    workflow: "plan-code-test",
    status: "active",
    lastRun: "2분 전",
  },
  {
    id: "2",
    name: "Code Reviewer",
    description: "코드 리뷰 및 개선 제안을 수행하는 에이전트",
    tools: ["read_file", "search_files", "browse_url"],
    mcpServers: ["github", "sentry"],
    session: "stateless",
    sandbox: "none",
    workflow: "analyze-suggest",
    status: "idle",
    lastRun: "1시간 전",
  },
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agentId?: string;
}

export default function AgentsPage() {
  const router = useRouter();
  const { isDark, toggle: toggleTheme, mounted } = useTheme();
  const [agents, setAgents] = useState(SAMPLE_AGENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<typeof SAMPLE_AGENTS[0] | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!chatInput.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsProcessing(true);

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAgentResponse(chatInput, selectedAgent),
        timestamp: new Date(),
        agentId: selectedAgent?.id,
      };
      setMessages((prev) => [...prev, agentResponse]);
      setIsProcessing(false);
    }, 1500);
  };

  const getAgentResponse = (input: string, agent: typeof SAMPLE_AGENTS[0] | null): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes("에이전트") && lowerInput.includes("목록")) {
      return `현재 ${agents.length}개의 에이전트가 등록되어 있습니다:\n\n${agents.map((a, i) => `${i + 1}. **${a.name}** - ${a.description}`).join("\n")}`;
    }

    if (lowerInput.includes("새") && (lowerInput.includes("에이전트") || lowerInput.includes("만들"))) {
      return "새 에이전트를 만들려면 우측 상단의 'New Agent' 버튼을 클릭하거나, 여기서 직접 설정을 도와드릴 수 있습니다.\n\n어떤 용도의 에이전트를 만들고 싶으신가요?";
    }

    if (agent) {
      if (lowerInput.includes("실행") || lowerInput.includes("시작")) {
        return `**${agent.name}**를 실행합니다...\n\n🔧 도구 ${agent.tools.length}개 로드됨\n📦 샌드박스: ${agent.sandbox}\n⏱ 세션: ${agent.session}\n\n에이전트가 준비되었습니다. 어떤 작업을 수행할까요?`;
      }

      if (lowerInput.includes("설정") || lowerInput.includes("수정")) {
        return `**${agent.name}** 설정:\n\n- 🔧 도구: ${agent.tools.join(", ")}\n- 🔌 MCP: ${agent.mcpServers.join(", ")}\n- 📦 샌드박스: ${agent.sandbox}\n- ⏱ 세션: ${agent.session}\n- 🔀 워크플로우: ${agent.workflow}\n\n어떤 설정을 변경하시겠습니까?`;
      }
    }

    return "무엇을 도와드릴까요? 에이전트 생성, 실행, 설정 변경 등을 요청하실 수 있습니다.";
  };

  const openChatWithAgent = (agent: typeof SAMPLE_AGENTS[0]) => {
    setSelectedAgent(agent);
    setIsChatOpen(true);
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: `**${agent.name}**와 대화를 시작합니다.\n\n이 에이전트는 ${agent.description.toLowerCase()}. 사용 가능한 도구: ${agent.tools.length}개, MCP 서버: ${agent.mcpServers.length}개\n\n무엇을 도와드릴까요?`,
      timestamp: new Date(),
      agentId: agent.id,
    }]);
  };

  const openGeneralChat = () => {
    setSelectedAgent(null);
    setIsChatOpen(true);
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Agent Platform에 오신 것을 환영합니다.\n\n에이전트 생성, 관리, 실행을 도와드릴 수 있습니다. 무엇을 도와드릴까요?",
      timestamp: new Date(),
    }]);
  };

  if (!mounted) return null;

  return (
    <div className={`min-h-screen flex ${isDark ? "bg-[#0D0D0D]" : "bg-[#FAFAFA]"}`}>
      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`flex-1 transition-all duration-300 ${isChatOpen ? "mr-[480px]" : ""}`}
      >
        {/* Header */}
        <header className={`sticky top-0 z-40 backdrop-blur-xl ${isDark ? "bg-[#0D0D0D]/80 border-b border-white/[0.06]" : "bg-[#FAFAFA]/80 border-b border-black/[0.06]"}`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/projects")}
                className={`flex items-center gap-2 text-[13px] font-medium transition-colors ${isDark ? "text-[#666] hover:text-[#999]" : "text-[#999] hover:text-[#666]"}`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className={`h-4 w-px ${isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"}`} />
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
                  <Bot className={`h-4 w-4 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`} />
                </div>
                <h1 className={`text-[15px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                  Agent Platform
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={openGeneralChat}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${isDark ? "bg-white/[0.06] text-[#E8E8E5] hover:bg-white/[0.1]" : "bg-black/[0.04] text-[#1A1A1A] hover:bg-black/[0.08]"}`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
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

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Hero section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className={`text-[32px] font-bold tracking-[-0.02em] ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                  Create Your Agents
                </h2>
                <p className={`mt-2 text-[15px] max-w-xl ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                  독립적인 컴포넌트들을 조합하여 나만의 AI 에이전트를 만드세요.
                  Anthropic Harness 아키텍처를 기반으로 설계되었습니다.
                </p>
              </div>
              <button
                onClick={() => router.push("/agents/create")}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold transition-all active:scale-[0.97] ${isDark ? "bg-white text-[#1A1A1A] hover:bg-[#E8E8E5]" : "bg-[#1A1A1A] text-white hover:bg-[#333]"}`}
              >
                <Plus className="h-4 w-4" />
                New Agent
              </button>
            </div>
          </motion.div>

          {/* Harness Architecture Diagram */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2 mb-4">
              <Layers className={`h-4 w-4 ${isDark ? "text-[#666]" : "text-[#999]"}`} />
              <h3 className={`text-[13px] font-semibold uppercase tracking-wider ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                Harness Components
              </h3>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {HARNESS_COMPONENTS.map((component, index) => (
                <motion.button
                  key={component.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                  onClick={() => router.push(component.href)}
                  className={`group relative flex flex-col rounded-2xl p-6 text-left transition-all duration-200 hover:-translate-y-1 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.12]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08] hover:shadow-lg"}`}
                >
                  <div className="relative">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
                      <span className="text-[24px] grayscale">{component.emoji}</span>
                    </div>
                    <h4 className={`text-[16px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                      {component.title}
                    </h4>
                    <p className={`text-[13px] leading-relaxed mb-4 ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                      {component.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[12px] ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                        {component.stats.value} {component.stats.label}
                      </span>
                      <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${isDark ? "text-[#555]" : "text-[#999]"}`} />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Center Harness connector */}
            <div className="relative mt-6">
              <div className={`absolute left-1/2 -translate-x-1/2 -top-3 h-6 w-px ${isDark ? "bg-gradient-to-b from-white/[0.1] to-transparent" : "bg-gradient-to-b from-black/[0.1] to-transparent"}`} />
              <div className={`flex items-center justify-center gap-3 rounded-2xl py-4 px-6 mx-auto w-fit ${isDark ? "bg-[#1A1A1A] ring-1 ring-white/[0.08]" : "bg-[#F5F5F5] ring-1 ring-black/[0.06]"}`}>
                <Sparkles className={`h-5 w-5 ${isDark ? "text-[#888]" : "text-[#666]"}`} />
                <span className={`text-[14px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                  Harness
                </span>
                <span className={`text-[13px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                  — 컴포넌트들을 조합하여 에이전트 생성
                </span>
              </div>
            </div>
          </motion.div>

          {/* My Agents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className={`h-4 w-4 ${isDark ? "text-[#666]" : "text-[#999]"}`} />
                <h3 className={`text-[13px] font-semibold uppercase tracking-wider ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                  My Agents
                </h3>
              </div>
              <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${isDark ? "bg-white/[0.04]" : "bg-black/[0.02]"}`}>
                <Search className={`h-3.5 w-3.5 ${isDark ? "text-[#555]" : "text-[#999]"}`} />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bg-transparent text-[13px] outline-none w-32 ${isDark ? "text-[#E8E8E5] placeholder:text-[#555]" : "text-[#1A1A1A] placeholder:text-[#999]"}`}
                />
              </div>
            </div>

            <div className="space-y-3">
              {agents.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`group flex items-center gap-4 rounded-xl p-4 transition-all cursor-pointer ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.1]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08]"}`}
                  onClick={() => openChatWithAgent(agent)}
                >
                  {/* MCP Icons Stack */}
                  <div className="relative h-12 w-12">
                    <div className={`absolute inset-0 flex items-center justify-center rounded-xl ${isDark ? "bg-[#1A1A1A]" : "bg-[#F0F0F0]"}`}>
                      {agent.mcpServers.slice(0, 3).map((mcp, idx) => (
                        <div
                          key={mcp}
                          className={`absolute h-6 w-6 rounded-full flex items-center justify-center ${isDark ? "bg-[#252525] ring-1 ring-white/[0.08]" : "bg-white ring-1 ring-black/[0.06]"}`}
                          style={{
                            transform: `translateX(${(idx - 1) * 10}px)`,
                            zIndex: 3 - idx,
                          }}
                        >
                          {MCP_ICONS[mcp] ? (
                            <Image
                              src={MCP_ICONS[mcp]}
                              alt={mcp}
                              width={14}
                              height={14}
                              className="grayscale"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-[#888]">{mcp[0].toUpperCase()}</span>
                          )}
                        </div>
                      ))}
                      {agent.mcpServers.length > 3 && (
                        <div
                          className={`absolute h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold ${isDark ? "bg-[#252525] ring-1 ring-white/[0.08] text-[#888]" : "bg-white ring-1 ring-black/[0.06] text-[#666]"}`}
                          style={{
                            transform: `translateX(${2 * 10}px)`,
                            zIndex: 0,
                          }}
                        >
                          +{agent.mcpServers.length - 3}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-[15px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                        {agent.name}
                      </h4>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        agent.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isDark ? "bg-white/[0.06] text-[#888]" : "bg-black/[0.04] text-[#999]"
                      }`}>
                        {agent.status === "active" ? "ACTIVE" : "IDLE"}
                      </span>
                    </div>
                    <p className={`text-[13px] mt-0.5 truncate ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                      {agent.description}
                    </p>
                    <div className={`flex items-center gap-3 mt-2 text-[11px] ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                      <span>{agent.tools.length} tools</span>
                      <span>•</span>
                      <span>{agent.mcpServers.length} MCP</span>
                      <span>•</span>
                      <span>{agent.sandbox}</span>
                      <span>•</span>
                      <span>Last run {agent.lastRun}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${isDark ? "hover:bg-white/[0.06] text-[#888]" : "hover:bg-black/[0.04] text-[#666]"}`}
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${isDark ? "hover:bg-white/[0.06] text-[#888]" : "hover:bg-black/[0.04] text-[#666]"}`}
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${isDark ? "hover:bg-white/[0.06] text-[#888]" : "hover:bg-black/[0.04] text-[#666]"}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {/* Create new agent card */}
              <button
                onClick={() => router.push("/agents/create")}
                className={`flex items-center justify-center gap-3 rounded-xl p-6 w-full border-2 border-dashed transition-all ${isDark ? "border-white/[0.08] hover:border-white/[0.15] text-[#555] hover:text-[#888]" : "border-black/[0.06] hover:border-black/[0.12] text-[#999] hover:text-[#666]"}`}
              >
                <Plus className="h-5 w-5" />
                <span className="text-[14px] font-medium">Create New Agent</span>
              </button>
            </div>
          </motion.div>
        </main>
      </motion.div>

      {/* Chat Panel - Full Height Slide */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`fixed right-0 top-0 bottom-0 w-[480px] z-50 flex flex-col ${isDark ? "bg-[#0D0D0D] border-l border-white/[0.06]" : "bg-white border-l border-black/[0.06]"}`}
          >
            {/* Chat Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? "border-white/[0.06]" : "border-black/[0.06]"}`}>
              <div className="flex items-center gap-3">
                {selectedAgent ? (
                  <>
                    <div className="relative h-9 w-9">
                      <div className={`absolute inset-0 flex items-center justify-center rounded-lg ${isDark ? "bg-[#1A1A1A]" : "bg-[#F0F0F0]"}`}>
                        {selectedAgent.mcpServers.slice(0, 2).map((mcp, idx) => (
                          <div
                            key={mcp}
                            className={`absolute h-5 w-5 rounded-full flex items-center justify-center ${isDark ? "bg-[#252525] ring-1 ring-white/[0.08]" : "bg-white ring-1 ring-black/[0.06]"}`}
                            style={{
                              transform: `translateX(${(idx - 0.5) * 8}px)`,
                              zIndex: 2 - idx,
                            }}
                          >
                            {MCP_ICONS[mcp] ? (
                              <Image
                                src={MCP_ICONS[mcp]}
                                alt={mcp}
                                width={12}
                                height={12}
                                className="grayscale"
                              />
                            ) : (
                              <span className="text-[8px] font-bold text-[#888]">{mcp[0].toUpperCase()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className={`text-[14px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                        {selectedAgent.name}
                      </h3>
                      <p className={`text-[11px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                        {selectedAgent.mcpServers.join(" • ")}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
                      <Bot className={`h-4 w-4 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`} />
                    </div>
                    <div>
                      <h3 className={`text-[14px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                        Agent Platform
                      </h3>
                      <p className={`text-[11px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                        에이전트 관리 어시스턴트
                      </p>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isDark ? "hover:bg-white/[0.06] text-[#666]" : "hover:bg-black/[0.04] text-[#999]"}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? isDark
                          ? "bg-white text-[#1A1A1A]"
                          : "bg-[#1A1A1A] text-white"
                        : isDark
                        ? "bg-[#1A1A1A] text-[#E8E8E5]"
                        : "bg-[#F5F5F5] text-[#1A1A1A]"
                    }`}
                  >
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p className={`text-[10px] mt-2 ${
                      message.role === "user"
                        ? isDark ? "text-[#666]" : "text-[#999]"
                        : isDark ? "text-[#555]" : "text-[#999]"
                    }`}>
                      {message.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className={`rounded-2xl px-4 py-3 ${isDark ? "bg-[#1A1A1A]" : "bg-[#F5F5F5]"}`}>
                    <div className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full animate-bounce ${isDark ? "bg-[#555]" : "bg-[#999]"}`} style={{ animationDelay: "0ms" }} />
                      <div className={`h-2 w-2 rounded-full animate-bounce ${isDark ? "bg-[#555]" : "bg-[#999]"}`} style={{ animationDelay: "150ms" }} />
                      <div className={`h-2 w-2 rounded-full animate-bounce ${isDark ? "bg-[#555]" : "bg-[#999]"}`} style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className={`px-5 py-4 border-t ${isDark ? "border-white/[0.06]" : "border-black/[0.06]"}`}>
              <div className={`flex items-end gap-3 rounded-2xl p-3 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06]" : "bg-[#F5F5F5] ring-1 ring-black/[0.04]"}`}>
                <button className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isDark ? "hover:bg-white/[0.06] text-[#555]" : "hover:bg-black/[0.04] text-[#999]"}`}>
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="메시지를 입력하세요..."
                  rows={1}
                  className={`flex-1 resize-none bg-transparent text-[14px] outline-none max-h-32 ${isDark ? "text-[#E8E8E5] placeholder:text-[#555]" : "text-[#1A1A1A] placeholder:text-[#999]"}`}
                  style={{ minHeight: "24px" }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isProcessing}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    chatInput.trim() && !isProcessing
                      ? isDark
                        ? "bg-white text-[#1A1A1A] hover:bg-[#E8E8E5]"
                        : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                      : isDark
                      ? "bg-white/[0.06] text-[#555]"
                      : "bg-black/[0.04] text-[#999]"
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className={`text-[11px] mt-2 text-center ${isDark ? "text-[#444]" : "text-[#BBB]"}`}>
                에이전트 실행, 설정 변경, 새 에이전트 생성 등을 요청하세요
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
