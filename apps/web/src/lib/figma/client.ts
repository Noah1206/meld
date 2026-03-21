import {
  FIGMA_API_BASE,
  FIGMA_IMAGE_SCALE,
} from "@figma-code-bridge/shared";
import type {
  FigmaFileResponse,
  FigmaImagesResponse,
} from "./types";

export class FigmaClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${FIGMA_API_BASE}${path}`, {
      headers: { "X-Figma-Token": this.token },
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error("Figma API rate limit exceeded. Please try again in 30 seconds.");
      }
      throw new Error(`Figma API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  /** 파일 전체 노드 트리 가져오기 */
  async getFile(fileKey: string): Promise<FigmaFileResponse> {
    return this.request<FigmaFileResponse>(`/files/${fileKey}`);
  }

  /** 특정 노드만 가져오기 */
  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaFileResponse> {
    const ids = nodeIds.join(",");
    return this.request<FigmaFileResponse>(`/files/${fileKey}/nodes?ids=${ids}`);
  }

  /** 프레임 이미지 렌더링 URL 가져오기 */
  async getImages(
    fileKey: string,
    nodeIds: string[],
    format: "png" | "svg" | "jpg" = "png",
    scale: number = FIGMA_IMAGE_SCALE
  ): Promise<Record<string, string>> {
    const ids = nodeIds.join(",");
    const data = await this.request<FigmaImagesResponse>(
      `/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`
    );
    return data.images;
  }

  /** Figma URL에서 파일 키 + 노드 ID 추출 */
  static extractFileKey(url: string): { fileKey: string; nodeId?: string } | null {
    const match = url.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/);
    if (!match) return null;

    const fileKey = match[1];
    const nodeMatch = url.match(/node-id=([^&]+)/);
    const nodeId = nodeMatch ? decodeURIComponent(nodeMatch[1]) : undefined;

    return { fileKey, nodeId };
  }
}
