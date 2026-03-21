// GitHub OAuth 설정
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

function getGitHubConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("GitHub OAuth 환경변수가 설정되지 않았습니다");
  }
  return { clientId, clientSecret, redirectUri };
}

// GitHub OAuth 인증 URL 생성
export function getGitHubAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGitHubConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo user:email",
    state,
  });
  return `${GITHUB_AUTH_URL}?${params}`;
}

// Authorization code → Access token 교환
export async function exchangeGitHubCode(
  code: string
): Promise<{ accessToken: string }> {
  const { clientId, clientSecret, redirectUri } = getGitHubConfig();

  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error("GitHub 토큰 교환 실패");
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`GitHub OAuth 에러: ${data.error_description}`);
  }

  return { accessToken: data.access_token };
}

// GitHub 사용자 정보 조회
export interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string;
}

export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    throw new Error("GitHub 사용자 정보 조회 실패");
  }

  return res.json();
}
