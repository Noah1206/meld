import type { WebContainer } from "@webcontainer/api";
import { INSPECTOR_SCRIPT } from "./inspector-script";

/**
 * WebContainer에 인스펙터 스크립트 주입
 * 1. public/__meld-inspector.js 파일 쓰기
 * 2. index.html에 <script> 태그 삽입
 */
export async function injectInspector(wc: WebContainer): Promise<void> {
  // 1. 인스펙터 스크립트 파일 생성
  await wc.fs.writeFile("public/__meld-inspector.js", INSPECTOR_SCRIPT);

  // 2. index.html 찾아서 script 태그 삽입
  const htmlPaths = ["index.html", "public/index.html"];

  for (const htmlPath of htmlPaths) {
    try {
      const html = await wc.fs.readFile(htmlPath, "utf-8");

      // 이미 주입되어 있으면 스킵
      if (html.includes("__meld-inspector")) continue;

      // </head> 앞에 스크립트 삽입
      const scriptTag = '<script src="/__meld-inspector.js" defer></script>';
      const modified = html.replace("</head>", `  ${scriptTag}\n  </head>`);

      if (modified !== html) {
        await wc.fs.writeFile(htmlPath, modified);
        return; // 첫 번째 성공하면 종료
      }
    } catch {
      // 파일이 없으면 다음 경로 시도
      continue;
    }
  }

  // index.html이 없어도 graceful skip (Vite는 public 폴더 자동 서빙)
}
