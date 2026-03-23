"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, Lock, Check, Link as LinkIcon, X, Blend } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { FigmaClient } from "@/lib/figma/client";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null);
  const [repoSearch, setRepoSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 lg:px-16 py-3.5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#787774] transition-colors hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Blend className="h-3.5 w-3.5 text-white" />
            </div>
          </Link>
          <button
            onClick={handleSave}
            disabled={!canSave || createMutation.isPending}
            className="flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-5 py-2 text-[13px] font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98] disabled:opacity-40"
          >
            {createMutation.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            저장
          </button>
        </div>
      </header>

      {/* 폼 */}
      <main className="mx-auto max-w-[1440px] px-6 lg:px-16 pt-10 pb-20">
        <div className="animate-fade-in-up mb-8">
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            새 프로젝트
          </h1>
          <p className="mt-1.5 text-[14px] text-[#787774]">
            Figma 파일과 GitHub 레포를 연결하세요
          </p>
        </div>

        <div className="space-y-8">
          {error && (
            <div className="animate-fade-in rounded-xl bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#DC2626]">
              {error}
            </div>
          )}

          {/* 프로젝트 이름 */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-[#1A1A1A]">
              프로젝트 이름
            </label>
            <input
              type="text"
              placeholder="예: 랜딩 페이지 리디자인"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-[#F7F7F5] px-4 py-3 text-[14px] text-[#1A1A1A] ring-1 ring-black/[0.04] placeholder:text-[#B4B4B0] transition-colors focus:bg-[#EEEEEC] focus:ring-black/[0.08] focus:outline-none"
            />
          </div>

          {/* Figma URL */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-[#1A1A1A]">
              Figma 파일 연결
            </label>
            <p className="text-[12px] text-[#B4B4B0]">
              Figma에서 공유 링크를 복사하여 붙여넣으세요
            </p>

            {figmaFileName ? (
              <div className="animate-fade-in flex items-center gap-2.5 rounded-xl bg-[#F7F7F5] px-4 py-3 ring-1 ring-black/[0.04]">
                <Check className="h-4 w-4 flex-shrink-0 text-[#787774]" />
                <span className="flex-1 truncate text-[14px] font-medium text-[#1A1A1A]">
                  {figmaFileName}
                </span>
                <button
                  onClick={clearFigma}
                  className="flex-shrink-0 rounded-lg p-1 text-[#B4B4B0] transition-colors hover:bg-[#EEEEEC] hover:text-[#787774]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Figma 공유 링크 붙여넣기"
                    value={figmaUrl}
                    onChange={(e) => {
                      setFigmaUrl(e.target.value);
                      setFigmaError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleFigmaValidate()}
                    className="flex-1 rounded-xl bg-[#F7F7F5] px-4 py-3 text-[14px] text-[#1A1A1A] ring-1 ring-black/[0.04] placeholder:text-[#B4B4B0] transition-colors focus:bg-[#EEEEEC] focus:ring-black/[0.08] focus:outline-none"
                    disabled={figmaValidating}
                  />
                  <button
                    onClick={handleFigmaValidate}
                    disabled={figmaValidating || !figmaUrl.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-4 py-3 text-[13px] font-medium text-white transition-all hover:bg-[#333] active:scale-[0.98] disabled:opacity-40"
                  >
                    {figmaValidating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LinkIcon className="h-3.5 w-3.5" />
                    )}
                    {figmaValidating ? "확인 중" : "확인"}
                  </button>
                </div>

                {/* 가이드 */}
                <div className="rounded-xl bg-[#F7F7F5] px-4 py-3.5 ring-1 ring-black/[0.04]">
                  <p className="mb-2.5 text-[12px] font-semibold text-[#1A1A1A]">링크 가져오는 방법</p>
                  <ol className="space-y-2 text-[12px] text-[#787774]">
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEEEEC] text-[10px] font-semibold text-[#787774]">1</span>
                      <span>Figma에서 파일을 엽니다</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEEEEC] text-[10px] font-semibold text-[#787774]">2</span>
                      <span>우측 상단 <span className="font-medium text-[#1A1A1A]">공유하기</span> 버튼 클릭</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEEEEC] text-[10px] font-semibold text-[#787774]">3</span>
                      <span><span className="font-medium text-[#1A1A1A]">링크 복사</span>를 눌러 여기에 붙여넣기</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {figmaError && (
              <p className="animate-fade-in text-[12px] text-[#DC2626]">{figmaError}</p>
            )}
          </div>

          {/* GitHub 레포지토리 선택 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold text-[#1A1A1A]">
                GitHub 레포지토리
              </label>
              {selectedRepo && (
                <button
                  onClick={() => setSelectedRepo(null)}
                  className="text-[12px] text-[#B4B4B0] transition-colors hover:text-[#787774]"
                >
                  선택 해제
                </button>
              )}
            </div>

            {selectedRepo && (
              <div className="animate-fade-in flex items-center gap-2.5 rounded-xl bg-[#F7F7F5] px-4 py-3 ring-1 ring-black/[0.04]">
                <Check className="h-4 w-4 flex-shrink-0 text-[#787774]" />
                <span className="text-[14px] font-medium text-[#1A1A1A]">
                  {selectedRepo.owner}/{selectedRepo.name}
                </span>
              </div>
            )}

            {!selectedRepo && (
              <div className="rounded-xl bg-[#F7F7F5] ring-1 ring-black/[0.04]">
                {/* 검색 */}
                <div className="flex items-center gap-2.5 px-4 py-3">
                  <Search className="h-4 w-4 flex-shrink-0 text-[#B4B4B0]" />
                  <input
                    type="text"
                    placeholder="레포지토리 검색..."
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="flex-1 bg-transparent text-[14px] text-[#1A1A1A] placeholder:text-[#B4B4B0] focus:outline-none"
                  />
                </div>

                {/* 구분선 */}
                <div className="mx-4 h-px bg-[#E0E0DC]" />

                {/* 리스트 */}
                <div className="max-h-72 overflow-y-auto overscroll-contain py-1">
                  {reposQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10">
                      <Loader2 className="h-4 w-4 animate-spin text-[#787774]" />
                      <span className="text-[13px] text-[#787774]">불러오는 중...</span>
                    </div>
                  ) : reposQuery.isError ? (
                    <div className="px-4 py-8 text-center text-[13px] text-[#DC2626]">
                      레포지토리를 불러올 수 없습니다
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[13px] text-[#B4B4B0]">
                      {repoSearch ? "검색 결과가 없습니다" : "레포지토리가 없습니다"}
                    </div>
                  ) : (
                    filteredRepos.map((repo) => (
                      <button
                        key={repo.fullName}
                        onClick={() => setSelectedRepo({ owner: repo.owner, name: repo.name })}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-[#EEEEEC]"
                      >
                        {repo.isPrivate && (
                          <Lock className="h-3 w-3 flex-shrink-0 text-[#B4B4B0]" />
                        )}
                        <span className="truncate text-[#787774]">
                          <span className="text-[#B4B4B0]">{repo.owner}/</span>
                          <span className="font-medium text-[#1A1A1A]">{repo.name}</span>
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
