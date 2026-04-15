// User-facing MCP error formatter.
//
// The tRPC `mcp.connect` router throws raw sentinels like
// `LOGIN_REQUIRED:figma` and `TOKEN_REQUIRED` when credentials are
// missing, plus whatever the upstream adapter's fetch call returns
// on network or auth failures. This helper turns those into short,
// human-readable strings for the UI (connect modal, settings badge,
// toast notifications).

const CAPITALIZE = (s: string) =>
  s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);

export function formatMCPError(err: unknown, adapterId: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  const serviceName = CAPITALIZE(adapterId);

  if (raw === "TOKEN_REQUIRED" || raw.includes("TOKEN_REQUIRED")) {
    return `${serviceName} API 키가 필요합니다. 연결 버튼을 눌러 토큰을 입력하세요.`;
  }
  if (raw.startsWith("LOGIN_REQUIRED:")) {
    const service = CAPITALIZE(raw.split(":")[1] || adapterId);
    return `먼저 ${service} 계정에 로그인해주세요.`;
  }
  if (
    raw.includes("ECONNREFUSED") ||
    raw.includes("Failed to fetch") ||
    raw.toLowerCase().includes("network")
  ) {
    return `${serviceName}에 연결할 수 없습니다. 네트워크 상태를 확인하세요.`;
  }
  if (raw.includes("401") || raw.includes("403") || raw.includes("Unauthorized")) {
    return `${serviceName} 인증이 만료되었습니다. 다시 연결해주세요.`;
  }
  if (raw.includes("timeout") || raw.includes("ETIMEDOUT")) {
    return `${serviceName} 서버가 응답하지 않습니다. 잠시 후 다시 시도하세요.`;
  }
  if (raw.includes("404") || raw.includes("Not Found")) {
    return `${serviceName} 서비스를 찾을 수 없습니다. 설정을 확인하세요.`;
  }

  const clean = raw
    .replace(/Error invoking remote method '[^']+': /, "")
    .replace(/\{[\s\S]*\}/, "")
    .trim();
  return clean.length > 100
    ? clean.slice(0, 100) + "…"
    : clean || `${serviceName}에 연결하지 못했습니다.`;
}
