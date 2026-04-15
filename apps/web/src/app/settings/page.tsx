"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, CreditCard, Zap, Shield, Bell, Palette, Globe,
  Settings, ChevronRight, ExternalLink, LogOut, Blend, Check,
  Heart, Key, Trash2, Moon, Sun, Monitor,
} from "lucide-react";
import { MCPHubView } from "@/components/mcp/MCPHubView";

// ─── Types ───
interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  plan: "free" | "pro" | "unlimited";
  credits: { used: number; total: number };
  requestsToday: number;
  memberSince: string;
}

type SettingsTab = "general" | "account" | "billing" | "ai" | "integrations" | "notifications" | "appearance";

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "General", icon: <Settings className="h-4 w-4" /> },
  { id: "account", label: "Account", icon: <User className="h-4 w-4" /> },
  { id: "billing", label: "Plan & Billing", icon: <CreditCard className="h-4 w-4" /> },
  { id: "ai", label: "AI & Models", icon: <Zap className="h-4 w-4" /> },
  { id: "integrations", label: "Integrations", icon: <Blend className="h-4 w-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
];

// ─── Setting Row Component ───
function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8 py-5">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-[#E8E8E5]">{label}</div>
        {description && <div className="mt-1 text-[13px] text-[#777]">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-b border-[#2A2A2A]" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-8 text-[12px] font-semibold uppercase tracking-wider text-[#666]">{children}</h3>;
}

// ─── Toggle Switch ───
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`no-hover-fill relative h-6 w-11 rounded-full transition-colors duration-200 ${
        checked ? "bg-purple-600" : "bg-[#333]"
      }`}
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Settings Storage ───
function useSettings<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  // Lazy initializer reads localStorage once — avoids setState-in-effect.
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const saved = window.localStorage.getItem(`meld-settings-${key}`);
      return saved ? (JSON.parse(saved) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  const update = (v: T) => {
    setValue(v);
    try { localStorage.setItem(`meld-settings-${key}`, JSON.stringify(v)); } catch {}
  };
  return [value, update];
}

