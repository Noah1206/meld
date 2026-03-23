import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  // 외부 이미지 도메인 (Figma 이미지 CDN)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "figma-alpha-api.s3.us-west-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "s3-alpha.figma.com",
      },
    ],
  },
  // WebContainer는 SharedArrayBuffer가 필요 → COOP/COEP 헤더
  // sandbox 경로에만 적용 (Figma CDN 이미지 깨짐 방지)
  async headers() {
    const coopCoepHeaders = [
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
    ];
    return [
      // /project/sandbox 정확 경로
      { source: "/project/sandbox", headers: coopCoepHeaders },
      // /project/sandbox/xxx 하위 경로
      { source: "/project/sandbox/:path*", headers: coopCoepHeaders },
    ];
  },
};

export default nextConfig;
