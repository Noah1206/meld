import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

// 인증이 필요한 경로
const PROTECTED_PATHS = ["/project"];
// 인증 없이 접근 가능한 경로 (로컬 에이전트 모드 + Electron 워크스페이스)
// Electron 앱에서는 IPC를 통해 인증하므로 쿠키 기반 인증을 건너뜀
const PUBLIC_PATHS = ["/project/workspace", "/project/desktop", "/project/local"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /dashboard → /project/workspace 리다이렉트
  if (pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/project/workspace", request.url));
  }

  // 공개 경로는 바로 통과
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 보호된 경로인지 확인
  const isProtected = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // 세션 쿠키 확인
  const sessionToken = request.cookies.get("fcb_session")?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // JWT 검증
  const session = await verifySessionToken(sessionToken);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/project/:path*"],
};