// ─── General Tab ───
function GeneralTab() {
  const [workspaceName, setWorkspaceName] = useSettings("workspace-name", "My Workspace");
  const [maxRounds, setMaxRounds] = useSettings("max-rounds", "50");
  const [selfVerify, setSelfVerify] = useSettings("self-verification", true);
  const [heartbeat, setHeartbeat] = useSettings("heartbeat", false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="animate-tab-switch">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-white">General</h2>
          <p className="mt-2 text-[14px] text-[#777]">Workspace settings and preferences.</p>
        </div>
        <button
          onClick={handleSave}
          className={`rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-all ${saved ? "bg-emerald-600 text-white" : "bg-white/[0.08] text-white hover:bg-white/[0.12]"}`}
        >
          {saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      <SectionTitle>Workspace</SectionTitle>
      <SettingRow label="Workspace name" description="This is your workspace's visible name.">
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          className="no-hover-fill w-[220px] rounded-lg border border-[#3A3A3A] bg-[#252525] px-4 py-2.5 text-[14px] text-white outline-none transition-all focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
        />
      </SettingRow>
      <Divider />

      <SettingRow label="Workspace ID" description="Used for API access and integrations.">
        <code className="rounded-md bg-[#252525] px-3 py-1.5 font-mono text-[12px] text-[#999]">ws_abc123def456</code>
      </SettingRow>
      <Divider />

      <SectionTitle>Agent</SectionTitle>
      <SettingRow label="Max agent rounds" description="Maximum conversation rounds per task.">
        <select value={maxRounds} onChange={(e) => setMaxRounds(e.target.value)} className="no-hover-fill rounded-lg border border-[#3A3A3A] bg-[#252525] px-4 py-2.5 text-[14px] text-white outline-none">
          <option value="25">25 rounds</option>
          <option value="50">50 rounds</option>
          <option value="100">100 rounds</option>
        </select>
      </SettingRow>
      <Divider />

      <SettingRow label="Self-verification" description="AI verifies its work by testing in browser before delivering.">
        <Toggle checked={selfVerify} onChange={setSelfVerify} />
      </SettingRow>
      <Divider />

      <SettingRow label="Heartbeat" description="AI periodically checks project health and fixes issues.">
        <Toggle checked={heartbeat} onChange={setHeartbeat} />
      </SettingRow>

      <SectionTitle>Danger Zone</SectionTitle>
      <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-medium text-red-400">Delete workspace</div>
            <div className="text-[13px] text-[#777]">Permanently delete this workspace and all data.</div>
          </div>
          <button className="rounded-lg border border-red-500/30 px-4 py-2.5 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/10">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Account Tab ───
function AccountTab() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(data => {
      if (data) {
        setUsername(data.username || data.github_username || "User");
        setEmail(data.email || "");
        setAvatarUrl(data.avatar_url || "");
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="animate-tab-switch">
      <h2 className="text-[22px] font-semibold text-white">Account</h2>
      <p className="mt-2 text-[14px] text-[#777]">Manage your account information.</p>

      <SectionTitle>Profile</SectionTitle>
      <SettingRow label="Display name">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="no-hover-fill w-[220px] rounded-lg border border-[#3A3A3A] bg-[#252525] px-4 py-2.5 text-[14px] text-white outline-none transition-all focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
        />
      </SettingRow>
      <Divider />

      <SettingRow label="Email" description="Connected via GitHub OAuth.">
        <span className="text-[14px] text-[#999]">{email || "Not connected"}</span>
      </SettingRow>
      <Divider />

      <SettingRow label="Avatar">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-[14px] font-bold text-white">
              {username.charAt(0).toUpperCase() || "?"}
            </div>
          )}
        </div>
      </SettingRow>
      <Divider />

      <SectionTitle>Security</SectionTitle>
      <SettingRow label="Connected accounts">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-[#252525] px-3 py-1 text-[11px] text-[#ccc] ring-1 ring-white/[0.06]">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
            <Check className="h-3 w-3 text-emerald-400" />
          </div>
        </div>
      </SettingRow>
      <Divider />

      <SettingRow label="Sessions" description="Manage active sessions.">
        <button className="rounded-lg border border-[#3A3A3A] px-3 py-1.5 text-[12px] text-[#999] transition-colors hover:border-[#555] hover:text-white">
          Sign out all
        </button>
      </SettingRow>
    </div>
  );
}

// ─── Billing Tab ───
function BillingTab() {
  const [computeUsage, setComputeUsage] = useState({ totalMinutes: 0, costDollars: "0.00", status: "none" });
  useEffect(() => {
    fetch("/api/compute/lifecycle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_usage", userId: "current" }) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setComputeUsage(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="animate-tab-switch">
      <h2 className="text-[22px] font-semibold text-white">Plan & Billing</h2>
      <p className="mt-2 text-[14px] text-[#777]">Manage your subscription and usage.</p>

      <SectionTitle>Current Plan</SectionTitle>
      <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold text-white">Pro Plan</span>
              <span className="rounded-full bg-purple-600/20 px-2 py-0.5 text-[10px] font-semibold text-purple-400">PRO</span>
            </div>
            <div className="mt-1 text-[13px] text-[#777]">$20/month · Billed monthly</div>
          </div>
          <a href="/pricing" className="rounded-lg bg-purple-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-purple-500">
            View Plans
          </a>
        </div>
      </div>

      <SectionTitle>Usage This Month</SectionTitle>
      <div className="mt-2 space-y-4">
        {/* Credits */}
        <div className="rounded-xl bg-[#1E1E1E] p-4 ring-1 ring-white/[0.04]">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-white">Credits</span>
            <span className="text-[#999]">500 / 500 left</span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400" style={{ width: "100%" }} />
          </div>
          <div className="mt-1.5 text-[11px] text-[#666]">0 requests used today · Resets at midnight UTC</div>
        </div>

        {/* AI Usage */}
        <div className="rounded-xl bg-[#1E1E1E] p-4 ring-1 ring-white/[0.04]">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-white">AI Requests</span>
            <span className="text-[#999]">0 / unlimited</span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: "0%" }} />
          </div>
          <div className="mt-1.5 text-[11px] text-[#666]">Pro plan includes unlimited AI requests</div>
        </div>

        {/* Compute Usage */}
        <div className="rounded-xl bg-[#1E1E1E] p-4 ring-1 ring-white/[0.04]">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-white">Compute (AI Computer)</span>
            <span className="text-[#999]">{computeUsage.totalMinutes} min · ${computeUsage.costDollars}</span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400" style={{ width: `${Math.min(100, (computeUsage.totalMinutes / 600) * 100)}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] text-[#666]">
            {computeUsage.status === "running" ? "VM is running" : computeUsage.status === "stopped" ? "VM is stopped (auto-paused)" : "No active VM"}
          </div>
        </div>
      </div>

      <SectionTitle>Billing History</SectionTitle>
      <div className="mt-2 rounded-xl bg-[#1E1E1E] ring-1 ring-white/[0.04]">
        <div className="flex items-center justify-between px-4 py-3 text-[12px]">
          <span className="text-[#999]">Apr 1, 2026</span>
          <span className="text-white">$20.00</span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">Paid</span>
        </div>
        <div className="border-t border-[#2A2A2A]" />
        <div className="flex items-center justify-between px-4 py-3 text-[12px]">
          <span className="text-[#999]">Mar 1, 2026</span>
          <span className="text-white">$20.00</span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">Paid</span>
        </div>
      </div>
    </div>
  );
}

// ─── AI & Models Tab ───
function AITab() {
  const [model, setModel] = useSettings("ai-model", "claude-sonnet-4");
  const [selfVerify, setSelfVerify] = useSettings("self-verification", true);
  const [autoRetry, setAutoRetry] = useSettings("auto-retry", true);
  const [planning, setPlanning] = useSettings("planning-mode", true);
  const [heartbeatEnabled, setHeartbeatEnabled] = useSettings("heartbeat", false);
  const [heartbeatInterval, setHeartbeatInterval] = useSettings("heartbeat-interval", "30");

  return (
    <div className="animate-tab-switch">
      <h2 className="text-[22px] font-semibold text-white">AI & Models</h2>
      <p className="mt-2 text-[14px] text-[#777]">Configure AI behavior and model selection.</p>

      <SectionTitle>Default Model</SectionTitle>
      <SettingRow label="Primary model" description="Used for code generation and planning.">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="no-hover-fill w-[220px] rounded-lg border border-[#3A3A3A] bg-[#252525] px-4 py-2.5 text-[14px] text-white outline-none"
        >
          <option value="claude-sonnet-4">Claude Sonnet 4</option>
          <option value="claude-opus-4">Claude Opus 4</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
        </select>
      </SettingRow>
      <Divider />

      <SectionTitle>Agent Behavior</SectionTitle>
      <SettingRow label="Self-Verifying Agent" description="AI tests its own work in browser before delivering results.">
        <Toggle checked={selfVerify} onChange={setSelfVerify} />
      </SettingRow>
      <Divider />

      <SettingRow label="Auto-retry on failure" description="Agent automatically diagnoses and fixes errors (up to 5 attempts).">
        <Toggle checked={autoRetry} onChange={setAutoRetry} />
      </SettingRow>
      <Divider />

      <SettingRow label="Planning mode" description="AI creates detailed technical plans before building.">
        <Toggle checked={planning} onChange={setPlanning} />
      </SettingRow>
      <Divider />

      <SectionTitle>Heartbeat</SectionTitle>
      <SettingRow label="Auto health check" description="AI periodically checks project health (dev server, build, errors).">
        <Toggle checked={heartbeatEnabled} onChange={setHeartbeatEnabled} />
      </SettingRow>
      <Divider />

      <SettingRow label="Check interval">
        <select value={heartbeatInterval} onChange={(e) => setHeartbeatInterval(e.target.value)} className="no-hover-fill rounded-lg border border-[#3A3A3A] bg-[#252525] px-4 py-2.5 text-[14px] text-white outline-none">
          <option value="15">Every 15 min</option>
          <option value="30">Every 30 min</option>
          <option value="60">Every hour</option>
        </select>
      </SettingRow>
      <Divider />

    </div>
  );
}

// ─── Integrations Tab ───
// Thin wrapper around the shared MCPHubView so Settings and the
// standalone /integrations route render the exact same view.
function IntegrationsTab() {
  return <MCPHubView header />;
}

// ─── Notifications Tab ───
function NotificationsTab() {
  const [buildFailures, setBuildFailures] = useSettings("notif-build-failures", true);
  const [serverCrashes, setServerCrashes] = useSettings("notif-server-crashes", true);
  const [taskCompletion, setTaskCompletion] = useSettings("notif-task-completion", true);
  const [healthCheck, setHealthCheck] = useSettings("notif-health-check", false);
  const [autoFix, setAutoFix] = useSettings("notif-auto-fix", true);
  const [weeklySummary, setWeeklySummary] = useSettings("notif-weekly-summary", false);

  return (
    <div className="animate-tab-switch">
      <h2 className="text-[22px] font-semibold text-white">Notifications</h2>
      <p className="mt-2 text-[14px] text-[#777]">Choose what you want to be notified about.</p>

      <SectionTitle>Agent Alerts</SectionTitle>
      <SettingRow label="Build failures" description="Notify when AI detects a build error.">
        <Toggle checked={buildFailures} onChange={setBuildFailures} />
      </SettingRow>
      <Divider />
      <SettingRow label="Server crashes" description="Notify when dev server stops responding.">
        <Toggle checked={serverCrashes} onChange={setServerCrashes} />
      </SettingRow>
      <Divider />
      <SettingRow label="Task completion" description="Notify when AI finishes a task.">
        <Toggle checked={taskCompletion} onChange={setTaskCompletion} />
      </SettingRow>
      <Divider />

      <SectionTitle>Heartbeat</SectionTitle>
      <SettingRow label="Health check results" description="Get notified after each heartbeat cycle.">
        <Toggle checked={healthCheck} onChange={setHealthCheck} />
      </SettingRow>
      <Divider />
      <SettingRow label="Auto-fix actions" description="Notify when AI automatically fixes an issue.">
        <Toggle checked={autoFix} onChange={setAutoFix} />
      </SettingRow>

      <SectionTitle>Email</SectionTitle>
      <SettingRow label="Weekly summary" description="Receive a weekly summary of AI activity.">
        <Toggle checked={weeklySummary} onChange={setWeeklySummary} />
      </SettingRow>
    </div>
  );
}

// ─── Appearance Tab ───
function AppearanceTab() {
  const [theme, setTheme] = useSettings<"dark" | "light" | "system">("theme", "dark");
  const [fontSize, setFontSize] = useSettings("editor-font-size", "14");
  const [minimap, setMinimap] = useSettings("editor-minimap", false);
  const [lineNumbers, setLineNumbers] = useSettings("editor-line-numbers", true);

  // Apply theme on change
  useEffect(() => {
    if (theme === "dark") {
      localStorage.setItem("meld-theme", "dark");
    } else if (theme === "light") {
      localStorage.setItem("meld-theme", "light");
    }
  }, [theme]);

  return (
    <div className="animate-tab-switch">
      <h2 className="text-[22px] font-semibold text-white">Appearance</h2>
      <p className="mt-2 text-[14px] text-[#777]">Customize how Meld looks.</p>

      <SectionTitle>Theme</SectionTitle>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          { id: "dark" as const, label: "Dark", icon: <Moon className="h-5 w-5" /> },
          { id: "light" as const, label: "Light", icon: <Sun className="h-5 w-5" /> },
          { id: "system" as const, label: "System", icon: <Monitor className="h-5 w-5" /> },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setTheme(opt.id)}
            className={`no-hover-fill flex flex-col items-center gap-2 rounded-xl p-4 transition-all ${
              theme === opt.id
                ? "bg-purple-600/10 text-purple-400 ring-1 ring-purple-500/30"
                : "bg-[#1E1E1E] text-[#777] ring-1 ring-white/[0.04] hover:ring-white/[0.08]"
            }`}
          >
            {opt.icon}
            <span className="text-[12px] font-medium">{opt.label}</span>
          </button>
        ))}
      </div>

      <SectionTitle>Editor</SectionTitle>
      <SettingRow label="Font size" description="Code editor font size.">
        <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="no-hover-fill rounded-lg border border-[#3A3A3A] bg-[#252525] px-4 py-2.5 text-[14px] text-white outline-none">
          <option value="12">12px</option>
          <option value="13">13px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
        </select>
      </SettingRow>
      <Divider />

      <SettingRow label="Minimap" description="Show minimap in code editor.">
        <Toggle checked={minimap} onChange={setMinimap} />
      </SettingRow>
      <Divider />

      <SettingRow label="Line numbers" description="Show line numbers in code editor.">
        <Toggle checked={lineNumbers} onChange={setLineNumbers} />
      </SettingRow>
    </div>
  );
}

