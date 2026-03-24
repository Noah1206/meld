"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Lang = "en" | "ko";

interface LangStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const useLangStore = create<LangStore>()(
  persist(
    (set) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((s) => ({ lang: s.lang === "en" ? "ko" : "en" })),
    }),
    { name: "fcb-lang" },
  ),
);
