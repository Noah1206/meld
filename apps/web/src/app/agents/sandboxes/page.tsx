"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Box, Plus, ChevronLeft, Search, Sun, Moon, Cloud, HardDrive,
  Server, Settings, Trash2, Play, Square, RefreshCw, Check, Cpu,
} from "lucide-react";

// Theme hook — shared implementation
import { useThemePref as useTheme } from "@/lib/hooks/useThemePref";

// Sandbox templates
const SANDBOX_TEMPLATES = [
  {
    id: "e2b-meld-agent",
    name: "E2B Cloud Sandbox",
    description: "E2B 클라우드에서 실행되는 격리된 환경입니다. Node.js 22 + pnpm + Playwright가 설치되어 있습니다.",
    icon: Cloud,
    features: ["Node.js 22", "pnpm", "Playwright", "30분 타임아웃"],
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
    type: "cloud",
  },
  {
    id: "local",
    name: "Local Filesystem",
    description: "로컬 파일 시스템에서 직접 실행됩니다. 샌드박스 없이 실제 파일에 접근합니다.",
    icon: HardDrive,
    features: ["실제 파일 접근", "빠른 실행", "제한 없음"],
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    type: "local",
  },
  {
    id: "none",
    name: "No Sandbox",
    description: "샌드박스 없이 실행됩니다. 파일 시스템 접근이 필요 없는 분석 작업에 적합합니다.",
    icon: Cpu,
    features: ["파일 접근 없음", "분석 전용", "빠른 응답"],
    color: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
    type: "none",
  },
];

interface SandboxConfig {
  id: string;
  name: string;
  template: string;
  status: "running" | "stopped" | "error";
  timeout: number;
  createdAt: string;
  lastUsed?: string;
}

export default function SandboxesPage() {
  const router = useRouter();
  const { isDark, toggle: toggleTheme, mounted } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [sandboxes, setSandboxes] = useState<SandboxConfig[]>([
    { id: "1", name: "Default E2B", template: "e2b-meld-agent", status: "stopped", timeout: 30, createdAt: "2024-01-15", lastUsed: "2분 전" },
    { id: "2", name: "Local Dev", template: "local", status: "running", timeout: 60, createdAt: "2024-01-20", lastUsed: "방금" },
  ]);

  const filteredSandboxes = sandboxes.filter(
    (s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSandbox = (id: string) => {
    setSandboxes((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "running" ? "stopped" : "running" }
          : s
      )
    );
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
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20`}>
                <Box className="h-4 w-4 text-emerald-400" />
              </div>
              <h1 className={`text-[15px] font-bold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                Sandboxes
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${isDark ? "bg-white/[0.06] text-[#E8E8E5] hover:bg-white/[0.1]" : "bg-black/[0.04] text-[#1A1A1A] hover:bg-black/[0.08]"}`}
            >
              <Plus className="h-3.5 w-3.5" />
              New Sandbox
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
            실행 환경(샌드박스)을 관리합니다. 에이전트가 코드를 실행할 격리된 환경을 제공합니다.
          </p>
        </div>

        {/* Templates */}
        <div className="mb-10">
          <h3 className={`text-[12px] font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-[#555]" : "text-[#999]"}`}>
            Sandbox Types
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {SANDBOX_TEMPLATES.map((template) => (
              <div
                key={template.id}
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
                  <div className="flex flex-wrap gap-1.5">
                    {template.features.map((feature, i) => (
                      <span
                        key={i}
                        className={`rounded-full px-2 py-0.5 text-[10px] ${isDark ? "bg-white/[0.06] text-[#888]" : "bg-black/[0.04] text-[#666]"}`}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
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
            placeholder="Search sandboxes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 bg-transparent text-[14px] outline-none ${isDark ? "text-[#E8E8E5] placeholder:text-[#555]" : "text-[#1A1A1A] placeholder:text-[#999]"}`}
          />
        </div>

        {/* Sandboxes list */}
        <div className="space-y-3">
          {filteredSandboxes.map((sandbox) => {
            const template = SANDBOX_TEMPLATES.find((t) => t.id === sandbox.template);
            return (
              <div
                key={sandbox.id}
                className={`group flex items-center gap-4 rounded-xl p-4 transition-all ${isDark ? "bg-[#151515] ring-1 ring-white/[0.06] hover:ring-white/[0.1]" : "bg-white ring-1 ring-black/[0.04] hover:ring-black/[0.08]"}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"}`}>
                  {template && <template.icon className={`h-5 w-5 ${template.iconColor}`} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-[14px] font-semibold ${isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]"}`}>
                      {sandbox.name}
                    </h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      sandbox.status === "running"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : sandbox.status === "error"
                        ? "bg-red-500/20 text-red-400"
                        : isDark ? "bg-white/[0.06] text-[#888]" : "bg-black/[0.04] text-[#999]"
                    }`}>
                      {sandbox.status.toUpperCase()}
                    </span>
                  </div>
                  <div className={`flex items-center gap-3 mt-1 text-[12px] ${isDark ? "text-[#666]" : "text-[#999]"}`}>
                    <span>{template?.name}</span>
                    <span>•</span>
                    <span>{sandbox.timeout}min timeout</span>
                    {sandbox.lastUsed && (
                      <>
                        <span>•</span>
                        <span>Last used {sandbox.lastUsed}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSandbox(sandbox.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      sandbox.status === "running"
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                    }`}
                  >
                    {sandbox.status === "running" ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${isDark ? "hover:bg-white/[0.06] text-[#888]" : "hover:bg-black/[0.04] text-[#666]"}`}>
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${isDark ? "hover:bg-white/[0.06] text-[#888]" : "hover:bg-black/[0.04] text-[#666]"}`}>
                    <Settings className="h-4 w-4" />
                  </button>
                  <button className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${isDark ? "hover:bg-white/[0.06] text-[#888]" : "hover:bg-black/[0.04] text-[#666]"}`}>
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
