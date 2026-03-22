"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search, Lock, Check, Link as LinkIcon, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { FigmaClient } from "@/lib/figma/client";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null);
  const [repoSearch, setRepoSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Figma URL 관련
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaFileKey, setFigmaFileKey] = useState<string | null>(null);
  const [figmaFileName, setFigmaFileName] = useState<string | null>(null);
  const [figmaValidating, setFigmaValidating] = useState(false);
  const [figmaError, setFigmaError] = useState<string | null>(null);

  const createMutation = trpc.project.create.useMutation();
  const loadFileMutation = trpc.figma.loadFile.useMutation();
  const reposQuery = trpc.git.listRepos.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const filteredRepos = useMemo(() => {
    const repos = reposQuery.data ?? [];
    if (!repoSearch.trim()) return repos;
    const q = repoSearch.toLowerCase();
    return repos.filter((r) => r.fullName.toLowerCase().includes(q));
  }, [reposQuery.data, repoSearch]);

  const canSave = name.trim();

  // Figma URL 검증
  const handleFigmaValidate = async () => {
    const parsed = FigmaClient.extractFileKey(figmaUrl);
    if (!parsed) {
      setFigmaError("유효하지 않은 Figma URL입니다.");
      return;
    }

    setFigmaValidating(true);
    setFigmaError(null);

    try {
      const result = await loadFileMutation.mutateAsync({ figmaUrl });
      setFigmaFileKey(result.fileKey);
      setFigmaFileName(result.fileName);
    } catch (err) {
      setFigmaError(err instanceof Error ? err.message : "Figma 파일 검증 실패");
    } finally {
      setFigmaValidating(false);
    }
  };

  const clearFigma = () => {
    setFigmaUrl("");
    setFigmaFileKey(null);
    setFigmaFileName(null);
    setFigmaError(null);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setError(null);

    try {
      const project = await createMutation.mutateAsync({
        name: name.trim(),
        figmaFileKey: figmaFileKey ?? undefined,
        figmaFileName: figmaFileName ?? undefined,
        githubOwner: selectedRepo?.owner,
        githubRepo: selectedRepo?.name,
      });

      const created = project as { id: string };
      router.push(`/project/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트 생성 실패");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* 헤더 */}
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-[#6B7280] transition-colors hover:text-[#1C1C1C]"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </button>
          <h1 className="text-sm font-bold text-[#1C1C1C]">새 프로젝트</h1>
          <button
            onClick={handleSave}
            disabled={!canSave || createMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-[#2E86C1] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#2573A8] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            저장
          </button>
        </div>
      </header>

      {/* 폼 */}
      <main className="mx-auto max-w-2xl p-6">
        <div className="animate-fade-in-up space-y-6 rounded-xl border border-[#E5E7EB] bg-white p-6">
          {error && (
            <div className="animate-fade-in rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 프로젝트 이름 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#1C1C1C]">
              프로젝트 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 랜딩 페이지 리디자인"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm placeholder:text-[#9CA3AF] focus:border-[#2E86C1] focus:outline-none focus:ring-1 focus:ring-[#2E86C1]"
            />
          </div>

          {/* Figma URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#1C1C1C]">
              Figma URL
            </label>

            {figmaFileName ? (
              // 검증 성공 시 파일명 칩 표시
              <div className="animate-fade-in flex items-center gap-2 rounded-lg border border-[#2E86C1] bg-blue-50 px-3 py-2.5">
                <LinkIcon className="h-4 w-4 flex-shrink-0 text-[#2E86C1]" />
                <span className="flex-1 truncate text-sm font-medium text-[#2E86C1]">
                  {figmaFileName}
                </span>
                <button
                  onClick={clearFigma}
                  className="flex-shrink-0 rounded-md p-0.5 text-[#2E86C1] hover:bg-blue-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              // URL 입력 + 검증 버튼
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://www.figma.com/design/..."
                  value={figmaUrl}
                  onChange={(e) => {
                    setFigmaUrl(e.target.value);
                    setFigmaError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleFigmaValidate()}
                  className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm placeholder:text-[#9CA3AF] focus:border-[#2E86C1] focus:outline-none focus:ring-1 focus:ring-[#2E86C1]"
                  disabled={figmaValidating}
                />
                <button
                  onClick={handleFigmaValidate}
                  disabled={figmaValidating || !figmaUrl.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#374151] px-3 py-2 text-sm font-medium text-white transition-all hover:bg-[#1F2937] disabled:opacity-50"
                >
                  {figmaValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  {figmaValidating ? "검증 중..." : "연결"}
                </button>
              </div>
            )}

            {figmaError && (
              <p className="animate-fade-in text-xs text-red-500">{figmaError}</p>
            )}
          </div>

          {/* GitHub 레포지토리 선택 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#1C1C1C]">
                GitHub 레포지토리
              </label>
              {selectedRepo && (
                <button
                  onClick={() => setSelectedRepo(null)}
                  className="text-xs text-[#6B7280] hover:text-[#1C1C1C]"
                >
                  선택 해제
                </button>
              )}
            </div>

            {/* 선택된 레포 표시 */}
            {selectedRepo && (
              <div className="animate-fade-in flex items-center gap-2 rounded-lg border border-[#2E86C1] bg-blue-50 px-3 py-2.5">
                <Check className="h-4 w-4 flex-shrink-0 text-[#2E86C1]" />
                <span className="text-sm font-medium text-[#2E86C1]">
                  {selectedRepo.owner}/{selectedRepo.name}
                </span>
              </div>
            )}

            {/* 레포 검색 + 리스트 */}
            {!selectedRepo && (
              <div className="rounded-lg border border-[#E5E7EB]">
                {/* 검색 */}
                <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-3 py-2">
                  <Search className="h-4 w-4 flex-shrink-0 text-[#9CA3AF]" />
                  <input
                    type="text"
                    placeholder="레포지토리 검색..."
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="flex-1 text-sm placeholder:text-[#9CA3AF] focus:outline-none"
                  />
                </div>

                {/* 리스트 */}
                <div className="max-h-56 overflow-y-auto">
                  {reposQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-[#6B7280]" />
                      <span className="text-sm text-[#6B7280]">레포지토리 불러오는 중...</span>
                    </div>
                  ) : reposQuery.isError ? (
                    <div className="px-3 py-6 text-center text-sm text-red-500">
                      레포지토리를 불러올 수 없습니다. GitHub 로그인을 확인해주세요.
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-[#9CA3AF]">
                      {repoSearch ? "검색 결과가 없습니다." : "레포지토리가 없습니다."}
                    </div>
                  ) : (
                    filteredRepos.map((repo) => (
                      <button
                        key={repo.fullName}
                        onClick={() => setSelectedRepo({ owner: repo.owner, name: repo.name })}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#F3F4F6]"
                      >
                        {repo.isPrivate && (
                          <Lock className="h-3 w-3 flex-shrink-0 text-[#9CA3AF]" />
                        )}
                        <span className="truncate text-[#374151]">
                          <span className="text-[#6B7280]">{repo.owner}/</span>
                          <span className="font-medium">{repo.name}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
