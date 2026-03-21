"use client";

import { create } from "zustand";
import type { Project } from "@figma-code-bridge/shared";

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  projects: [],
  isLoading: false,

  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  setLoading: (isLoading) => set({ isLoading }),
}));
