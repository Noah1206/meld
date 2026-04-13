import JSZip from "jszip";

interface GeneratedFile {
  path: string;
  content: string;
}

/**
 * 파일 목록을 ZIP으로 묶어서 다운로드
 */
export async function downloadAsZip(
  files: GeneratedFile[],
  projectName = "meld-project",
) {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * agent 이벤트에서 생성/수정된 파일들을 수집
 */
export function collectFilesFromEvents(
  events: Array<{ type: string; [key: string]: unknown }>,
): GeneratedFile[] {
  const files = new Map<string, string>();

  for (const event of events) {
    if (event.type === "file_edit" && event.modified) {
      files.set(event.filePath as string, event.modified as string);
    }
  }

  return Array.from(files.entries()).map(([path, content]) => ({ path, content }));
}
