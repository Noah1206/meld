"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WebContainer } from "@webcontainer/api";
import type { FileEntry } from "@figma-code-bridge/shared";
import { loadRepoToFileSystemTree } from "@/lib/webcontainer/repo-loader";
import { injectInspector } from "@/lib/webcontainer/inject-inspector";
import { trpc } from "@/lib/trpc/client";

type BootStatus = "booting" | "cloning" | "installing" | "starting" | "ready" | "error";

interface UseWebContainerReturn {
  connected: boolean;
  fileTree: FileEntry[];
  projectName: string;
  devServerUrl: string | null;
  devServerFramework: string | null;
  dependencies: string[];
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<boolean>;
  status: BootStatus;
  statusMessage: string;
}

// WebContainer 인스턴스는 페이지당 하나만 허용
let wcInstance: WebContainer | null = null;

/**
 * WebContainer 라이프사이클 훅
 * useAgentConnection과 동일한 인터페이스를 반환하여 LocalPanel/ChatInput 재사용
 */
export function useWebContainer(
  owner: string | null,
  repo: string | null,
  branch: string = "main",
): UseWebContainerReturn {
  const [status, setStatus] = useState<BootStatus>("booting");
  const [statusMessage, setStatusMessage] = useState("WebContainer 부팅 중...");
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [devServerUrl, setDevServerUrl] = useState<string | null>(null);
  const [detectedFramework, setDetectedFramework] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const containerRef = useRef<WebContainer | null>(null);
  const bootedRef = useRef(false);

  // tRPC 유틸 — 파일 목록 + 내용 가져오기
  const utils = trpc.useUtils();

  // WebContainer boot + mount + install + dev server
  useEffect(() => {
    if (!owner || !repo || bootedRef.current) return;
    bootedRef.current = true;

    let cancelled = false;

    async function init() {
      try {
        // 1. WebContainer 부팅
        setStatus("booting");
        setStatusMessage("WebContainer 부팅 중...");

        if (!wcInstance) {
          if (typeof window !== "undefined" && !window.crossOriginIsolated) {
            setStatus("error");
            setStatusMessage(
              "Cross-Origin Isolation이 활성화되지 않았습니다. 페이지를 새로고침해주세요.",
            );
            return;
          }
          wcInstance = await WebContainer.boot();
        }
        const wc = wcInstance;
        containerRef.current = wc;
        if (cancelled) return;

        // 2. GitHub 레포 파일 fetch
        setStatus("cloning");
        setStatusMessage("GitHub 레포에서 파일 가져오는 중...");

        const filePaths = await utils.git.listFiles.fetch({
          owner: owner!,
          repo: repo!,
          branch,
        });
        if (cancelled) return;

        const fsTree = await loadRepoToFileSystemTree(
          filePaths,
          async (path) => {
            const { content } = await utils.git.getFileContent.fetch({
              owner: owner!,
              repo: repo!,
              path,
              branch,
            });
            return content;
          },
          (loaded, total) => {
            if (!cancelled) {
              setStatusMessage(`파일 로드 중... (${loaded}/${total})`);
            }
          },
        );
        if (cancelled) return;

        // 3. WebContainer에 마운트
        await wc.mount(fsTree);

        // 3.5. 인스펙터 스크립트 주입 (실패해도 무시)
        try {
          await injectInspector(wc);
        } catch {
          // 인스펙터는 optional feature — 실패 시 무시
        }

        // 파일 트리 빌드
        const tree = buildFileTree(filePaths);
        setFileTree(tree);

        // 4. npm install
        setStatus("installing");
        setStatusMessage("의존성 설치 중... (npm install)");

        const installProcess = await wc.spawn("npm", ["install"]);
        const installExitCode = await installProcess.exit;

        if (cancelled) return;
        if (installExitCode !== 0) {
          setStatus("error");
          setStatusMessage("npm install 실패. package.json을 확인하세요.");
          return;
        }

        // 4.5. package.json 파싱 → 프레임워크/의존성 감지
        try {
          const pkgRaw = await wc.fs.readFile("package.json", "utf-8");
          const pkg = JSON.parse(pkgRaw);
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
          const depNames = Object.keys(allDeps);

          // 프레임워크 감지
          let fw: string | null = null;
          if (allDeps["next"]) fw = "Next.js";
          else if (allDeps["nuxt"]) fw = "Nuxt";
          else if (allDeps["vue"]) fw = "Vue";
          else if (allDeps["@angular/core"]) fw = "Angular";
          else if (allDeps["svelte"]) fw = "Svelte";
          else if (allDeps["react"]) fw = "React";

          setDetectedFramework(fw);

          // 주요 의존성만 추출 (@types, eslint 제외)
          const keyDeps = depNames.filter(
            (d) => !d.startsWith("@types/") && !d.startsWith("eslint"),
          ).slice(0, 30);
          setDependencies(keyDeps);
        } catch {
          // package.json 파싱 실패 시 무시
        }

        // 5. dev server 시작
        setStatus("starting");
        setStatusMessage("Dev server 시작 중...");

        await wc.spawn("npm", ["run", "dev"]);

        // server-ready 이벤트 대기
        wc.on("server-ready", (_port: number, url: string) => {
          if (!cancelled) {
            setDevServerUrl(url);
            setStatus("ready");
            setStatusMessage("준비 완료!");
          }
        });
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setStatusMessage(
            `오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
          );
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [owner, repo, branch, utils]);

  // readFile: WebContainer fs에서 읽기
  const readFile = useCallback(async (path: string): Promise<string> => {
    const wc = containerRef.current;
    if (!wc) throw new Error("WebContainer가 준비되지 않았습니다");
    const content = await wc.fs.readFile(path, "utf-8");
    return content;
  }, []);

  // writeFile: WebContainer fs에 쓰기
  const writeFile = useCallback(
    async (path: string, content: string): Promise<boolean> => {
      const wc = containerRef.current;
      if (!wc) return false;
      try {
        await wc.fs.writeFile(path, content);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  return {
    connected: status === "ready",
    fileTree,
    projectName: owner && repo ? `${owner}/${repo}` : "",
    devServerUrl,
    devServerFramework: detectedFramework,
    dependencies,
    readFile,
    writeFile,
    status,
    statusMessage,
  };
}

/**
 * 플랫 파일 경로 목록 → FileEntry[] 트리 변환
 */
function buildFileTree(paths: string[]): FileEntry[] {
  // node_modules 등 제외
  const filtered = paths.filter(
    (p) =>
      !p.startsWith("node_modules/") &&
      !p.startsWith(".git/") &&
      !p.startsWith(".next/") &&
      !p.startsWith("dist/"),
  );

  const root: FileEntry[] = [];
  const dirMap = new Map<string, FileEntry>();

  for (const filePath of filtered) {
    const parts = filePath.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        const entry: FileEntry = { path: currentPath, type: "file" };
        if (parentPath) {
          const parent = dirMap.get(parentPath);
          if (parent) {
            parent.children = parent.children ?? [];
            parent.children.push(entry);
          }
        } else {
          root.push(entry);
        }
      } else if (!dirMap.has(currentPath)) {
        const entry: FileEntry = { path: currentPath, type: "dir", children: [] };
        dirMap.set(currentPath, entry);

        if (parentPath) {
          const parent = dirMap.get(parentPath);
          if (parent) {
            parent.children = parent.children ?? [];
            parent.children.push(entry);
          }
        } else {
          root.push(entry);
        }
      }
    }
  }

  return root;
}
