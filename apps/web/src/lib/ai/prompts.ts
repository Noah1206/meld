export function buildCodeEditPrompt(
  figmaNodeName: string,
  figmaNodeType: string,
  userCommand: string,
  currentCode: string,
  filePath: string,
  context?: {
    framework?: string;
    dependencies?: string[];
    projectStructure?: string;
    siblingFiles?: string[];
    designSystemMd?: string; // DESIGN.md 전체 내용
  }
): { system: string; user: string } {
  let systemExtra = "";

  if (context?.framework && context.framework !== "unknown") {
    systemExtra += `\n이 프로젝트는 ${context.framework}를 사용합니다. 프레임워크 패턴을 따르세요.`;
  }
  if (context?.dependencies?.length) {
    systemExtra += `\n사용 가능한 라이브러리: ${context.dependencies.join(", ")}`;
  }
  if (context?.projectStructure) {
    systemExtra += `\n프로젝트 구조:\n${context.projectStructure}`;
  }
  if (context?.siblingFiles?.length) {
    systemExtra += `\n같은 폴더의 파일: ${context.siblingFiles.join(", ")}`;
  }
  if (context?.designSystemMd) {
    systemExtra += `\n\n--- DESIGN SYSTEM ---\n아래 디자인 시스템을 반드시 따르세요. 색상, 폰트, 스페이싱 등 모든 스타일 값은 이 시스템에서 가져오세요.\n\n${context.designSystemMd}\n--- END DESIGN SYSTEM ---`;
  }

  const system = `당신은 Figma 디자인을 코드로 변환하는 전문가입니다.
사용자의 명령에 따라 코드를 수정하세요.
${systemExtra}
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
