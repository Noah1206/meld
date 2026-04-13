"use client";

import { useState, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem("meld-theme") as Theme | null;
  return saved === "light" ? "light" : "dark";
}

function subscribeMount(callback: () => void) {
  const timer = setTimeout(callback, 0);
  return () => clearTimeout(timer);
}
function getMountedClient() {
  return true;
}
function getMountedServer() {
  return false;
}

/**
 * Shared "meld-theme" preference hook.
 *
 * Uses a lazy initializer to read localStorage once (no setState-in-effect)
 * and `useSyncExternalStore` to expose a hydration-safe `mounted` flag.
 * Previously this was duplicated across 8+ page files.
 */
export function useThemePref() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const mounted = useSyncExternalStore(subscribeMount, getMountedClient, getMountedServer);

  const toggle = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        window.localStorage.setItem("meld-theme", next);
      }
      return next;
    });
  };

  return { theme, toggle, isDark: theme === "dark", mounted };
}
