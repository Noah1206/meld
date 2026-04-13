"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAgentSessionsStore, type AgentSessionMeta } from "@/lib/store/agent-sessions-store";

// External clock — increments once per second, shared across all SessionMeta instances.
const clockListeners = new Set<() => void>();
let clockSnapshot = typeof window === "undefined" ? 0 : Date.now();
if (typeof window !== "undefined") {
  setInterval(() => {
    clockSnapshot = Date.now();
    for (const fn of clockListeners) fn();
  }, 1000);
}
function subscribeClock(fn: () => void) {
  clockListeners.add(fn);
  return () => clockListeners.delete(fn);
}
function getClockSnapshot() {
  return clockSnapshot;
}
function getServerClockSnapshot() {
  return 0;
}

interface AgentSessionsSidebarProps {
  onNewSession?: () => void;
  onSelectSession?: (sessionId: string) => void;
  className?: string;
}

export function AgentSessionsSidebar({
  onNewSession,
  onSelectSession,
  className = "",
}: AgentSessionsSidebarProps) {
  const sessions = useAgentSessionsStore((s) => s.sessions);
  const activeSessionId = useAgentSessionsStore((s) => s.activeSessionId);
  const setActiveSession = useAgentSessionsStore((s) => s.setActiveSession);
  const deleteSession = useAgentSessionsStore((s) => s.deleteSession);
  const renameSession = useAgentSessionsStore((s) => s.renameSession);

  const list = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);
  const runningCount = list.filter((s) => s.status === "running").length;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const handleSelect = (id: string) => {
    setActiveSession(id);
    onSelectSession?.(id);
  };

  const handleRename = (id: string) => {
    if (draftTitle.trim()) renameSession(id, draftTitle.trim());
    setEditingId(null);
  };

  return (
    <aside
      className={`flex h-full w-[260px] flex-col border-r border-white/[0.06] bg-[#0a0a0a] ${className}`}
    >
      <header className="flex items-center justify-between border-b border-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            {runningCount > 0 && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                runningCount > 0 ? "bg-blue-500" : "bg-white/20"
              }`}
            />
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">
            Agents {list.length > 0 ? `(${list.length})` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="group flex h-7 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 text-[11px] font-medium text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          title="New agent session"
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          New
        </button>
      </header>

      <div className="flex-1 overflow-y-auto py-1">
        {list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/30" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z" />
              </svg>
            </div>
            <p className="text-[11px] text-white/40">
              No agent sessions yet.
              <br />
              Start one from the input below.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 px-2">
            {list.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingId === session.id;
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(session.id)}
                    className={`group relative w-full rounded-md px-2.5 py-2 text-left transition ${
                      isActive
                        ? "bg-white/[0.08] ring-1 ring-white/[0.12]"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <StatusIndicator status={session.status} />
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            onBlur={() => handleRename(session.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(session.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded border border-white/10 bg-black/40 px-1 py-0.5 text-[12px] text-white outline-none focus:border-blue-500/60"
                          />
                        ) : (
                          <p
                            className={`truncate text-[12px] leading-snug ${
                              isActive ? "text-white" : "text-white/75"
                            }`}
                          >
                            {session.title}
                          </p>
                        )}
                        <SessionMeta session={session} />
                      </div>
                      {!isEditing && (
                        <div className="flex opacity-0 transition group-hover:opacity-100">
                          <SessionMenu
                            onRename={(e) => {
                              e.stopPropagation();
                              setDraftTitle(session.title);
                              setEditingId(session.id);
                            }}
                            onDelete={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${session.title}"?`)) {
                                deleteSession(session.id);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-white/[0.06] px-3 py-2">
        <p className="text-[10px] text-white/30">
          {runningCount > 0
            ? `${runningCount} agent${runningCount > 1 ? "s" : ""} running`
            : "All agents idle"}
        </p>
      </footer>
    </aside>
  );
}

function StatusIndicator({ status }: { status: AgentSessionMeta["status"] }) {
  if (status === "running") {
    return (
      <div className="mt-1 flex h-3 w-3 flex-shrink-0 items-center justify-center">
        <svg viewBox="0 0 24 24" className="h-3 w-3 animate-spin text-blue-400" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }
  if (status === "completed") {
    return (
      <div className="mt-1 flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <svg viewBox="0 0 12 12" className="h-2 w-2 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="mt-1 flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-red-500/15">
        <div className="h-1 w-1 rounded-full bg-red-400" />
      </div>
    );
  }
  if (status === "awaiting_approval") {
    return (
      <div className="mt-1 flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15">
        <div className="h-1 w-1 rounded-full bg-amber-400" />
      </div>
    );
  }
  if (status === "cancelled") {
    return (
      <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full border border-white/20" />
    );
  }
  return <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-white/10" />;
}

function SessionMeta({ session }: { session: AgentSessionMeta }) {
  const now = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);

  const elapsed =
    session.status === "running" && now > 0
      ? now - session.createdAt
      : session.elapsedMs;

  return (
    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/40">
      <span>{formatElapsed(elapsed)}</span>
      <span>·</span>
      <span>{session.eventCount} events</span>
      {session.status === "running" && (
        <>
          <span>·</span>
          <span className="text-blue-400/80">live</span>
        </>
      )}
    </div>
  );
}

function SessionMenu({
  onRename,
  onDelete,
}: {
  onRename: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-5 w-5 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white/80"
        aria-label="Session options"
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
          <circle cx="3" cy="8" r="1.3" />
          <circle cx="8" cy="8" r="1.3" />
          <circle cx="13" cy="8" r="1.3" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-20 w-28 overflow-hidden rounded-md border border-white/[0.08] bg-[#141414] py-1 shadow-xl">
          <button
            type="button"
            onClick={(e) => {
              onRename(e);
              setOpen(false);
            }}
            className="block w-full px-3 py-1.5 text-left text-[11px] text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={(e) => {
              onDelete(e);
              setOpen(false);
            }}
            className="block w-full px-3 py-1.5 text-left text-[11px] text-red-400/80 hover:bg-red-500/10 hover:text-red-300"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return "0s";
  const total = Math.floor(ms / 1000);
  if (total < 60) return `${total}s`;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}