// ─── Main Settings Page ───
export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <div className="flex h-screen flex-col bg-[#0D0D0D]">
      {/* Top bar */}
      <div className="border-b border-[#2A2A2A] bg-[#141414]">
        <div className="flex h-14 items-center gap-4 px-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] text-[#999] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-5 w-px bg-[#333]" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#252525]">
              <Blend className="h-3.5 w-3.5 text-[#999]" />
            </div>
            <span className="text-[16px] font-semibold text-white">Settings</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 gap-0 px-8 py-8">
        {/* Sidebar */}
        <div className="w-[240px] flex-shrink-0 pr-8">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`no-hover-fill flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[14px] transition-all ${
                  activeTab === tab.id
                    ? "bg-white/[0.06] font-medium text-white"
                    : "text-[#888] hover:bg-white/[0.03] hover:text-[#ccc]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="mt-10 border-t border-[#2A2A2A] pt-5">
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
                router.push("/login");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[14px] text-red-400/70 transition-colors hover:bg-red-500/5 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 overflow-y-auto rounded-2xl bg-[#151515] p-8 ring-1 ring-white/[0.04]">
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "account" && <AccountTab />}
          {activeTab === "billing" && <BillingTab />}
          {activeTab === "ai" && <AITab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "appearance" && <AppearanceTab />}
        </div>
      </div>
    </div>
  );
}
