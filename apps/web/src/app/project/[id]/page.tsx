"use client";

import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Sidebar } from "@/components/layout/Sidebar";
import { FigmaCanvas } from "@/components/figma-viewer/FigmaCanvas";
import { FigmaUrlInput } from "@/components/figma-viewer/FigmaUrlInput";
import { FrameSelector } from "@/components/figma-viewer/FrameSelector";
import { NodeTree } from "@/components/figma-viewer/NodeTree";
import { NodeProperties } from "@/components/figma-viewer/NodeProperties";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { DiffViewer } from "@/components/diff-viewer/DiffViewer";
import { CommitDialog } from "@/components/git-panel/CommitDialog";
import { useFigmaStore } from "@/lib/store/figma-store";
import { useParams } from "next/navigation";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { frames } = useFigmaStore();
  const hasFrames = frames.length > 0;

  return (
    <WorkspaceLayout
      leftPanel={
        <Sidebar title="Node Tree">
          <NodeTree />
        </Sidebar>
      }
      mainContent={
        <div className="flex h-full flex-col">
          {/* Figma URL 입력 */}
          <FigmaUrlInput />

          {/* 프레임 탭 */}
          {hasFrames && <FrameSelector />}

          {/* 캔버스 */}
          <div className="flex-1">
            {hasFrames ? (
              <FigmaCanvas />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-[#1C1C1C]">
                    Figma Viewer
                  </p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    위에 Figma URL을 입력하여 디자인을 불러오세요
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      }
      rightPanel={
        <div className="flex h-full flex-col">
          {/* 속성 패널 */}
          <Sidebar title="Properties">
            <NodeProperties />
          </Sidebar>

          {/* Diff 뷰어 */}
          <div className="border-t border-[#E5E7EB]">
            <Sidebar title="Code Diff">
              <DiffViewer />
            </Sidebar>
          </div>

          {/* Git 커밋 */}
          <div className="border-t border-[#E5E7EB]">
            <CommitDialog
              projectId={projectId}
              githubOwner=""
              githubRepo=""
              githubBranch="main"
            />
          </div>
        </div>
      }
      bottomBar={
        <div>
          <ChatMessages />
          <ChatInput projectId={projectId} />
        </div>
      }
    />
  );
}
