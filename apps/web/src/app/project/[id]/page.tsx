"use client";

import { RefreshCw } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { FigmaPanel } from "@/components/workspace/FigmaPanel";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { useFigmaAutoLoad } from "@/lib/hooks/useFigmaAutoLoad";
import { trpc } from "@/lib/trpc/client";
import { useParams, useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data } = trpc.project.get.useQuery({ id: projectId });
  const project = data as ProjectRow | null | undefined;

  const { sync, isLoading: isSyncing } = useFigmaAutoLoad(project?.figma_file_key);

  return (
    <WorkspaceLayout
      projectName={project?.name}
      onBack={() => router.push("/dashboard")}
      headerActions={
        project?.figma_file_key ? (
          <button
            onClick={sync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-lg bg-[#F7F7F5] px-3 py-1.5 text-[12px] font-medium text-[#787774] transition-all hover:bg-[#EEEEEC] active:scale-[0.98] disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            동기화
          </button>
        ) : undefined
      }
      leftPanel={<FigmaPanel />}
      rightPanel={
        <ChatPanel
          projectId={projectId}
          githubOwner={project?.github_owner ?? ""}
          githubRepo={project?.github_repo ?? ""}
        />
      }
    />
  );
}
