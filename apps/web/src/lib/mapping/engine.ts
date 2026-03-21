import type { CodeMapping } from "@figma-code-bridge/shared";

/**
 * 3단계 매핑 엔진: 네이밍 컨벤션 → AI 추론 → 캐시
 */

// 1단계: 네이밍 컨벤션으로 매칭
export function matchByNaming(
  figmaNodeName: string,
  filePaths: string[]
): { filePath: string; confidence: number } | null {
  const normalized = figmaNodeName
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

  // PascalCase, camelCase, kebab-case 변환
  const variants = [
    normalized,
    toPascalCase(figmaNodeName),
    toCamelCase(figmaNodeName),
    toKebabCase(figmaNodeName),
  ].map((v) => v.toLowerCase());

  for (const filePath of filePaths) {
    const fileName = filePath.split("/").pop()?.replace(/\.\w+$/, "") ?? "";
    const fileNameLower = fileName.toLowerCase();

    for (const variant of variants) {
      if (fileNameLower === variant || fileNameLower.includes(variant)) {
        return { filePath, confidence: fileNameLower === variant ? 0.95 : 0.7 };
      }
    }
  }

  return null;
}

// 2단계: AI 추론용 프롬프트 빌더
export function buildMappingPrompt(
  figmaNodeName: string,
  figmaNodeType: string,
  filePaths: string[]
): string {
  return `Figma 노드 "${figmaNodeName}" (type: ${figmaNodeType})에 해당하는 코드 파일을 찾아주세요.

프로젝트 파일 목록:
${filePaths.map((p) => `- ${p}`).join("\n")}

가장 관련 있는 파일 경로 하나만 반환해주세요. JSON 형식: {"filePath": "path/to/file.tsx", "confidence": 0.8}`;
}

// 매핑 결과 생성
export function createMapping(
  projectId: string,
  figmaNodeId: string,
  figmaNodeName: string,
  filePath: string,
  method: CodeMapping["matchMethod"],
  confidence: number
): CodeMapping {
  return {
    id: crypto.randomUUID(),
    projectId,
    figmaNodeId,
    figmaNodeName,
    codeFilePath: filePath,
    matchMethod: method,
    confidence,
  };
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .join("-");
}
