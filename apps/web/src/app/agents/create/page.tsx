"use client";

// /agents/create — single-page HarnessConfig editor
//
// Escape hatch for users who want to skip the conversational drawer and
// edit the full HarnessConfig by hand. Wrapped in the same /projects-style
// sidebar shell for visual continuity.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useThemePref } from "@/lib/hooks/useThemePref";
import { AgentsSidebar } from "../_components/AgentsSidebar";

const BUILTIN_TOOLS = [
  { id: "read_file", label: "read_file", note: "파일 읽기" },
  { id: "write_file", label: "write_file", note: "파일 쓰기" },
  { id: "delete_file", label: "delete_file", note: "파일 삭제" },
  { id: "rename_file", label: "rename_file", note: "파일 이동/이름 변경" },
  { id: "list_files", label: "list_files", note: "디렉토리 탐색" },
  { id: "search_files", label: "search_files", note: "텍스트 검색" },
  { id: "run_command", label: "run_command", note: "셸 명령 실행" },
  { id: "web_search", label: "web_search", note: "Google 검색 (Serper)" },
  { id: "browse_url", label: "browse_url", note: "URL 탐색 + 스크린샷 (Firecrawl)" },
];

const MCP_SERVERS = [
  { id: "github", label: "GitHub" },
  { id: "vercel", label: "Vercel" },
  { id: "supabase", label: "Supabase" },
  { id: "linear", label: "Linear" },
  { id: "notion", label: "Notion" },
  { id: "slack", label: "Slack" },
  { id: "canva", label: "Canva" },
  { id: "figma", label: "Figma" },
];

interface FormState {
  name: string;
  description: string;
  pipeline: "single-loop" | "three-agent";
  systemPrompt: string;
  modelId: string;
  maxTokens: number;
  builtinToolIds: string[];
  mcpServerIds: string[];
  sandboxTemplate: string;
  sandboxTimeoutMs: number;
  maxRounds: number;
  maxIterations: number;
}

const INITIAL: FormState = {
  name: "",
  description: "",
  pipeline: "three-agent",
  systemPrompt: "",
  modelId: "claude-sonnet-4-20250514",
  maxTokens: 16384,
  builtinToolIds: BUILTIN_TOOLS.map(t => t.id),
  mcpServerIds: [],
  sandboxTemplate: "meld-agent",
  sandboxTimeoutMs: 30 * 60 * 1000,
  maxRounds: 50,
  maxIterations: 2,
};

