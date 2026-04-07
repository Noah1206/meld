"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DesignSystem, ThemeMode } from "@/lib/design-system/types";
import {
  DEFAULT_TYPOGRAPHY,
  DEFAULT_SPACING,
  DEFAULT_RADIUS,
} from "@/lib/design-system/types";
import { generatePalette } from "@/lib/design-system/palette";
import { generateDesignMd } from "@/lib/design-system/generate-md";

interface DesignSystemStore {
  // Currently active design system
  current: DesignSystem | null;
  // Saved design system list
  systems: DesignSystem[];
  // Panel open state
  panelOpen: boolean;

  // Actions
  createSystem: (name: string, seedColor?: string, secondaryColor?: string, tertiaryColor?: string) => DesignSystem;
  updateMode: (mode: ThemeMode) => void;
  updateSeedColor: (hex: string) => void;
  updateSecondaryColor: (hex: string) => void;
  updateTertiaryColor: (hex: string) => void;
  updateTypography: (updates: Partial<DesignSystem["typography"]>) => void;
  updateCustomMd: (md: string) => void;
  selectSystem: (id: string) => void;
  deleteSystem: (id: string) => void;
  setPanelOpen: (open: boolean) => void;
  getDesignMd: () => string;
}

function createDefaultSystem(
  name: string,
  seedColor = "#2E86C1",
  secondaryColor = "#6B7280",
  tertiaryColor = "#8B5CF6",
): DesignSystem {
  return {
    id: crypto.randomUUID(),
    name,
    mode: "light",
    colors: {
      seedColor,
      secondarySeed: secondaryColor,
      tertiarySeed: tertiaryColor,
      primary: generatePalette(seedColor),
      secondary: generatePalette(secondaryColor),
      tertiary: generatePalette(tertiaryColor),
    },
    typography: { ...DEFAULT_TYPOGRAPHY },
    spacing: { ...DEFAULT_SPACING },
    radius: { ...DEFAULT_RADIUS },
    customDesignMd: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const useDesignSystemStore = create<DesignSystemStore>()(
  persist(
    (set, get) => ({
      current: null,
      systems: [],
      panelOpen: false,

      createSystem: (name, seedColor, secondaryColor, tertiaryColor) => {
        const ds = createDefaultSystem(name, seedColor, secondaryColor, tertiaryColor);
        set((s) => ({
          current: ds,
          systems: [...s.systems, ds],
        }));
        return ds;
      },

      updateMode: (mode) =>
        set((s) => {
          if (!s.current) return s;
          const updated = { ...s.current, mode, updatedAt: new Date().toISOString() };
          return {
            current: updated,
            systems: s.systems.map((sys) => (sys.id === updated.id ? updated : sys)),
          };
        }),

      updateSeedColor: (hex) =>
        set((s) => {
          if (!s.current) return s;
          const updated = {
            ...s.current,
            colors: {
              ...s.current.colors,
              seedColor: hex,
              primary: generatePalette(hex),
            },
            updatedAt: new Date().toISOString(),
          };
          return {
            current: updated,
            systems: s.systems.map((sys) => (sys.id === updated.id ? updated : sys)),
          };
        }),

      updateSecondaryColor: (hex) =>
        set((s) => {
          if (!s.current) return s;
          const updated = {
            ...s.current,
            colors: {
              ...s.current.colors,
              secondarySeed: hex,
              secondary: generatePalette(hex),
            },
            updatedAt: new Date().toISOString(),
          };
          return {
            current: updated,
            systems: s.systems.map((sys) => (sys.id === updated.id ? updated : sys)),
          };
        }),

      updateTertiaryColor: (hex) =>
        set((s) => {
          if (!s.current) return s;
          const updated = {
            ...s.current,
            colors: {
              ...s.current.colors,
              tertiarySeed: hex,
              tertiary: generatePalette(hex),
            },
            updatedAt: new Date().toISOString(),
          };
          return {
            current: updated,
            systems: s.systems.map((sys) => (sys.id === updated.id ? updated : sys)),
          };
        }),

      updateTypography: (updates) =>
        set((s) => {
          if (!s.current) return s;
          const updated = {
            ...s.current,
            typography: { ...s.current.typography, ...updates },
            updatedAt: new Date().toISOString(),
          };
          return {
            current: updated,
            systems: s.systems.map((sys) => (sys.id === updated.id ? updated : sys)),
          };
        }),

      updateCustomMd: (md) =>
        set((s) => {
          if (!s.current) return s;
          const updated = { ...s.current, customDesignMd: md, updatedAt: new Date().toISOString() };
          return {
            current: updated,
            systems: s.systems.map((sys) => (sys.id === updated.id ? updated : sys)),
          };
        }),

      selectSystem: (id) =>
        set((s) => ({
          current: s.systems.find((sys) => sys.id === id) ?? s.current,
        })),

      deleteSystem: (id) =>
        set((s) => ({
          systems: s.systems.filter((sys) => sys.id !== id),
          current: s.current?.id === id ? null : s.current,
        })),

      setPanelOpen: (panelOpen) => set({ panelOpen }),

      getDesignMd: () => {
        const { current } = get();
        // Use pinned design system if available
        if (!current) {
          if (typeof window !== "undefined") {
            const pinned = localStorage.getItem("meld-active-design-md");
            if (pinned) return pinned;
          }
          return "";
        }
        return generateDesignMd(current);
      },
    }),
    {
      name: "fcb-design-system",
      partialize: (state) => ({
        current: state.current,
        systems: state.systems,
      }),
    },
  ),
);
