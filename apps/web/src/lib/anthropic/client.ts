const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: "text"; text: string }>;
}

export async function callClaude(
  systemPrompt: string,
  messages: AnthropicMessage[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다");
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API 에러: ${res.status} - ${err}`);
  }

  const data: AnthropicResponse = await res.json();
  return data.content[0]?.text ?? "";
}

/**
 * 코드 수정 전용 프롬프트
 */
export function buildCodeEditPrompt(
  figmaNodeName: string,
  figmaNodeType: string,
  userCommand: string,
  currentCode: string,
  filePath: string
): { system: string; user: string } {
  const system = `당신은 Figma 디자인을 코드로 변환하는 전문가입니다.
사용자의 명령에 따라 코드를 수정하세요.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "filePath": "${filePath}",
  "original": "수정 전 코드 (변경된 부분만)",
  "modified": "수정 후 코드 (변경된 부분만)",
  "explanation": "변경 사항 설명 (한국어)"
}`;

  const user = `Figma 노드: "${figmaNodeName}" (${figmaNodeType})
파일: ${filePath}

현재 코드:
\`\`\`
${currentCode}
\`\`\`

사용자 명령: ${userCommand}`;

  return { system, user };
}
