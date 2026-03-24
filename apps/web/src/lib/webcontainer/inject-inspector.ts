import type { WebContainer } from "@webcontainer/api";
import { INSPECTOR_SCRIPT } from "./inspector-script";

/**
 * WebContainer에 인스펙터 스크립트 주입
 * 1. public/__meld-inspector.js 파일 쓰기
 * 2. HTML 엔트리 또는 Next.js 레이아웃에 <script> 태그 삽입
 */
export async function injectInspector(wc: WebContainer): Promise<void> {
  // 1. 인스펙터 스크립트 파일 생성 (public/ 자동 서빙)
  await wc.fs.writeFile("public/__meld-inspector.js", INSPECTOR_SCRIPT);

  // 2-A. SPA용: index.html에 script 태그 삽입
  const htmlPaths = ["index.html", "public/index.html"];

  for (const htmlPath of htmlPaths) {
    try {
      const html = await wc.fs.readFile(htmlPath, "utf-8");
      if (html.includes("__meld-inspector")) return;

      const scriptTag = '<script src="/__meld-inspector.js" defer></script>';
      const modified = html.replace("</head>", `  ${scriptTag}\n  </head>`);

      if (modified !== html) {
        await wc.fs.writeFile(htmlPath, modified);
        return;
      }
    } catch {
      continue;
    }
  }

  // 2-B. Next.js App Router: app/layout.tsx|jsx에 Script 주입
  const layoutPaths = [
    "app/layout.tsx",
    "app/layout.jsx",
    "src/app/layout.tsx",
    "src/app/layout.jsx",
  ];

  for (const layoutPath of layoutPaths) {
    try {
      const content = await wc.fs.readFile(layoutPath, "utf-8");
      if (content.includes("__meld-inspector")) return;

      // <body 태그 뒤에 script 삽입
      const bodyMatch = content.match(/<body[^>]*>/);
      if (bodyMatch) {
        const scriptTag = `\n        <script src="/__meld-inspector.js" defer />`;
        const modified = content.replace(
          bodyMatch[0],
          `${bodyMatch[0]}${scriptTag}`,
        );
        await wc.fs.writeFile(layoutPath, modified);
        return;
      }
    } catch {
      continue;
    }
  }

  // 2-C. Next.js Pages Router: pages/_document.tsx|jsx
  const documentPaths = [
    "pages/_document.tsx",
    "pages/_document.jsx",
    "src/pages/_document.tsx",
    "src/pages/_document.jsx",
  ];

  for (const docPath of documentPaths) {
    try {
      const content = await wc.fs.readFile(docPath, "utf-8");
      if (content.includes("__meld-inspector")) return;

      const bodyMatch = content.match(/<body[^>]*>/);
      if (bodyMatch) {
        const scriptTag = `\n          <script src="/__meld-inspector.js" defer />`;
        const modified = content.replace(
          bodyMatch[0],
          `${bodyMatch[0]}${scriptTag}`,
        );
        await wc.fs.writeFile(docPath, modified);
        return;
      }
    } catch {
      continue;
    }
  }

  // HTML/layout 파일이 없어도 graceful skip
  // Vite/Next.js는 public/ 폴더를 자동 서빙하므로 수동 접근 가능
}
