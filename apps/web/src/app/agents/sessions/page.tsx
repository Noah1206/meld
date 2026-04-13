"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clock, Plus, ChevronLeft, Search, Sun, Moon, MessageSquare,
  Database, RefreshCw, Trash2, Settings, MoreHorizontal, Check,
} from "lucide-react";

// Theme hook — shared implementation
import { useThemePref as useTheme } from "@/lib/hooks/useThemePref";

// Session templates
const SESSION_TEMPLATES = [
  {
    id: "persistent",
    name: "Persistent Session",
    description: "대화 기록과 컨텍스트를 유지합니다. 장기 프로젝트에 적합합니다.",
    icon: Database,
    features: ["대화 히스토리 저장", "컨텍스트 유지", "세션 재개 가능"],
    color: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
  },
  {
    id: "stateless",
    name: "Stateless Session",
    description: "각 요청이 독립적으로 처리됩니다. 빠른 응답이 필요할 때 사용합니다.",
    icon: RefreshCw,
    features: ["빠른 응답 시간", "리소스 효율적", "독립적 처리"],
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
  },
  {
    id: "conversation",
    name: "Conversation Session",
    description: "대화형 인터랙션에 최적화되어 있습니다. 사용자와의 대화에 적합합니다.",
    icon: MessageSquare,
    features: ["자연스러운 대화", "문맥 이해", "다중 턴 지원"],
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
  },
];

interface SessionConfig {
  id: string;
  name: string;
  template: string;
  maxTokens: number;
  timeout: number;
  createdAt: string;
}

export default function SessionsPage() {
  const router = useRouter();
  const { isDark, toggle: toggleTheme, mounted } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<SessionConfig[]>([
    { id: "1", name: "Default Session", template: "persistent", maxTokens: 16384, timeout: 30, createdAt: "2024-01-15" },
    { id: "2", name: "Quick Tasks", template: "stateless", maxTokens: 4096, timeout: 5, createdAt: "2024-01-20" },
  ]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const filteredSessions = sessions.filter(
    (s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())
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
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20`}>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <h1 className={`text-[15px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                Sessions
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewModal(true)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${isDark ? "bg-white/[0.06] text-[#E8E8E5] hover:bg-white/[0.1]" : "bg-black/[0.04] text-[#1A1A1A] hover:bg-black/[0.08]"}`}
            >
              <Plus className="h-3.5 w-3.5" />
              New Session
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
            세션 템플릿을 관리합니다. 세션은 에이전트의 대화 컨텍스트와 상태를 정의합니다.
          </p>
        </div>

        {/* Templates */}
        <div className="mb-10">
          <h3 className={`text-[12px] font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
            Session Templates
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {SESSION_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`group relative flex flex-col rounded-xl p-5 text-left transition-all duration-200 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.12]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08]"}`}
              >
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity ${template.color}`} />
                <div className="relative">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg mb-3 ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
                    <template.icon className={`h-5 w-5 ${template.iconColor}`} />
                  </div>
                  <h4 className={`text-[14px] font-bold mb-1 ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                    {template.name}
                  </h4>
                  <p className={`text-[12px] leading-relaxed mb-3 ${isDark ? "text-[#888]" : "text-[#666]"}`}>
                    {template.description}
                  </p>
                  <div className="space-y-1">
                    {template.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className={`h-3 w-3 ${isDark ? "text-[#555]" : "text-[#999]"}`} />
                        <span className={`text-[11px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 mb-6 ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06]" : "bg-white ring-1 ring-black/[0.04]"}`}>
          <Search className={`h-4 w-4 ${isDark ? "text-[#555]" : "text-[#999]"}`} />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 bg-transparent text-[14px] outline-none ${isDark ? "text-[#E8E8E5] placeholder:text-[#555]" : "text-[#1A1A1A] placeholder:text-[#999]"}`}
          />
        </div>

        {/* Sessions list */}
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const template = SESSION_TEMPLATES.find((t) => t.id === session.template);
            return (
              <div
                key={session.id}
                className={`group flex items-center gap-4 rounded-xl p-4 transition-all ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.1]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08]"}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
                  {template && <template.icon className={`h-5 w-5 ${template.iconColor}`} />}
                </div>
                <div className="flex-1">
                  <h4 className={`text-[14px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                    {session.name}
                  </h4>
                  <div className={`flex items-center gap-3 mt-1 text-[12px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                    <span>{template?.name}</span>
                    <span>•</span>
                    <span>{session.maxTokens.toLocaleString()} tokens</span>
                    <span>•</span>
                    <span>{session.timeout}min timeout</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isDark ? "hover:bg-white/[0.06] text-[#888]" : "hover:bg-black/[0.04] text-[#666]"}`}>
                    <Settings className="h-4 w-4" />
                  </button>
                  <button className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isDark ? "hover:bg-white/[0.06] text-[#888]" : "hover:bg-black/[0.04] text-[#666]"}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </motion.div>
  );
}
