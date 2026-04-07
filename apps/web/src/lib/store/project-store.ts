"use client";

import { create } from "zustand";
import type { Project } from "@figma-code-bridge/shared";

// ─── Source connection types ──────────────────────────
export interface FigmaSource {
  fileKey: string;
  fileName: string;
  connected: boolean;
}

export interface LocalSource {
  type: "electron" | "agent" | "sandbox";
  connected: boolean;
  projectPath?: string;
}

export interface GitHubSource {
  owner: string;
  repo: string;
  branch: string;
  connected: boolean;
}

// ─── Unified project ─────────────────────────────────
export interface UnifiedProject {
  id: string;
  name: string;
  figma: FigmaSource | null;
  local: LocalSource | null;
  github: GitHubSource | null;
  designSystemId: string | null;
  createdAt: string;
}

interface ProjectState {
  // Legacy
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setLoading: (loading: boolean) => void;

  // Unified workspace
  workspace: UnifiedProject | null;

  createWorkspace: (name: string) => UnifiedProject;
  loadWorkspace: (project: UnifiedProject) => void;
  closeWorkspace: () => void;
  setWorkspaceName: (name: string) => void;

  // Source connections
  connectFigma: (fileKey: string, fileName: string) => void;
  disconnectFigma: () => void;

  connectLocal: (type: LocalSource["type"], projectPath?: string) => void;
  setLocalConnected: (connected: boolean) => void;
  disconnectLocal: () => void;

  connectGitHub: (owner: string, repo: string, branch?: string) => void;
  disconnectGitHub: () => void;

  setDesignSystem: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // Legacy
  currentProject: null,
  projects: [],
  isLoading: false,
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  setLoading: (isLoading) => set({ isLoading }),

  // Unified workspace
  workspace: null,

  createWorkspace: (name) => {
    const ws: UnifiedProject = {
      id: crypto.randomUUID(),
      name,
      figma: null,
      local: null,
      github: null,
      designSystemId: null,
      createdAt: new Date().toISOString(),
    };
    set({ workspace: ws });
    return ws;
  },

  loadWorkspace: (workspace) => set({ workspace }),
  closeWorkspace: () => set({ workspace: null }),
  setWorkspaceName: (name) =>
    set((s) => s.workspace ? { workspace: { ...s.workspace, name } } : s),

  connectFigma: (fileKey, fileName) =>
    set((s) => s.workspace ? { workspace: { ...s.workspace, figma: { fileKey, fileName, connected: true } } } : s),
  disconnectFigma: () =>
    set((s) => s.workspace ? { workspace: { ...s.workspace, figma: null } } : s),

  connectLocal: (type, projectPath) =>
    set((s) => s.workspace ? { workspace: { ...s.workspace, local: { type, connected: false, projectPath } } } : s),
  setLocalConnected: (connected) =>
    set((s) => s.workspace?.local ? { workspace: { ...s.workspace, local: { ...s.workspace.local, connected } } } : s),
  disconnectLocal: () =>
    set((s) => s.workspace ? { workspace: { ...s.workspace, local: null } } : s),

  connectGitHub: (owner, repo, branch = "main") =>
    set((s) => s.workspace ? { workspace: { ...s.workspace, github: { owner, repo, branch, connected: true } } } : s),
  disconnectGitHub: () =>
    set((s) => s.workspace ? { workspace: { ...s.workspace, github: null } } : s),

  setDesignSystem: (designSystemId) =>
    set((s) => s.workspace ? { workspace: { ...s.workspace, designSystemId } } : s),
}));
