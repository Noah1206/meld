"use client";

// MCPHubView — reusable MCP connection manager.
//
// This is the same view rendered inside Settings → Integrations and
// at the standalone /integrations route. Every MCP preset is listed
// with its live connection status (from `useMCPStore`), a Connect /
// Disconnect button, a per-row Test button that re-validates the
// upstream credentials, and a one-click "Validate all" action for
// the whole list.
//
// All connection logic goes through `useMCPConnect` so the two
// entry points stay behaviorally identical.

import { useEffect, useState, useCallback } from "react";
import { MCP_PRESETS, type MCPPreset } from "@/lib/mcp/presets-client";
import { useMCPConnect } from "@/lib/mcp/useMCPConnect";
import { useMCPStore } from "@/lib/store/mcp-store";

interface Toast {
  kind: "ok" | "err";
  msg: string;
}

const CATEGORY_ORDER = [
  "design",
  "code",
  "deploy",
  "data",
  "docs",
  "project",
  "communication",
  "monitoring",
  "system",
  "integration",
];

const CATEGORY_LABELS: Record<string, string> = {
  design: "디자인",
  code: "코드 & 레포지토리",
  deploy: "배포",
  data: "데이터베이스",
  docs: "문서",
  project: "프로젝트 관리",
  communication: "커뮤니케이션",
  monitoring: "모니터링",
  system: "시스템 & 로컬",
  integration: "통합",
};

export interface MCPHubViewProps {
  /** Show the big page header (title + subtitle). Off for embedded usage. */
  header?: boolean;
}

