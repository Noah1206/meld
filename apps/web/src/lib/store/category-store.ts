"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ProjectCategory = "website" | "app" | "service" | "tool" | null;

// Category labels (persona prompts are defined server-side in ai-handler.ts and agent-loop.ts)
export const CATEGORY_LABELS: Record<string, string> = {
  website: "Website — Landing pages, blogs, portfolios",
  app: "App — Dashboards, SaaS, web applications",
  service: "Service — APIs, backends, microservices",
  tool: "Tool — CLI tools, automation, scripts",
};

interface CategoryState {
  currentCategory: ProjectCategory;
  setCategory: (category: ProjectCategory) => void;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set) => ({
      currentCategory: null,
      setCategory: (category) => set({ currentCategory: category }),
    }),
    {
      name: "meld-project-category",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
