"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench, Plus, ChevronLeft, Search, Check, X, ExternalLink,
  Sun, Moon, FileText, Terminal, Globe, Eye, Trash2, PenLine,
  FolderSearch, Loader2, Zap,
} from "lucide-react";
import Image from "next/image";

// Theme hook — shared implementation
import { useThemePref as useTheme } from "@/lib/hooks/useThemePref";

// Built-in agent tools (from CLAUDE.md)
const BUILTIN_TOOLS = [
  { id: "read_file", name: "Read File", description: "파일 내용을 읽습니다", icon: FileText, category: "filesystem" },
  { id: "write_file", name: "Write File", description: "파일을 생성하거나 덮어씁니다", icon: PenLine, category: "filesystem" },
  { id: "delete_file", name: "Delete File", description: "파일 또는 디렉토리를 삭제합니다", icon: Trash2, category: "filesystem" },
  { id: "rename_file", name: "Rename File", description: "파일을 이동하거나 이름을 변경합니다", icon: FileText, category: "filesystem" },
  { id: "list_files", name: "List Files", description: "디렉토리의 파일 목록을 조회합니다", icon: FolderSearch, category: "filesystem" },
  { id: "search_files", name: "Search Files", description: "파일 내용을 grep 검색합니다", icon: Search, category: "filesystem" },
  { id: "run_command", name: "Run Command", description: "셸 명령어를 실행합니다", icon: Terminal, category: "system" },
  { id: "web_search", name: "Web Search", description: "Google 검색을 수행합니다 (Serper)", icon: Globe, category: "web" },
  { id: "browse_url", name: "Browse URL", description: "URL을 스크래핑하고 Vision AI로 분석합니다", icon: Eye, category: "web" },
];

// MCP Servers (from projects page)
const MCP_SERVERS = [
  { id: "github", name: "GitHub", logo: "/mcp-icons/github.svg", description: "코드 검색, 파일 탐색, PR 생성" },
  { id: "figma", name: "Figma", logo: "/mcp-icons/figma.svg", description: "디자인 토큰 추출, 프레임 렌더링" },
  { id: "vercel", name: "Vercel", logo: "/mcp-icons/vercel.svg", description: "배포 프리뷰, 환경 변수 관리" },
  { id: "supabase", name: "Supabase", logo: "/mcp-icons/supabase.svg", description: "DB 스키마 읽기, SQL 쿼리" },
  { id: "sentry", name: "Sentry", logo: "/mcp-icons/sentry.svg", description: "에러 분석, 스택 트레이스" },
  { id: "linear", name: "Linear", logo: "/mcp-icons/linear.svg", description: "이슈 관리, 프로젝트 컨텍스트" },
  { id: "notion", name: "Notion", logo: "/mcp-icons/notion.svg", description: "문서 읽기, 스펙 참조" },
  { id: "slack", name: "Slack", logo: "/mcp-icons/slack.svg", description: "메시지 검색, 팀 컨텍스트" },
  { id: "gmail", name: "Gmail", logo: "/mcp-icons/gmail.svg", description: "이메일 검색, 답장 작성" },
  { id: "filesystem", name: "Filesystem", logo: "/mcp-icons/filesystem.svg", description: "로컬 파일 읽기/쓰기" },
  { id: "canva", name: "Canva", logo: "/mcp-icons/canva.svg", description: "디자인 검색, 생성, 내보내기" },
  { id: "stripe", name: "Stripe", logo: "/mcp-icons/stripe.svg", description: "결제, 구독 관리" },
  { id: "toss-payments", name: "Toss Payments", logo: "/mcp-icons/toss.svg", description: "한국 결제 연동" },
  { id: "portone", name: "PortOne", logo: "/mcp-icons/portone.svg", description: "통합 PG 연동" },
];

interface ToolConfig {
  id: string;
  enabled: boolean;
}

interface MCPConfig {
  id: string;
  connected: boolean;
}

