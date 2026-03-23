"use client";

import { useSyncExternalStore } from "react";

function getSnapshot(): "web" | "desktop" {
  if (typeof window === "undefined") return "web";
  return window.electronAgent?.isElectron ? "desktop" : "web";
}

function getServerSnapshot(): "web" | "desktop" {
  return "web";
}

function subscribe(callback: () => void) {
  // 플랫폼은 변하지 않으므로 구독 불필요
  return () => {};
}

/** 현재 실행 환경 감지: 'web' (브라우저) | 'desktop' (Electron) */
export function usePlatform(): "web" | "desktop" {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** SSR-safe 직접 체크 (훅 외부용) */
export function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.electronAgent?.isElectron;
}
