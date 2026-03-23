import type { FileSystemTree, FileNode, DirectoryNode } from "@webcontainer/api";

// node_modules, .git 등 WebContainer에 불필요한 파일 제외
const EXCLUDED_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /^\.next\//,
  /^dist\//,
  /^build\//,
  /^\.cache\//,
  /^coverage\//,
  /\.lock$/,
  /^pnpm-lock\.yaml$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
];

// 바이너리 파일 확장자 (텍스트만 로드)
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp3", ".mp4", ".wav", ".webm",
  ".zip", ".tar", ".gz",
  ".pdf", ".doc", ".docx",
]);

function isExcluded(filePath: string): boolean {
  return EXCLUDED_PATTERNS.some((p) => p.test(filePath));
}

function isBinary(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

interface FileContentFetcher {
  (path: string): Promise<string>;
}

interface ProgressCallback {
  (loaded: number, total: number): void;
}

/**
 * GitHub 레포 파일 목록을 필터링하고 FileSystemTree로 변환
 */
export async function loadRepoToFileSystemTree(
  filePaths: string[],
  fetchContent: FileContentFetcher,
  onProgress?: ProgressCallback,
): Promise<FileSystemTree> {
  // 필터링: 제외 패턴 + 바이너리
  const targetFiles = filePaths.filter(
    (p) => !isExcluded(p) && !isBinary(p),
  );

  const total = targetFiles.length;
  let loaded = 0;

  // 파일 내용을 10개씩 배치로 fetch
  const fileContents = new Map<string, string>();
  const BATCH_SIZE = 10;

  for (let i = 0; i < targetFiles.length; i += BATCH_SIZE) {
    const batch = targetFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (path) => {
        const content = await fetchContent(path);
        return { path, content };
      }),
    );

    for (const result of results) {
      loaded++;
      if (result.status === "fulfilled") {
        fileContents.set(result.value.path, result.value.content);
      }
      // 실패한 파일은 무시 (바이너리 혼입 등)
    }

    onProgress?.(loaded, total);
  }

  // FileSystemTree 구축
  return buildFileSystemTree(fileContents);
}

/**
 * 플랫 파일 맵 → 중첩 FileSystemTree 변환
 */
function buildFileSystemTree(files: Map<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [filePath, content] of files) {
    const parts = filePath.split("/");
    let current: FileSystemTree = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        current[part] = {
          file: { contents: content },
        } satisfies FileNode;
      } else {
        if (!current[part]) {
          current[part] = {
            directory: {},
          } satisfies DirectoryNode;
        }
        current = (current[part] as DirectoryNode).directory;
      }
    }
  }

  return tree;
}
