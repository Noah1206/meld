"use client";

// Right-side panel shown while an agent run drawer is open. Mirrors the
// BrowseTemplates / TemplateDetail header styling so the layout feels
// continuous when switching between create / run modes.

import { Bot, Wrench, Settings2, Server } from "lucide-react";

interface AgentLite {
  id: string;
  name: string;
  description: string;
  pipeline: "single-loop" | "three-agent";
  modelId: string;
  builtinToolIds: string[];
  mcpServerIds: string[];
  updatedAt: string;
}

export interface AgentRunPanelProps {
  agent: AgentLite | null;
  isDark: boolean;
}

export function AgentRunPanel({ agent, isDark }: AgentRunPanelProps) {
  const title = isDark ? "text-white" : "text-[#1A1A1A]";
  const muted = isDark ? "text-[#888]" : "text-[#787774]";
  const border = isDark ? "border-white/[0.12]" : "border-black/[0.08]";
  const eyebrow = isDark ? "text-[#666]" : "text-[#999]";
  const chip = isDark
    ? "border border-white/[0.12] text-[#ccc]"
    : "border border-black/[0.08] text-[#555]";

  if (!agent) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-6 lg:px-8 lg:py-8">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl border ${border}`}
        >
          <Bot className={`h-5 w-5 ${muted}`} />
        </div>
        <p className={`mt-4 text-[13px] ${muted}`}>No agent selected</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-6 py-6 lg:px-8 lg:py-8">
      <p
        className={`mb-2 font-mono text-[11px] uppercase tracking-[0.15em] ${eyebrow}`}
      >
        Running agent
      </p>
      <h1
        className={`mb-3 text-[24px] font-bold tracking-[-0.02em] ${title}`}
      >
        {agent.name}
      </h1>
      <p className={`mb-6 text-[13px] leading-relaxed ${muted}`}>
        {agent.description || "—"}
      </p>

      {/* Quick facts */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        <span className={`rounded-md px-2.5 py-1 font-mono text-[10px] ${chip}`}>
          {agent.pipeline}
        </span>
        <span className={`rounded-md px-2.5 py-1 font-mono text-[10px] ${chip}`}>
          {agent.modelId.split("-").slice(0, 3).join("-")}
        </span>
      </div>

      {/* Tools */}
      <Section title="Built-in tools" icon={<Wrench className="h-3 w-3" />} eyebrow={eyebrow}>
        <div className="flex flex-wrap gap-1.5">
          {agent.builtinToolIds.map(id => (
            <span
              key={id}
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] ${chip}`}
            >
              {id}
            </span>
          ))}
          {agent.builtinToolIds.length === 0 && (
            <span className={`text-[11px] ${muted}`}>None</span>
          )}
        </div>
      </Section>

      {/* MCP */}
      <Section
        title="MCP servers"
        icon={<Server className="h-3 w-3" />}
        eyebrow={eyebrow}
      >
        <div className="flex flex-wrap gap-1.5">
          {agent.mcpServerIds.map(id => (
            <span
              key={id}
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] ${chip}`}
            >
              {id}
            </span>
          ))}
          {agent.mcpServerIds.length === 0 && (
            <span className={`text-[11px] ${muted}`}>None</span>
          )}
        </div>
      </Section>

      {/* Meta */}
      <Section
        title="Meta"
        icon={<Settings2 className="h-3 w-3" />}
        eyebrow={eyebrow}
      >
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <dt className={`font-mono uppercase tracking-wider ${eyebrow}`}>
            Last updated
          </dt>
          <dd className={`${muted}`}>
            {new Date(agent.updatedAt).toLocaleString()}
          </dd>
          <dt className={`font-mono uppercase tracking-wider ${eyebrow}`}>
            Agent ID
          </dt>
          <dd className={`truncate font-mono ${muted}`}>{agent.id}</dd>
        </dl>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  eyebrow,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-1.5">
        <span className={eyebrow}>{icon}</span>
        <p className={`font-mono text-[10px] uppercase tracking-[0.15em] ${eyebrow}`}>
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}