export default function ToolsPage() {
  const router = useRouter();
  const { isDark, toggle: toggleTheme, mounted } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"tools" | "mcp">("tools");
  const [tools, setTools] = useState<ToolConfig[]>(
    BUILTIN_TOOLS.map((t) => ({ id: t.id, enabled: true }))
  );
  const [mcpServers, setMcpServers] = useState<MCPConfig[]>(
    MCP_SERVERS.map((s) => ({ id: s.id, connected: false }))
  );

  const toggleTool = (id: string) => {
    setTools((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const toggleMCP = (id: string) => {
    setMcpServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, connected: !s.connected } : s))
    );
  };

  const filteredTools = BUILTIN_TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMCP = MCP_SERVERS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20`}>
                <Wrench className="h-4 w-4 text-blue-400" />
              </div>
              <h1 className={`text-[15px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                Tools & MCP
              </h1>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${isDark ? "text-[#555] hover:text-[#999] hover:bg-white/[0.04]" : "text-[#999] hover:text-[#1A1A1A] hover:bg-black/[0.03]"}`}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Description */}
        <div className="mb-8">
          <p className={`text-[15px] ${isDark ? "text-[#888]" : "text-[#666]"}`}>
            에이전트가 사용할 수 있는 도구와 MCP 서버를 관리합니다.
            활성화된 도구는 에이전트 생성 시 선택할 수 있습니다.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6">
          <button
            onClick={() => setActiveTab("tools")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
              activeTab === "tools"
                ? isDark ? "bg-white/[0.08] text-[#E8E8E5]" : "bg-black/[0.05] text-[#1A1A1A]"
                : isDark ? "text-[#666] hover:text-[#999]" : "text-[#999] hover:text-[#666]"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            Built-in Tools
            <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
              {tools.filter((t) => t.enabled).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("mcp")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
              activeTab === "mcp"
                ? isDark ? "bg-white/[0.08] text-[#E8E8E5]" : "bg-black/[0.05] text-[#1A1A1A]"
                : isDark ? "text-[#666] hover:text-[#999]" : "text-[#999] hover:text-[#666]"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            MCP Servers
            <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
              {mcpServers.filter((s) => s.connected).length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 mb-6 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06]" : "bg-white ring-1 ring-black/[0.04]"}`}>
          <Search className={`h-4 w-4 ${isDark ? "text-[#555]" : "text-[#999]"}`} />
          <input
            type="text"
            placeholder={activeTab === "tools" ? "Search tools..." : "Search MCP servers..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 bg-transparent text-[14px] outline-none ${isDark ? "text-[#E8E8E5] placeholder:text-[#555]" : "text-[#1A1A1A] placeholder:text-[#999]"}`}
          />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "tools" ? (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Tools by category */}
              {["filesystem", "system", "web"].map((category) => {
                const categoryTools = filteredTools.filter((t) => t.category === category);
                if (categoryTools.length === 0) return null;
                return (
                  <div key={category} className="mb-8">
                    <h3 className={`text-[12px] font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
                      {category === "filesystem" ? "File System" : category === "system" ? "System" : "Web"}
                    </h3>
                    <div className="space-y-2">
                      {categoryTools.map((tool) => {
                        const config = tools.find((t) => t.id === tool.id);
                        const isEnabled = config?.enabled ?? false;
                        return (
                          <div
                            key={tool.id}
                            className={`flex items-center gap-4 rounded-xl p-4 transition-all ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06]" : "bg-white ring-1 ring-black/[0.04]"}`}
                          >
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
                              <tool.icon className={`h-5 w-5 ${isDark ? "text-[#888]" : "text-[#666]"}`} />
                            </div>
                            <div className="flex-1">
                              <h4 className={`text-[14px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                                {tool.name}
                              </h4>
                              <p className={`text-[12px] mt-0.5 ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                                {tool.description}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleTool(tool.id)}
                              className={`flex h-8 w-14 items-center rounded-full px-1 transition-all ${
                                isEnabled
                                  ? "bg-emerald-500 justify-end"
                                  : isDark ? "bg-white/[0.08] justify-start" : "bg-black/[0.08] justify-start"
                              }`}
                            >
                              <div className={`h-6 w-6 rounded-full ${isEnabled ? "bg-white" : isDark ? "bg-[#666]" : "bg-[#999]"}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="mcp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {filteredMCP.map((server) => {
                const config = mcpServers.find((s) => s.id === server.id);
                const isConnected = config?.connected ?? false;
                return (
                  <div
                    key={server.id}
                    className={`flex items-center gap-4 rounded-xl p-4 transition-all ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06]" : "bg-white ring-1 ring-black/[0.04]"}`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDark ? "bg-[#111]" : "bg-[#F5F5F5]"}`}>
                      <Image src={server.logo} alt={server.name} width={24} height={24} className="rounded" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[14px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                        {server.name}
                      </h4>
                      <p className={`text-[12px] mt-0.5 truncate ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                        {server.description}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleMCP(server.id)}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                        isConnected
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isDark ? "bg-white/[0.06] text-[#888] hover:bg-white/[0.1]" : "bg-black/[0.04] text-[#666] hover:bg-black/[0.08]"
                      }`}
                    >
                      {isConnected ? "Connected" : "Connect"}
                    </button>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
}