export function MCPHubView({ header = true }: MCPHubViewProps) {
  const [tokenModal, setTokenModal] = useState<{ adapterId: string; name: string; hint: string } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [validatingAll, setValidatingAll] = useState(false);
  const [oauthAvailability, setOauthAvailability] = useState<Record<string, boolean>>({});
  const servers = useMCPStore((s) => s.servers);
  const { connect, disconnect, connectingId } = useMCPConnect();

  useEffect(() => {
    const mcpStore = useMCPStore.getState();
    if (mcpStore.servers.length === 0) {
      for (const p of MCP_PRESETS) {
        mcpStore.addServer({ adapterId: p.id, name: p.name, icon: p.icon, category: p.category });
      }
    }
  }, []);

  // Poll the server for which OAuth2 services have registered
  // client_id/secret env vars. When a given service's OAuth app is
  // live, its `oauthOnly` flag is effectively lifted and the Connect
  // button jumps through the full OAuth flow instead of showing the
  // disabled state.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/mcp/oauth-availability")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.availability) {
          setOauthAvailability(data.availability);
        }
      })
      .catch(() => {
        // Non-fatal — presets fall back to their static oauthOnly value.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // An effective-oauthOnly: true when the preset marks itself as
  // OAuth-only AND the server reports the OAuth app is NOT yet wired
  // up. Once env vars exist the button becomes a normal Connect.
  const isOauthBlocked = useCallback(
    (preset: MCPPreset) => {
      if (!preset.oauthOnly) return false;
      return oauthAvailability[preset.id] !== true;
    },
    [oauthAvailability],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleConnect = useCallback(
    async (preset: MCPPreset) => {
      // OAuth2-only services can't be connected until the platform
      // OAuth app is registered. The availability endpoint reports
      // which services have env vars wired up — if one is ready,
      // we redirect into the /api/auth/mcp?service=X flow.
      if (isOauthBlocked(preset)) {
        setToast({
          kind: "err",
          msg: `${preset.name}은 OAuth 앱 등록이 필요해 현재 연결할 수 없습니다.`,
        });
        return;
      }
      if (preset.oauthOnly) {
        // OAuth app IS registered — send the user through the full
        // OAuth2 consent flow. The route handler will exchange the
        // code and store the token in Supabase.
        const redirectTo = typeof window !== "undefined" ? window.location.pathname : "/integrations";
        window.location.href = `/api/auth/mcp?service=${preset.id}&redirect_to=${encodeURIComponent(redirectTo)}`;
        return;
      }
      if (preset.auth === "token") {
        setTokenModal({ adapterId: preset.id, name: preset.name, hint: preset.hint });
        return;
      }
      const result = await connect(preset.id);
      if (result.ok) {
        setToast({ kind: "ok", msg: `${preset.name} 연결 성공 · 도구 ${result.toolCount ?? 0}개` });
      } else if (result.code === "TOKEN_REQUIRED") {
        // OAuth fallback: backend says we need a token — ask the user.
        setTokenModal({ adapterId: preset.id, name: preset.name, hint: preset.hint });
      } else if (result.code === "LOGIN_REQUIRED") {
        // For GitHub/Figma where the user must auth via the top-level
        // login flow first. Surface a toast so the next step is clear.
        setToast({ kind: "err", msg: result.error ?? `${preset.name} 로그인 필요` });
      } else {
        setToast({ kind: "err", msg: result.error ?? `${preset.name} 연결 실패` });
      }
    },
    [connect, isOauthBlocked],
  );

  const handleTokenSubmit = useCallback(
    async (token: string, extra?: Record<string, string>) => {
      if (!tokenModal) return;
      const preset = MCP_PRESETS.find((p) => p.id === tokenModal.adapterId);
      const name = preset?.name ?? tokenModal.name;
      setTokenModal(null);
      const result = await connect(tokenModal.adapterId, token, { extra });
      if (result.ok) {
        setToast({ kind: "ok", msg: `${name} 연결 성공 · 도구 ${result.toolCount ?? 0}개` });
      } else {
        setToast({ kind: "err", msg: result.error ?? `${name} 연결 실패` });
      }
    },
    [tokenModal, connect],
  );

  const handleDisconnect = useCallback(
    async (preset: MCPPreset) => {
      const ok = await disconnect(preset.id);
      if (ok) setToast({ kind: "ok", msg: `${preset.name} 연결을 해제했습니다.` });
      else setToast({ kind: "err", msg: `${preset.name} 해제 중 오류가 발생했습니다.` });
    },
    [disconnect],
  );

  /**
   * Re-run validateConnection against a single adapter that's currently
   * marked as connected. We piggyback on `connect()` with no token: the
   * tRPC router will re-read the stored token from Supabase and hit the
   * upstream API, surfacing 401/expired errors as they happen.
   */
  const handleTest = useCallback(
    async (preset: MCPPreset) => {
      setToast({ kind: "ok", msg: `${preset.name} 검증 중…` });
      const result = await connect(preset.id, undefined, { silent: true });
      if (result.ok) {
        setToast({ kind: "ok", msg: `${preset.name} 정상 · 도구 ${result.toolCount ?? 0}개` });
      } else {
        setToast({ kind: "err", msg: `${preset.name} 검증 실패 · ${result.error ?? "unknown"}` });
      }
    },
    [connect],
  );

  const handleValidateAll = useCallback(async () => {
    // Skip OAuth-blocked presets — they can't be tested without an app.
    const connectedIds = servers
      .filter((s) => s.connected)
      .map((s) => s.adapterId)
      .filter((id) => {
        const preset = MCP_PRESETS.find((p) => p.id === id);
        return preset ? !isOauthBlocked(preset) : true;
      });
    if (connectedIds.length === 0) {
      setToast({ kind: "err", msg: "연결된 MCP가 없습니다." });
      return;
    }
    setValidatingAll(true);
    let ok = 0;
    let fail = 0;
    for (const id of connectedIds) {
      const result = await connect(id, undefined, { silent: true });
      if (result.ok) ok++;
      else fail++;
    }
    setValidatingAll(false);
    setToast({
      kind: fail === 0 ? "ok" : "err",
      msg: `검증 완료 · ${ok}개 정상, ${fail}개 실패`,
    });
  }, [servers, connect, isOauthBlocked]);

  const byCategory = MCP_PRESETS.reduce<Record<string, MCPPreset[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});
  const sortedCategories = CATEGORY_ORDER.filter((c) => byCategory[c]?.length);

  const serverByAdapterId: Record<string, (typeof servers)[number]> = {};
  for (const s of servers) serverByAdapterId[s.adapterId] = s;
  const connectedCount = servers.filter((s) => s.connected).length;
  const connectableCount = MCP_PRESETS.filter((p) => !isOauthBlocked(p)).length;
  const oauthBlockedCount = MCP_PRESETS.length - connectableCount;

  return (
    <div className="animate-tab-switch">
      {header && (
        <>
          <h2 className="text-[22px] font-semibold text-white">Integrations</h2>
          <p className="mt-2 text-[14px] text-[#777]">
            MCP 서버를 연결하면 에이전트가 외부 서비스의 데이터와 도구를 직접 사용할 수 있습니다.
          </p>
        </>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] text-[#888]">
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-400">
            {connectedCount}개 연결됨
          </span>
          <span className="text-[#555]">
            연결 가능 {connectableCount}개
            {oauthBlockedCount > 0 ? ` · OAuth 대기 ${oauthBlockedCount}개` : ""}
          </span>
        </div>
        <button
          onClick={handleValidateAll}
          disabled={validatingAll || connectedCount === 0}
          className="rounded-lg border border-[#3A3A3A] px-3 py-1.5 text-[11px] font-medium text-[#ccc] transition-all hover:border-purple-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {validatingAll ? "검증 중…" : "전체 재검증"}
        </button>
      </div>

      {sortedCategories.map((cat) => (
        <div key={cat}>
          <h3 className="mb-2 mt-8 text-[12px] font-semibold uppercase tracking-wider text-[#666]">
            {CATEGORY_LABELS[cat] ?? cat}
          </h3>
          <div className="mt-2 space-y-2">
            {byCategory[cat].map((preset) => {
              const srv = serverByAdapterId[preset.id];
              const connected = srv?.connected ?? false;
              const error = srv?.error ?? null;
              const isConnecting = connectingId === preset.id || srv?.connecting;
              return (
                <div
                  key={preset.id}
                  className="flex items-start justify-between gap-4 rounded-xl bg-[#1E1E1E] px-4 py-3.5 ring-1 ring-white/[0.04] transition-all hover:ring-white/[0.08]"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#252525] text-[13px] font-bold text-[#999]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preset.logo}
                        alt={preset.name}
                        className="h-5 w-5"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                          (e.currentTarget.parentElement as HTMLElement).textContent = preset.name.charAt(0);
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[13px] font-medium text-white">{preset.name}</div>
                        <AuthBadge auth={preset.auth} />
                        {isOauthBlocked(preset) && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-400">
                            OAuth 앱 필요
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#666]">{preset.hint}</div>
                      {isOauthBlocked(preset) && (
                        <div className="mt-1 text-[11px] text-amber-400/80">
                          이 서비스는 OAuth2 전용이며 Personal Access Token을 지원하지 않습니다. 현재 OAuth 앱 등록 전이라 연결할 수 없습니다.
                        </div>
                      )}
                      {error && !connected && !isOauthBlocked(preset) && (
                        <div className="mt-1 text-[11px] text-red-400">{error}</div>
                      )}
                      {connected && typeof srv?.toolCount === "number" && srv.toolCount > 0 && (
                        <div className="mt-1 text-[11px] text-emerald-400/70">
                          도구 {srv.toolCount}개 사용 가능
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
                    {isOauthBlocked(preset) ? (
                      <span
                        title="OAuth 앱 등록 전까지 비활성 상태입니다."
                        className="cursor-not-allowed rounded-lg border border-amber-500/20 px-4 py-1.5 text-[12px] font-medium text-amber-400/60"
                      >
                        연결 불가
                      </span>
                    ) : connected ? (
                      <>
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                          Connected
                        </span>
                        <button
                          onClick={() => handleTest(preset)}
                          className="rounded-lg px-3 py-1.5 text-[11px] text-[#888] transition-colors hover:text-white"
                          title="재검증"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => handleDisconnect(preset)}
                          className="rounded-lg px-3 py-1.5 text-[11px] text-[#777] transition-colors hover:text-red-400"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : isConnecting ? (
                      <button
                        disabled
                        className="rounded-lg border border-[#3A3A3A] px-4 py-1.5 text-[12px] font-medium text-[#777]"
                      >
                        Connecting…
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(preset)}
                        className="rounded-lg border border-[#3A3A3A] px-4 py-1.5 text-[12px] font-medium text-[#ccc] transition-all hover:border-purple-500/50 hover:text-white"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {tokenModal && (
        <TokenModal
          serverName={tokenModal.name}
          hint={tokenModal.hint}
          adapterId={tokenModal.adapterId}
          onSubmit={handleTokenSubmit}
          onClose={() => setTokenModal(null)}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-[13px] shadow-xl ring-1 backdrop-blur-xl ${
            toast.kind === "ok"
              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
              : "bg-red-500/10 text-red-300 ring-red-500/20"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function AuthBadge({ auth }: { auth: "oauth" | "token" | "none" }) {
  const label = auth === "token" ? "API Key" : auth === "oauth" ? "OAuth" : "Local";
  return (
    <span className="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#888]">
      {label}
    </span>
  );
}

interface TokenModalProps {
  serverName: string;
  hint: string;
  adapterId: string;
  onSubmit: (token: string, extra?: Record<string, string>) => void;
  onClose: () => void;
}

/**
 * Pop-up that collects a PAT / API key. Includes a service-specific
 * "토큰 발급 방법" link when we know it, so the user is never stuck
 * hunting for docs. Also renders adapter-specific extra fields (e.g.
 * Supabase `projectRef`) based on the preset metadata.
 */
function TokenModal({ serverName, hint, adapterId, onSubmit, onClose }: TokenModalProps) {
  const [token, setToken] = useState("");
  const [projectRef, setProjectRef] = useState("");
  const issueUrl = TOKEN_ISSUE_URL[adapterId];
  const docsUrl = TOKEN_DOCS_URL[adapterId];
  const preset = MCP_PRESETS.find((p) => p.id === adapterId);
  const needsProjectRef = preset?.requiresProjectRef ?? false;

  const canSubmit = token.trim() && (!needsProjectRef || projectRef.trim());

  const submit = () => {
    if (!canSubmit) return;
    const extra: Record<string, string> = {};
    if (needsProjectRef) extra.projectRef = projectRef.trim();
    onSubmit(token.trim(), Object.keys(extra).length > 0 ? extra : undefined);
  };

  const openIssuePage = () => {
    if (issueUrl) window.open(issueUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#1A1A1A] p-6 ring-1 ring-white/[0.08] shadow-2xl">
        <h3 className="text-[16px] font-semibold text-white">{serverName} API 키 입력</h3>
        <p className="mt-1 text-[12px] text-[#888]">{hint}</p>
        {issueUrl && (
          <button
            onClick={openIssuePage}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-500/10 px-3 py-2 text-[12px] font-medium text-purple-300 ring-1 ring-purple-500/20 transition-all hover:bg-purple-500/15 hover:text-purple-200"
          >
            🔑 {serverName}에서 토큰 발급받기 (새 탭)
          </button>
        )}
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[11px] text-[#888] hover:text-[#ccc]"
          >
            문서 보기 →
          </a>
        )}
        <p className="mt-3 text-[11px] text-[#666]">
          키는 Meld 서버를 통해 Supabase에 저장되며 연결 시마다 대상 API로 검증 요청이 나갑니다.
        </p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={`${serverName} API key / PAT`}
          className="mt-4 w-full rounded-lg bg-[#252525] px-3 py-2 text-[13px] text-white ring-1 ring-white/[0.06] focus:outline-none focus:ring-purple-500/40"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) submit();
            if (e.key === "Escape") onClose();
          }}
        />
        {needsProjectRef && (
          <>
            <label className="mt-3 block text-[11px] text-[#888]">Project Ref</label>
            <input
              type="text"
              value={projectRef}
              onChange={(e) => setProjectRef(e.target.value)}
              placeholder="abcdefghijklmnopqrst"
              className="mt-1 w-full rounded-lg bg-[#252525] px-3 py-2 text-[13px] text-white ring-1 ring-white/[0.06] focus:outline-none focus:ring-purple-500/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) submit();
                if (e.key === "Escape") onClose();
              }}
            />
            <p className="mt-1 text-[10px] text-[#666]">
              Supabase 대시보드 Project Settings → General → Reference ID 에서 확인
            </p>
          </>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[12px] text-[#888] hover:text-white"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-lg bg-white px-4 py-2 text-[12px] font-semibold text-black hover:bg-[#ddd] disabled:cursor-not-allowed disabled:opacity-40"
          >
            연결
          </button>
        </div>
      </div>
    </div>
  );
}

/** Direct token-generation pages — opened in a new tab by the
 *  "발급 페이지 열기" primary action in TokenModal. If the user is
 *  already logged in to that service, they can create a PAT in
 *  seconds and come back to paste it.
 */
const TOKEN_ISSUE_URL: Record<string, string> = {
  figma: "https://www.figma.com/settings/personal-access-tokens",
  github: "https://github.com/settings/tokens/new?description=Meld&scopes=repo,read:user",
  vercel: "https://vercel.com/account/tokens",
  supabase: "https://supabase.com/dashboard/account/tokens",
  sentry: "https://sentry.io/settings/account/api/auth-tokens/new-token/",
  linear: "https://linear.app/settings/api",
};

/** Longer-form docs link (secondary). Only used when there's no
 *  direct issue URL or the flow has extra steps. */
const TOKEN_DOCS_URL: Record<string, string> = {
  figma: "https://www.figma.com/developers/api#access-tokens",
  github: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
  vercel: "https://vercel.com/docs/rest-api#creating-an-access-token",
  supabase: "https://supabase.com/docs/guides/api/api-keys",
  sentry: "https://docs.sentry.io/api/auth/",
  linear: "https://developers.linear.app/docs/graphql/working-with-the-graphql-api#personal-api-keys",
};
