import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { executeTool, getClaudeTools } from "@/lib/mcp/registry";

// /api/mcp/execute — MCP 도구 실행 프록시
// 로컬 agent가 MCP 도구를 실행할 때 이 엔드포인트를 통해 서버에서 실행

async function handler(req: NextRequest) {
  if (req.method === "GET") {
    // GET: 연결된 MCP 도구 목록 반환
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tools = getClaudeTools(session.userId);
    return NextResponse.json({
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })),
    });
  }

  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { toolName: string; args: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { toolName, args } = body;
  if (!toolName) {
    return NextResponse.json({ error: "toolName is required" }, { status: 400 });
  }

  try {
    const result = await executeTool(session.userId, toolName, args ?? {});
    return NextResponse.json({
      toolName,
      content: result.content,
      isError: result.isError ?? false,
    });
  } catch (err) {
    return NextResponse.json({
      toolName,
      content: [{ type: "text", text: `Execution failed: ${err instanceof Error ? err.message : "Unknown error"}` }],
      isError: true,
    }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