export default function CreateAgentPage() {
  const router = useRouter();
  const { isDark, mounted } = useThemePref();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleBuiltin(id: string) {
    setForm(prev => ({
      ...prev,
      builtinToolIds: prev.builtinToolIds.includes(id)
        ? prev.builtinToolIds.filter(t => t !== id)
        : [...prev.builtinToolIds, id],
    }));
  }

  function toggleMCP(id: string) {
    setForm(prev => ({
      ...prev,
      mcpServerIds: prev.mcpServerIds.includes(id)
        ? prev.mcpServerIds.filter(m => m !== id)
        : [...prev.mcpServerIds, id],
    }));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/harness/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          pipeline: form.pipeline,
          systemPrompt: form.systemPrompt,
          modelId: form.modelId,
          maxTokens: form.maxTokens,
          builtinToolIds: form.builtinToolIds,
          mcpServerIds: form.mcpServerIds,
          sandboxTemplate: form.sandboxTemplate,
          sandboxTimeoutMs: form.sandboxTimeoutMs,
          orchestration: {
            maxRounds: form.maxRounds,
            maxIterations: form.maxIterations,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      router.push("/agents");
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  const rootBg = isDark ? "bg-[#0A0A0A]" : "bg-white";
  const mainBg = isDark ? "bg-[#151515]" : "bg-white";
  const mainRing = isDark ? "ring-1 ring-white/[0.04]" : "ring-1 ring-black/[0.04]";
  const fg = isDark ? "text-[#E8E8E5]" : "text-[#1A1A1A]";

  return (
    <div className={`flex h-screen ${rootBg} ${fg}`}>
      <AgentsSidebar />

      <main
        className={`m-3 ml-0 flex flex-1 flex-col overflow-hidden rounded-2xl ${mainBg} ${mainRing}`}
      >
        <div className="flex-1 overflow-y-auto px-10 py-12 lg:px-16 lg:py-16">
          <Link
            href="/agents"
            className={`mb-6 inline-flex items-center gap-2 text-[12px] transition-colors ${
              isDark ? "text-[#666] hover:text-white" : "text-[#999] hover:text-[#1A1A1A]"
            }`}
          >
            <ArrowLeft className="h-3 w-3" />
            Back to agents
          </Link>

          {/* ─── Hero ─── */}
          <div className="mb-12 max-w-2xl">
            <p
              className={`mb-4 font-mono text-[11px] uppercase tracking-[0.15em] ${
                isDark ? "text-[#666]" : "text-[#999]"
              }`}
            >
              New agent · Manual
            </p>
            <h1
              className={`mb-5 text-[32px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[40px] ${
                isDark ? "text-white" : "text-[#1A1A1A]"
              }`}
            >
              에이전트를
              <br />
              <span className={isDark ? "text-[#555]" : "text-[#AAA]"}>조립합니다.</span>
            </h1>
            <p
              className={`text-[15px] leading-relaxed ${
                isDark ? "text-[#888]" : "text-[#787774]"
              }`}
            >
              Model · Tools · Sandbox · Orchestration 네 축을 직접 조합합니다. 대화형으로
              만들고 싶다면{" "}
              <Link
                href="/agents"
                className={isDark ? "text-white underline" : "text-[#1A1A1A] underline"}
              >
                /agents
              </Link>
              에서 &ldquo;New agent&rdquo;를 사용하세요.
            </p>
          </div>

        {error && (
          <div className="mb-8 rounded-xl bg-[#111111] px-5 py-4 ring-1 ring-red-500/30">
            <p className="text-[13px] text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-10">
          {/* Basics */}
          <Section eyebrow="01 · Basics" title="Identity">
            <Field label="Name">
              <input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Next.js 풀스택 빌더"
                className="w-full rounded-xl bg-[#111111] px-4 py-3 text-[15px] text-white outline-none ring-1 ring-white/[0.08] transition-all placeholder:text-[#555] focus:ring-white/[0.2]"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="이 에이전트가 잘 하는 것을 설명해 주세요."
                rows={2}
                className="w-full resize-none rounded-xl bg-[#111111] px-4 py-3 text-[15px] text-white outline-none ring-1 ring-white/[0.08] transition-all placeholder:text-[#555] focus:ring-white/[0.2]"
              />
            </Field>
          </Section>

          {/* Orchestration */}
          <Section eyebrow="02 · Orchestration" title="Pipeline">
            <div className="grid grid-cols-2 gap-3">
              <PipelineCard
                selected={form.pipeline === "single-loop"}
                onClick={() => set("pipeline", "single-loop")}
                title="Single loop"
                description="1-agent 루프. 빠른 생성, 자가 평가 없음."
              />
              <PipelineCard
                selected={form.pipeline === "three-agent"}
                onClick={() => set("pipeline", "three-agent")}
                title="3-agent pipeline"
                description="Planner → Generator → Evaluator. 품질 우선."
              />
            </div>
            <div className="grid grid-cols-2 gap-6 pt-2">
              <Field label={`Max rounds — ${form.maxRounds}`}>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={form.maxRounds}
                  onChange={e => set("maxRounds", parseInt(e.target.value, 10))}
                  className="w-full accent-white"
                />
              </Field>
              <Field label={`Max iterations — ${form.maxIterations}`}>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.maxIterations}
                  onChange={e => set("maxIterations", parseInt(e.target.value, 10))}
                  className="w-full accent-white disabled:opacity-40"
                  disabled={form.pipeline !== "three-agent"}
                />
              </Field>
            </div>
          </Section>

          {/* System prompt */}
          <Section eyebrow="03 · Instructions" title="System prompt">
            <textarea
              value={form.systemPrompt}
              onChange={e => set("systemPrompt", e.target.value)}
              placeholder="You are a Next.js specialist. Prefer Tailwind + App Router."
              rows={5}
              className="w-full resize-none rounded-xl bg-[#111111] px-4 py-3 font-mono text-[13px] leading-relaxed text-white outline-none ring-1 ring-white/[0.08] transition-all placeholder:text-[#555] focus:ring-white/[0.2]"
            />
          </Section>

          {/* Model */}
          <Section eyebrow="04 · Model" title="Claude Sonnet 4">
            <div className="grid grid-cols-2 gap-6">
              <Field label="Model ID">
                <input
                  value={form.modelId}
                  onChange={e => set("modelId", e.target.value)}
                  className="w-full rounded-xl bg-[#111111] px-4 py-3 font-mono text-[12px] text-white outline-none ring-1 ring-white/[0.08] transition-all focus:ring-white/[0.2]"
                />
              </Field>
              <Field label={`Max tokens — ${form.maxTokens.toLocaleString()}`}>
                <input
                  type="range"
                  min={1024}
                  max={32768}
                  step={1024}
                  value={form.maxTokens}
                  onChange={e => set("maxTokens", parseInt(e.target.value, 10))}
                  className="w-full accent-white"
                />
              </Field>
            </div>
          </Section>

          {/* Tools */}
          <Section
            eyebrow="05 · Tools"
            title="Built-in"
            meta={`${form.builtinToolIds.length} / 9 selected`}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BUILTIN_TOOLS.map(tool => (
                <ToolToggle
                  key={tool.id}
                  label={tool.label}
                  note={tool.note}
                  selected={form.builtinToolIds.includes(tool.id)}
                  onClick={() => toggleBuiltin(tool.id)}
                />
              ))}
            </div>
          </Section>

          {/* MCP */}
          <Section
            eyebrow="06 · MCP"
            title="External servers"
            meta={`${form.mcpServerIds.length} selected`}
          >
            <div className="flex flex-wrap gap-2">
              {MCP_SERVERS.map(s => {
                const selected = form.mcpServerIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleMCP(s.id)}
                    className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-all ${
                      selected
                        ? "bg-white text-[#0A0A0A]"
                        : "bg-[#111111] text-[#ccc] ring-1 ring-white/[0.08] hover:ring-white/[0.16]"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Sandbox */}
          <Section eyebrow="07 · Sandbox" title="E2B cloud">
            <div className="grid grid-cols-2 gap-6">
              <Field label="Template">
                <input
                  value={form.sandboxTemplate}
                  onChange={e => set("sandboxTemplate", e.target.value)}
                  className="w-full rounded-xl bg-[#111111] px-4 py-3 font-mono text-[12px] text-white outline-none ring-1 ring-white/[0.08] transition-all focus:ring-white/[0.2]"
                />
              </Field>
              <Field label={`Timeout — ${Math.round(form.sandboxTimeoutMs / 60000)} min`}>
                <input
                  type="range"
                  min={60000}
                  max={60 * 60 * 1000}
                  step={60000}
                  value={form.sandboxTimeoutMs}
                  onChange={e =>
                    set("sandboxTimeoutMs", parseInt(e.target.value, 10))
                  }
                  className="w-full accent-white"
                />
              </Field>
            </div>
          </Section>

          {/* Review */}
          <Section eyebrow="08 · Review" title="Summary">
            <div className="rounded-xl bg-[#111111] px-6 py-5 ring-1 ring-white/[0.06]">
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
                <ReviewRow label="Pipeline" value={form.pipeline} />
                <ReviewRow label="Model" value={form.modelId} mono />
                <ReviewRow
                  label="Built-in tools"
                  value={`${form.builtinToolIds.length} / 9`}
                />
                <ReviewRow label="MCP servers" value={String(form.mcpServerIds.length)} />
                <ReviewRow
                  label="Rounds × iterations"
                  value={`${form.maxRounds} × ${
                    form.pipeline === "three-agent" ? form.maxIterations : 1
                  }`}
                />
                <ReviewRow label="Sandbox template" value={form.sandboxTemplate} mono />
              </dl>
            </div>
          </Section>

          {/* Bottom save */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${
                isDark
                  ? "bg-white text-[#0A0A0A] hover:bg-[#E8E8E5] hover:shadow-lg hover:shadow-white/10"
                  : "bg-[#1A1A1A] text-white hover:bg-[#333]"
              }`}
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving agent..." : "Save agent"}
            </button>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────
function Section({
  eyebrow,
  title,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.15em] text-[#666]">
            {eyebrow}
          </p>
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
            {title}
          </h2>
        </div>
        {meta && <span className="font-mono text-[11px] text-[#555]">{meta}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block font-mono text-[11px] uppercase tracking-[0.1em] text-[#666]">
        {label}
      </span>
      {children}
    </label>
  );
}

function PipelineCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl bg-[#111111] p-5 text-left transition-all ${
        selected
          ? "ring-1 ring-white/[0.25]"
          : "ring-1 ring-white/[0.06] hover:ring-white/[0.12]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        {selected && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
            <Check className="h-3 w-3 text-[#0A0A0A]" />
          </div>
        )}
      </div>
      <p className="text-[12px] leading-relaxed text-[#888]">{description}</p>
    </button>
  );
}

function ToolToggle({
  label,
  note,
  selected,
  onClick,
}: {
  label: string;
  note: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
        selected
          ? "bg-[#111111] ring-1 ring-white/[0.2]"
          : "bg-[#111111] ring-1 ring-white/[0.06] hover:ring-white/[0.12]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[12px] text-white">{label}</p>
        <p className="truncate text-[11px] text-[#666]">{note}</p>
      </div>
      {selected && (
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white">
          <Check className="h-3 w-3 text-[#0A0A0A]" />
        </div>
      )}
    </button>
  );
}

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#666]">
        {label}
      </dt>
      <dd className={`text-[13px] text-white ${mono ? "font-mono text-[12px]" : ""}`}>
        {value}
      </dd>
    </>
  );
}
