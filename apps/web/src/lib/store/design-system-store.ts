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
  // 현재 활성 디자인 시스템
  current: DesignSystem | null;
  // 저장된 디자인 시스템 목록
  systems: DesignSystem[];
  // 패널 열림 여부
  panelOpen: boolean;

  // Actions
  createSystem: (name: string, seedColor?: string) => DesignSystem;
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

function createDefaultSystem(name: string, seedColor = "#2E86C1"): DesignSystem {
  return {
    id: crypto.randomUUID(),
    name,
    mode: "light",
    colors: {
      seedColor,
      primary: generatePalette(seedColor),
      secondary: generatePalette("#6B7280"),
      tertiary: generatePalette("#8B5CF6"),
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

      createSystem: (name, seedColor) => {
        const ds = createDefaultSystem(name, seedColor);
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
        if (!current) return "";
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
