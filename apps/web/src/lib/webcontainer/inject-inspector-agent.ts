import { INSPECTOR_SCRIPT } from "./inspector-script";

/**
 * 로컬 에이전트 (Desktop/Local) 모드에서 인스펙터 스크립트 주입
 * WebContainer가 아닌 readFile/writeFile을 사용하여 프로젝트의 public/ 폴더에 직접 기록
 */
export async function injectInspectorViaAgent(
  readFile: (path: string) => Promise<string>,
  writeFile: (path: string, content: string) => Promise<boolean>,
): Promise<void> {
  // 1. public/ 폴더에 인스펙터 스크립트 파일 생성
  const written = await writeFile("public/__meld-inspector.js", INSPECTOR_SCRIPT);
  if (!written) return; // public 폴더가 없거나 쓰기 실패

  // 2. index.html에 <script> 태그 삽입 시도 (Vite/CRA)
  const htmlPaths = ["index.html", "public/index.html"];

  for (const htmlPath of htmlPaths) {
    try {
      const html = await readFile(htmlPath);
      if (html.includes("__meld-inspector")) return; // 이미 주입됨

      const scriptTag = '<script src="/__meld-inspector.js" defer></script>';
      const modified = html.replace("</head>", `  ${scriptTag}\n  </head>`);

      if (modified !== html) {
        await writeFile(htmlPath, modified);
        return;
      }
    } catch {
      continue; // 파일 없으면 다음 경로 시도
    }
  }

  // index.html이 없는 프레임워크(Next.js 등)는 public/ 파일 자동 서빙에 의존
  // 유저가 수동으로 <Script src="/__meld-inspector.js" /> 추가 필요할 수 있음
}
