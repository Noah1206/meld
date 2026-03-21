"use client";

import { useState } from "react";
import { useChatStore } from "@/lib/store/chat-store";
import { trpc } from "@/lib/trpc/client";

interface CommitDialogProps {
  projectId: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
}

export function CommitDialog({
  projectId,
  githubOwner,
  githubRepo,
  githubBranch,
}: CommitDialogProps) {
  const { messages } = useChatStore();
  const [commitMsg, setCommitMsg] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const commitMutation = trpc.git.commitAndPush.useMutation();

  // 마지막 코드 편집 결과
  const lastEdit = [...messages]
    .reverse()
    .find((m) => m.codeEdit?.filePath)?.codeEdit;

  if (!lastEdit || !lastEdit.filePath || !lastEdit.modified) {
    return (
      <div className="p-3 text-sm text-[#6B7280]">
        코드를 수정한 후 여기서 커밋할 수 있습니다.
      </div>
    );
  }

  const handlePush = async () => {
    if (!commitMsg.trim()) return;
    setIsPushing(true);
    setResult(null);

    try {
      const res = await commitMutation.mutateAsync({
        projectId,
        owner: githubOwner,
        repo: githubRepo,
        branch: githubBranch,
        filePath: lastEdit.filePath,
        content: lastEdit.modified,
        commitMessage: commitMsg,
        originalContent: lastEdit.original,
        aiExplanation: lastEdit.explanation,
      });

      setResult(`Pushed! SHA: ${res.commitSha.slice(0, 7)}`);
      setCommitMsg("");
    } catch (err) {
      setResult(`에러: ${err instanceof Error ? err.message : "푸시 실패"}`);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="space-y-3 p-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          Commit & Push
        </h3>
        <p className="mt-1 text-xs text-[#9CA3AF] font-mono truncate">
          {lastEdit.filePath}
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="커밋 메시지..."
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePush()}
          className="flex-1 rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs placeholder:text-[#9CA3AF] focus:border-[#2E86C1] focus:outline-none"
          disabled={isPushing}
        />
        <button
          onClick={handlePush}
          disabled={isPushing || !commitMsg.trim()}
          className="rounded-md bg-[#059669] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#047857] disabled:opacity-50"
        >
          {isPushing ? "..." : "Push"}
        </button>
      </div>

      {result && (
        <p
          className={`text-xs ${result.startsWith("에러") ? "text-red-500" : "text-green-600"}`}
        >
          {result}
        </p>
      )}
    </div>
  );
}
