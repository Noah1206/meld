"use client";

// AgentActivityFeed — Manus-inspired compact activity renderer.
//
// Philosophy: instead of stacking one step card per `thinking` event
// (which grows endlessly and is text-heavy), we show ONE status line
// at the top that updates in place as the agent works, and a single
// collapsible "timeline" of completed tool calls rendered as compact
// chips — not full cards. The blackhole spinner lives next to the
// status line and keeps spinning while the agent is working.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Terminal,
  Search,
  Check,
  X,
  ChevronDown,
  Copy,
  CheckCheck,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share,
  MoreHorizontal,
  Globe,
  MonitorSmartphone,
  Pencil,
  Trash2,
  ArrowRight,
  Camera,
  Package,
} from "lucide-react";
import { useAgentSessionStore, type PendingEdit } from "@/lib/store/agent-session-store";

export function AgentActivityFeed({
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
  onCancel,
  onMCPConnect,
  onMCPDismiss,
}: {
  onApprove: (toolCallId: string) => void;
  onReject: (toolCallId: string) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onCancel: () => void;
  /** Invoked when the user clicks "연결" on an inline MCP request card. */
  onMCPConnect?: (serverId: string) => void;
  /** Invoked when the user dismisses an inline MCP request card. */
  onMCPDismiss?: (serverId: string) => void;
}) {
  const { status, events, pendingEdits, error } = useAgentSessionStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [events.length]);

  // ─── Build Manus-style sections from the event stream ───
  // Each `thinking` event opens a new section. Tool calls / file edits
  // / commands / browsing that happen between two thinking events get
  // rolled into that section as compact action chips. While the agent
  // is still running, the most recent section is "active" — its header
  // shows the breathing blackhole spinner and stays expanded. Already-
  // completed sections collapse with a check icon.
  const sections = useMemo(
    () => buildSections(events as RawEvent[], status),
    [events, status],
  );

  // ─── Browser screenshots captured during the run ───
  const screenshots = useMemo(
    () =>
      (events as RawEvent[])
        .filter((e) => e.type === "browser_screenshot" && typeof e.screenshotUrl === "string")
        .map((e) => ({
          url: e.url as string,
          title: (e.title as string) || (e.url as string),
          screenshotUrl: e.screenshotUrl as string,
        })),
    [events],
  );

  // ─── MCP connection requests emitted by the agent ───
  // Each `mcp_request` event becomes an inline card in the feed so
  // the user can connect right where the agent asked, without the
  // context-switch of a floating modal. `mcp_auto_connected` events
  // are rendered as a single green confirmation line.
  const mcpRequests = useMemo(
    () =>
      (events as RawEvent[])
        .filter(
          (e) =>
            e.type === "mcp_request" &&
            typeof e.serverId === "string",
        )
        .map((e) => ({
          serverId: e.serverId as string,
          reason: (e.reason as string) || "",
        })),
    [events],
  );
  const mcpAutoConnected = useMemo(
    () =>
      (events as RawEvent[])
        .filter(
          (e) =>
            e.type === "mcp_auto_connected" &&
            typeof e.serverId === "string",
        )
        .map((e) => ({
          serverId: e.serverId as string,
          toolCount: (e.toolCount as number) ?? 0,
        })),
    [events],
  );

  // The final assistant reply is rendered by the parent (workspace
  // `renderMessage`) so we intentionally skip messages + MessageActions
  // here to avoid double-rendering the answer with two action bars.

  // We treat `idle` as "running" because the parent only mounts this
  // feed while a request is in flight — there is a brief window between
  // the user sending a prompt and the server starting the session where
  // status is still idle locally, and we want the spinner to show then.
  const isRunning =
    status === "running" || status === "awaiting_approval" || status === "idle";

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1">
        {/* Manus-style timeline of sections */}
        {sections.length > 0 && (
          <SectionTimeline sections={sections} isRunning={isRunning} />
        )}

        {/* Screenshots captured */}
        {screenshots.length > 0 && (
          <div className="mt-4 space-y-2">
            {screenshots.map((s, i) => (
              <ScreenshotCard
                key={`${s.url}-${i}`}
                url={s.url}
                title={s.title}
                screenshotUrl={s.screenshotUrl}
              />
            ))}
          </div>
        )}

        {/* Auto-connected MCP notices (compact one-liner) */}
        {mcpAutoConnected.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {mcpAutoConnected.map((m) => (
              <div
                key={`auto-${m.serverId}`}
                className="flex items-center gap-2 rounded-lg bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-400/80 ring-1 ring-emerald-500/10"
              >
                <Check className="h-3 w-3" />
                <span>
                  {m.serverId} 자동 연결됨 · 도구 {m.toolCount}개
                </span>
              </div>
            ))}
          </div>
        )}

        {/* MCP connection requests (inline cards) */}
        {mcpRequests.length > 0 && (
          <div className="mt-4 space-y-2">
            {mcpRequests.map((m, i) => (
              <MCPRequestCard
                key={`${m.serverId}-${i}`}
                serverId={m.serverId}
                reason={m.reason}
                onConnect={() => onMCPConnect?.(m.serverId)}
                onDismiss={() => onMCPDismiss?.(m.serverId)}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 px-1">
            <p className="text-[14px] leading-relaxed text-red-400">{error}</p>
          </div>
        )}

        {/* Pending edits */}
        {status === "awaiting_approval" &&
          pendingEdits.some((e) => e.status === "pending") && (
            <div className="mt-4 px-1">
              <div className="space-y-2">
                {pendingEdits
                  .filter((e) => e.status === "pending")
                  .map((edit) => (
                    <PendingEditCard
                      key={edit.toolCallId}
                      edit={edit}
                      onApprove={() => onApprove(edit.toolCallId)}
                      onReject={() => onReject(edit.toolCallId)}
                    />
                  ))}
              </div>
              {pendingEdits.filter((e) => e.status === "pending").length > 1 && (
                <div className="flex items-center gap-2 pt-3">
                  <button
                    onClick={onApproveAll}
                    className="flex-1 rounded-xl bg-white/10 py-2 text-[13px] font-medium text-[#ccc] transition-colors hover:bg-white/15"
                  >
                    Apply All
                  </button>
                  <button
                    onClick={onRejectAll}
                    className="flex-1 rounded-xl bg-white/5 py-2 text-[13px] font-medium text-[#888] transition-colors hover:bg-white/10"
                  >
                    Reject All
                  </button>
                </div>
              )}
            </div>
          )}

        {/* Stop button removed — replaced by the Send/Stop toggle on
            the input area. */}
      </div>
    </div>
  );
}

// Mini blackhole — dark sphere in the center with a tilted glowing
// accretion ring rotating around it, plus a soft breathing halo.
// Keyframes/styles defined in globals.css (`.meld-blackhole`).
function BlackholeSpinner() {
  return (
    <span
      aria-label="loading"
      className="meld-blackhole"
      style={{
        position: "relative",
        display: "inline-block",
        width: 20,
        height: 20,
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    >
      <span className="ring" />
      <span className="ring-2" />
      <span className="equator" />
      <span className="core" />
    </span>
  );
}

// ─── Action chips ──────────────────────────────────
interface ActionChip {
  id: string;
  kind: "file" | "command" | "search" | "browse" | "devServer" | "generic" | "mcp";
  label: string;
  icon: React.ReactNode;
}

// ─── Section Timeline (Manus style) ────────────────
// A vertical timeline of agent "sections". Each section is opened by a
// `thinking` event and contains the chronologically-following action
// chips until the next thinking. While the agent is still running, the
// final section is "active" — it stays expanded and shows a spinner.

interface AgentSection {
  id: string;
  title: string;
  chips: ActionChip[];
  done: boolean;
}

function SectionTimeline({
  sections,
  isRunning,
}: {
  sections: AgentSection[];
  isRunning: boolean;
}) {
  return (
    <div className="relative pl-1">
      {/* Vertical timeline rail */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-white/[0.06]" />
      <div className="space-y-2">
        {sections.map((section, i) => {
          const isLast = i === sections.length - 1;
          const isActive = isLast && isRunning && !section.done;
          return (
            <SectionRow
              key={section.id}
              section={section}
              isActive={isActive}
              defaultOpen={isActive}
            />
          );
        })}
      </div>
    </div>
  );
}

function SectionRow({
  section,
  isActive,
  defaultOpen,
}: {
  section: AgentSection;
  isActive: boolean;
  defaultOpen: boolean;
}) {
  // userToggled is null until the user clicks; then it overrides the
  // default expanded-while-active behavior.
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const expanded = userToggled ?? defaultOpen;

  return (
    <div className="relative">
      {/* Section header — marker + title + chevron */}
      <button
        type="button"
        onClick={() => section.chips.length > 0 && setUserToggled(!expanded)}
        className="group flex w-full items-start gap-3 rounded-lg py-1.5 text-left transition-colors hover:bg-white/[0.02]"
      >
        {/* Marker dot — sits on the timeline rail */}
        <span className="relative mt-[3px] flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center">
          {isActive ? (
            <BlackholeSpinner />
          ) : (
            <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#222] ring-2 ring-[#181818]">
              <Check className="h-[8px] w-[8px] text-[#888]" strokeWidth={3} />
            </span>
          )}
        </span>
        <span
          className={`flex-1 text-[13px] leading-[1.5] ${
            isActive ? "text-[#E0E0E0]" : "text-[#999]"
          }`}
        >
          {section.title}
        </span>
        {section.chips.length > 0 && (
          <ChevronDown
            className={`mt-[5px] h-3 w-3 flex-shrink-0 text-[#555] transition-transform duration-200 ${
              expanded ? "" : "-rotate-90"
            }`}
          />
        )}
      </button>
      {/* Section body — collapsible chip list */}
      {expanded && section.chips.length > 0 && (
        <div className="mb-1 ml-[30px] mt-1 space-y-1">
          {section.chips.map((chip) => (
            <div
              key={chip.id}
              className={
                chip.kind === "mcp"
                  ? "flex items-center gap-2 rounded-md bg-purple-500/[0.06] px-2.5 py-1.5 ring-1 ring-purple-500/20"
                  : "flex items-center gap-2 rounded-md bg-white/[0.02] px-2.5 py-1.5 ring-1 ring-white/[0.04]"
              }
            >
              <span className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center ${chip.kind === "mcp" ? "text-purple-300" : "text-[#888]"}`}>
                {chip.icon}
              </span>
              <span className={`truncate text-[12px] leading-none ${chip.kind === "mcp" ? "text-purple-200" : "text-[#bbb]"}`}>
                {chip.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildSections(events: RawEvent[], status: string): AgentSection[] {
  const sections: AgentSection[] = [];
  // Use a tuple wrapper so TypeScript doesn't aggressively narrow
  // `current` to `null` after a single assignment inside a closure.
  let cur: AgentSection | null = null;
  let chipSeq = 0;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type === "thinking") {
      if (cur) {
        cur.done = true;
        sections.push(cur);
      }
      const raw = (e.content as string | undefined)?.trim() ?? "";
      const title = raw ? shorten(takeFirstSentence(raw), 80) : "생각하고 있어요";
      cur = {
        id: `sec-${sections.length}`,
        title,
        chips: [],
        done: false,
      };
      continue;
    }

    const chip = chipFromEvent(e, `chip-${chipSeq++}-${i}`);
    if (!chip) continue;
    if (!cur) {
      cur = {
        id: `sec-${sections.length}`,
        title: "작업 중이에요",
        chips: [],
        done: false,
      };
    }
    // Dedupe re-writes of the same file (PLAN.md updates) within a section.
    if (chip.kind === "file") {
      const idx = cur.chips.findIndex((c) => c.kind === "file" && c.label === chip.label);
      if (idx >= 0) cur.chips.splice(idx, 1);
    }
    cur.chips.push(chip);
  }

  if (cur) {
    const stillRunning =
      status === "running" || status === "awaiting_approval" || status === "idle";
    if (!stillRunning) cur.done = true;
    sections.push(cur);
  }

  return sections;
}

function takeFirstSentence(s: string): string {
  const m = s.match(/^[^.!?。!?\n]+[.!?。!?]?/);
  return (m?.[0] ?? s).trim();
}

// ActionChipList removed — chips now render inside SectionRow.

// ─── Screenshot card ───────────────────────────────
function ScreenshotCard({
  url,
  title,
  screenshotUrl,
}: {
  url: string;
  title: string;
  screenshotUrl: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/[0.12]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screenshotUrl}
        alt={title}
        className="block h-[160px] w-full object-cover object-top"
        onError={() => setFailed(true)}
        draggable={false}
      />
      <div className="flex items-center gap-2 px-3 py-2">
        <Camera className="h-3 w-3 text-[#666]" />
        <span className="truncate text-[11px] text-[#999]">{title}</span>
      </div>
    </a>
  );
}

// Inline card rendered when the agent emits `mcp_request`. Lets the
// user connect without leaving the activity feed, which is more
// natural than a floating modal: the prompt appears right after the
// agent's own reasoning, in the same visual thread.
function MCPRequestCard({
  serverId,
  reason,
  onConnect,
  onDismiss,
}: {
  serverId: string;
  reason: string;
  onConnect: () => void;
  onDismiss: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const capitalized = serverId.charAt(0).toUpperCase() + serverId.slice(1);
  return (
    <div className="overflow-hidden rounded-xl border border-purple-500/20 bg-purple-500/[0.03] transition-colors">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/20">
          🔌
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-purple-400/60">
              Meld AI · 연결 요청
            </p>
          </div>
          <h4 className="mt-0.5 text-[13px] font-semibold tracking-[-0.01em] text-white">
            {capitalized} 연결이 필요해요
          </h4>
          {reason && (
            <p className="mt-1 text-[12px] leading-relaxed text-[#bbb]">
              {reason}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onConnect}
              className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0A0A0A] transition-all hover:bg-[#E8E8E5] active:scale-[0.97]"
            >
              연결하기
            </button>
            <button
              onClick={() => {
                setDismissed(true);
                onDismiss();
              }}
              className="rounded-lg px-3 py-1.5 text-[11px] text-[#777] transition-colors hover:text-[#ccc]"
            >
              나중에
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Derivation helpers ────────────────────────────
type RawEvent = {
  type: string;
  content?: string;
  toolName?: string;
  input?: Record<string, string>;
  filePath?: string;
  command?: string;
  query?: string;
  url?: string;
  title?: string;
  screenshotUrl?: string;
  explanation?: string;
  [k: string]: unknown;
};

// deriveStatusLine / phraseFromEvent / phraseFromToolCall removed —
// section titles now come straight from `thinking` events via
// takeFirstSentence + shorten, and chip labels from chipFromEvent.

function chipFromEvent(e: RawEvent, id: string): ActionChip | null {
  switch (e.type) {
    case "file_edit":
    case "file_edit_auto": {
      const p = e.filePath as string | undefined;
      if (!p) return null;
      const leaf = p.split("/").pop() ?? p;
      const isPlan = p.endsWith(".meld/PLAN.md");
      return {
        id: `${id}::${p}`,
        kind: "file",
        label: isPlan ? "계획 업데이트" : leaf,
        icon: isPlan ? <FileText className="h-3 w-3" /> : <Pencil className="h-3 w-3" />,
      };
    }
    case "command_start": {
      const cmd = (e.command as string) ?? "";
      return {
        id,
        kind: "command",
        label: chipLabelForCommand(cmd),
        icon: /install/.test(cmd) ? <Package className="h-3 w-3" /> : <Terminal className="h-3 w-3" />,
      };
    }
    case "devServer":
      return {
        id,
        kind: "devServer",
        label: "개발 서버 준비됨",
        icon: <MonitorSmartphone className="h-3 w-3" />,
      };
    case "search_results":
      return {
        id,
        kind: "search",
        label: `웹 검색: ${e.query ?? ""}`,
        icon: <Search className="h-3 w-3" />,
      };
    case "browser_screenshot":
      return {
        id,
        kind: "browse",
        label: `방문: ${safeHost(e.url)}`,
        icon: <Globe className="h-3 w-3" />,
      };
    case "file_delete":
      return {
        id,
        kind: "file",
        label: `삭제: ${(e.filePath as string)?.split("/").pop() ?? ""}`,
        icon: <Trash2 className="h-3 w-3" />,
      };
    case "file_rename":
      return {
        id,
        kind: "file",
        label: "파일 이동",
        icon: <ArrowRight className="h-3 w-3" />,
      };
    case "tool_call": {
      // MCP tool calls arrive as generic `tool_call` events — the
      // builtin tools (read_file, run_command, etc.) have their own
      // dedicated cases above, so anything reaching here is either
      // a request_mcp or an MCP adapter tool. Derive a friendly
      // service label from the tool name's prefix.
      const name = (e.toolName as string | undefined) ?? "";
      if (!name) return null;
      const mcp = classifyMCPToolName(name);
      if (!mcp) return null;
      return {
        id,
        kind: "mcp",
        label: mcp.label,
        icon: <span className="text-[11px]">{mcp.emoji}</span>,
      };
    }
    default:
      return null;
  }
}

interface MCPChipInfo {
  service: string;
  emoji: string;
  label: string;
}

/** Map an MCP tool name like `figma_get_file` to a display chip.
 *  Prefix before the first underscore is the service id; the rest
 *  is a snake_case action that we lightly humanize. */
function classifyMCPToolName(toolName: string): MCPChipInfo | null {
  if (toolName === "request_mcp") {
    return { service: "meld", emoji: "🔌", label: "MCP 연결 요청 중…" };
  }
  const match = /^([a-z]+)_(.+)$/.exec(toolName);
  if (!match) return null;
  const service = match[1];
  const action = match[2].replace(/_/g, " ");
  const EMOJI: Record<string, string> = {
    figma: "🎨",
    github: "🐙",
    vercel: "▲",
    supabase: "🗄️",
    sentry: "🐛",
    linear: "📋",
    notion: "📓",
    slack: "💬",
    gmail: "✉️",
    canva: "🖼️",
  };
  const NAME: Record<string, string> = {
    figma: "Figma",
    github: "GitHub",
    vercel: "Vercel",
    supabase: "Supabase",
    sentry: "Sentry",
    linear: "Linear",
    notion: "Notion",
    slack: "Slack",
    gmail: "Gmail",
    canva: "Canva",
  };
  const emoji = EMOJI[service] ?? "🔗";
  const displayName = NAME[service] ?? service;
  return {
    service,
    emoji,
    label: `${displayName} · ${shorten(action, 22)}`,
  };
}

function chipLabelForCommand(cmd: string): string {
  if (/install/.test(cmd)) return "의존성 설치";
  if (/\b(dev|start|serve)\b/.test(cmd)) return "개발 서버 실행";
  if (/\bbuild\b/.test(cmd)) return "빌드";
  return shorten(cmd, 40);
}

function safeHost(u: unknown): string {
  if (typeof u !== "string") return "";
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}

function shorten(s: string, max = 60): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max - 1).trimEnd() + "…";
}

// ─── Pending edit card ─────────────────────────────
function PendingEditCard({
  edit,
  onApprove,
  onReject,
}: {
  edit: PendingEdit;
  onApprove: () => void;
  onReject: () => void;
}) {
  const fileName = edit.filePath.split("/").pop() || edit.filePath;
  return (
    <div className="rounded-xl border border-[#333] bg-[#1E1E1E] px-4 py-3">
      <div className="flex items-center gap-3">
        <Pencil className="h-4 w-4 text-[#888]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-[#E0E0E0]">
            {fileName}
          </p>
          <p className="truncate text-[11px] text-[#888]">{edit.explanation}</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onApprove}
            className="rounded-lg bg-white/10 px-3 py-1 text-[12px] text-[#ccc] transition-colors hover:bg-white/15"
          >
            적용
          </button>
          <button
            onClick={onReject}
            className="rounded-lg bg-white/5 px-3 py-1 text-[12px] text-[#888] transition-colors hover:bg-white/10"
          >
            거부
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message actions ───────────────────────────────
// Six-button bar shown under the final assistant reply:
// Copy / ThumbsUp / ThumbsDown / Share / Retry / More.
function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleShare = async () => {
    const shareData = { title: "Meld", text: content };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(content);
      }
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      // user dismissed
    }
  };

  const btnCls =
    "flex h-8 w-8 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-white/[0.06] hover:text-[#E8E8E5]";

  return (
    <div className="mt-2 flex items-center gap-1">
      <button onClick={handleCopy} className={btnCls} title="Copy" aria-label="Copy">
        {copied ? (
          <CheckCheck className="h-4 w-4 text-emerald-400" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={() => setFeedback((f) => (f === "like" ? null : "like"))}
        className={`${btnCls} ${feedback === "like" ? "!bg-white/[0.08] !text-[#E8E8E5]" : ""}`}
        title="Good response"
        aria-label="Good response"
      >
        <ThumbsUp className="h-4 w-4" />
      </button>
      <button
        onClick={() => setFeedback((f) => (f === "dislike" ? null : "dislike"))}
        className={`${btnCls} ${feedback === "dislike" ? "!bg-white/[0.08] !text-[#E8E8E5]" : ""}`}
        title="Bad response"
        aria-label="Bad response"
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
      <button
        onClick={handleShare}
        className={btnCls}
        title="Share"
        aria-label="Share"
      >
        {shared ? (
          <CheckCheck className="h-4 w-4 text-emerald-400" />
        ) : (
          <Share className="h-4 w-4" />
        )}
      </button>
      <button className={btnCls} title="Retry" aria-label="Retry">
        <RefreshCw className="h-4 w-4" />
      </button>
      <div className="relative">
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={`${btnCls} ${moreOpen ? "!bg-white/[0.08] !text-[#E8E8E5]" : ""}`}
          title="More"
          aria-label="More options"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {moreOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMoreOpen(false)}
              aria-hidden
            />
            <div className="absolute left-0 top-9 z-50 min-w-[160px] overflow-hidden rounded-xl bg-[#1E1E1E] py-1 shadow-xl ring-1 ring-white/[0.08]">
              <button
                onClick={() => {
                  handleCopy();
                  setMoreOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#ccc] transition-colors hover:bg-white/[0.06]"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy as markdown
              </button>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#ccc] transition-colors hover:bg-white/[0.06]"
              >
                <FileText className="h-3.5 w-3.5" />
                Export as file
              </button>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#ccc] transition-colors hover:bg-white/[0.06]"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Continue in new session
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Markdown message renderer ─────────────────────
function MessageRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <div
            key={`code-${i}`}
            className="my-2 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#161616]"
          >
            {codeLang && (
              <div className="border-b border-[#2A2A2A] px-3 py-1 font-mono text-[10px] text-[#555]">
                {codeLang}
              </div>
            )}
            <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-[#999]">
              {codeLines.join("\n")}
            </pre>
          </div>,
        );
        codeLines = [];
        codeLang = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="mb-1.5 mt-4 text-[14px] font-semibold text-[#E0E0E0]"
        >
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="mb-1.5 mt-4 text-[15px] font-semibold text-[#E0E0E0]"
        >
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={i}
          className="mb-2 mt-4 text-[16px] font-bold text-[#E0E0E0]"
        >
          {line.slice(2)}
        </h1>,
      );
    } else if (line.match(/^[-*] /)) {
      elements.push(
        <div
          key={i}
          className="flex items-start gap-2 py-0.5 text-[14px] leading-relaxed text-[#E0E0E0]"
        >
          <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[#666]" />
          <span>{renderInline(line.slice(2))}</span>
        </div>,
      );
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div
          key={i}
          className="flex items-start gap-2 py-0.5 text-[14px] leading-relaxed text-[#E0E0E0]"
        >
          <span className="mt-0.5 w-4 flex-shrink-0 text-right text-[13px] text-[#666]">
            {num}.
          </span>
          <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
        </div>,
      );
    } else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-3 border-[#2A2A2A]" />);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p
          key={i}
          className="text-[14px] leading-relaxed text-[#E0E0E0]"
        >
          {renderInline(line)}
        </p>,
      );
    }
  });

  return <div>{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    const matches = [
      boldMatch
        ? {
            index: boldMatch.index!,
            length: boldMatch[0].length,
            type: "bold" as const,
            content: boldMatch[1],
          }
        : null,
      codeMatch
        ? {
            index: codeMatch.index!,
            length: codeMatch[0].length,
            type: "code" as const,
            content: codeMatch[1],
          }
        : null,
    ]
      .filter(Boolean)
      .sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0)
      parts.push(<span key={key++}>{remaining.slice(0, first.index)}</span>);

    if (first.type === "bold")
      parts.push(
        <strong key={key++} className="font-semibold text-[#E0E0E0]">
          {first.content}
        </strong>,
      );
    else
      parts.push(
        <code
          key={key++}
          className="rounded bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[12px] text-[#999]"
        >
          {first.content}
        </code>,
      );

    remaining = remaining.slice(first.index + first.length);
  }

  return <>{parts}</>;
}
